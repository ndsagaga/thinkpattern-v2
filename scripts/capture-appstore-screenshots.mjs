// Rasterize the App Store marketing frames from the design system into
// upload-ready PNGs. The frames live in the design source of truth:
//
//   design/ThinkPattern/ThinkPattern App Store.dc.html
//
// Each frame is a `[data-shot]` node sized to an exact App Store Connect
// pixel spec. The `.dc.html` runtime (design/ThinkPattern/support.js)
// mounts the live TP.* component library into each node — the same code
// the app ships — so these screenshots never drift from the design.
//
// ── HOW IT WORKS ────────────────────────────────────────────────────
//
// The runtime renders in a browser: it pulls React + Babel from unpkg,
// Fraunces / Inter Tight / JetBrains Mono from Google Fonts, then Babel-
// transforms lib/thinkpattern.jsx and mounts every <x-import>. There is
// no static HTML to scrape — we must render it. So this script drives the
// installed Google Chrome over the DevTools Protocol (CDP) and clips a
// screenshot to each frame's exact border-box (the box-shadow lives
// outside the box, so it is excluded and dimensions land on-spec).
//
// Chrome always encodes screenshots as RGBA PNG (color type 6). App Store
// Connect rejects any image carrying an alpha channel — even a fully
// opaque one — so each capture is transcoded losslessly to opaque RGB
// (color type 2) before it is written. The frames are opaque to begin
// with; only the channel is dropped, no compositing.
//
// It talks CDP over Node's built-in WebSocket (Node >= 22) and transcodes
// with the built-in zlib — no puppeteer, no playwright, no npm install.
// Network access is required (unpkg + Google Fonts); the script fails
// loudly with diagnostics if a frame does not finish mounting.
//
// ── USAGE ───────────────────────────────────────────────────────────
//
//   npm run appstore-screenshots
//   node scripts/capture-appstore-screenshots.mjs [--out <dir>] [--html <file>]
//                                                 [--only 1,3,ipad-2] [--chrome <path>]
//
// Output (default): design/ThinkPattern/uploads/appstore/
//   iphone/  ipad/                          → App Store Connect
//   android/{phone,tablet-7,tablet-10}/     → Google Play screenshots
//   android/feature/                        → Google Play feature graphic
// design/ is gitignored, so the derived PNGs stay out of version control.

import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Acceptance specs ─────────────────────────────────────────────────
// iOS device classes validate against App Store Connect's fixed pixel
// lists — a frame's rendered size must be exactly one of these or the
// upload is rejected. Google Play validates by rule instead (below).
const IOS_SPECS = {
  iphone: ['1242x2688', '2688x1242', '1284x2778', '2778x1284'],
  ipad: ['2064x2752', '2752x2064', '2048x2732', '2732x2048'],
};

// Google Play phone & tablet screenshots: PNG/JPEG, each side 320–3840 px,
// longer side no more than twice the shorter side (2:1 max aspect ratio).
const PLAY_SHOT_SPEC = 'a Play screenshot (each side 320–3840 px, aspect ≤ 2:1)';
function playShotOk(w, h) {
  const lo = Math.min(w, h);
  const hi = Math.max(w, h);
  return lo >= 320 && hi <= 3840 && hi <= lo * 2;
}

// Map a frame's [data-shot] id to its store bucket (an output sub-path) and
// an acceptance test + human-readable spec for the diagnostics. Buckets:
// iOS → iphone/, ipad/;  Android → android/{phone,tablet-7,tablet-10,feature}/.
function classify(id) {
  const lid = id.toLowerCase();
  if (lid === 'feature') {
    return {
      bucket: 'android/feature',
      validate: (w, h) => w === 1024 && h === 500,
      spec: 'exactly 1024x500 (Play feature graphic)',
    };
  }
  if (lid.startsWith('ipad')) {
    return {
      bucket: 'ipad',
      validate: (w, h) => IOS_SPECS.ipad.includes(`${w}x${h}`),
      spec: `an accepted App Store iPad size: ${IOS_SPECS.ipad.join(', ')}`,
    };
  }
  if (lid.startsWith('a-tab-')) {
    return { bucket: `android/tablet-${lid.slice('a-tab-'.length)}`, validate: playShotOk, spec: PLAY_SHOT_SPEC };
  }
  if (lid.startsWith('a-')) {
    return { bucket: 'android/phone', validate: playShotOk, spec: PLAY_SHOT_SPEC };
  }
  return {
    bucket: 'iphone',
    validate: (w, h) => IOS_SPECS.iphone.includes(`${w}x${h}`),
    spec: `an accepted App Store iPhone size: ${IOS_SPECS.iphone.join(', ')}`,
  };
}

const READY_TIMEOUT_MS = 60_000; // network + Babel transform can be slow
const POLL_INTERVAL_MS = 300;

// ── CLI ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    html: join(ROOT, 'design', 'ThinkPattern', 'ThinkPattern App Store.dc.html'),
    outDir: join(ROOT, 'design', 'ThinkPattern', 'uploads', 'appstore'),
    only: null,
    chrome: process.env.CHROME_PATH || null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--html') out.html = resolve(argv[++i]);
    else if (a === '--out') out.outDir = resolve(argv[++i]);
    else if (a === '--chrome') out.chrome = resolve(argv[++i]);
    else if (a === '--only') out.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

// ── Locate a Chrome/Chromium binary ──────────────────────────────────
function findChrome(override) {
  const candidates = [
    override,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const p = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (p && existsSync(p)) return p;
    } catch { /* not on PATH */ }
  }
  throw new Error(
    'Could not find Google Chrome. Install it, or pass --chrome <path> / set CHROME_PATH.',
  );
}

// ── Launch headless Chrome, return { proc, wsUrl, userDataDir } ───────
async function launchChrome(chromePath) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'tp-appstore-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0', // let Chrome pick a free port
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--hide-scrollbars',
    '--force-device-scale-factor=1', // 1 CSS px == 1 device px == 1 PNG px
    '--allow-file-access-from-files', // support.js fetches sibling lib/*.jsx
    '--window-size=1600,1200',
    'about:blank',
  ];
  const proc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'ignore'] });
  proc.on('error', (e) => { throw e; });

  // Chrome writes the chosen port to DevToolsActivePort once it is ready.
  const portFile = join(userDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15_000;
  let port = null;
  while (Date.now() < deadline) {
    if (existsSync(portFile)) {
      const line = readFileSync(portFile, 'utf8').split('\n')[0].trim();
      if (line) { port = line; break; }
    }
    await sleep(100);
  }
  if (!port) throw new Error('Chrome did not report a DevTools port in time.');

  const res = await fetch(`http://127.0.0.1:${port}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  return { proc, wsUrl: webSocketDebuggerUrl, userDataDir };
}

// ── Minimal CDP client over the native WebSocket ──────────────────────
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      } else {
        for (const l of [...this.listeners]) l(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify(payload));
    });
  }

  once(method, sessionId) {
    return new Promise((res) => {
      const l = (msg) => {
        if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) {
          this.listeners.delete(l);
          res(msg.params);
        }
      };
      this.listeners.add(l);
    });
  }

  static connect(wsUrl) {
    return new Promise((res, rej) => {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener('open', () => res(new CDP(ws)), { once: true });
      ws.addEventListener('error', (e) => rej(new Error(`CDP socket error: ${e.message || e}`)), { once: true });
    });
  }
}

// Evaluate an expression in the page and return its value by copy.
async function evaluate(cdp, sessionId, expression) {
  const { result, exceptionDetails } = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (exceptionDetails) {
    throw new Error(`Page evaluation failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ''}`);
  }
  return result.value;
}

// ── Readiness probe: every [data-shot] mounted, fonts loaded ──────────
// hasImport === true means the runtime has not replaced <x-import> yet.
const READINESS_EXPR = `(() => {
  const shots = [...document.querySelectorAll('[data-shot]')];
  const details = shots.map((s) => {
    const hasImport = s.querySelector('x-import') != null;
    const imgs = [...s.querySelectorAll('img')];
    return {
      id: s.getAttribute('data-shot'),
      hasImport,
      imgs: imgs.length,
      imgsLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
      textLen: (s.textContent || '').trim().length,
    };
  });
  const rendered = details.filter((d) => !d.hasImport && d.textLen > 40 && d.imgsLoaded);
  return {
    hasTP: typeof window.TP !== 'undefined',
    total: shots.length,
    rendered: rendered.length,
    fontsReady: !!(document.fonts && document.fonts.status === 'loaded'),
    fraunces: !!(document.fonts && document.fonts.check('600 88px "Fraunces"')),
    inter: !!(document.fonts && document.fonts.check('400 30px "Inter Tight"')),
    details,
  };
})()`;

async function waitForRender(cdp, sessionId) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let stable = 0;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(cdp, sessionId, READINESS_EXPR);
    const ok = last.total > 0
      && last.rendered === last.total
      && last.fontsReady && last.fraunces && last.inter;
    if (ok) {
      stable += 1;
      if (stable >= 2) return last; // two consecutive clean polls
    } else {
      stable = 0;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  const pending = (last?.details ?? []).filter((d) => d.hasImport || !d.imgsLoaded).map((d) => d.id);
  throw new Error(
    `Frames did not finish rendering within ${READY_TIMEOUT_MS / 1000}s. `
    + `Last state: ${JSON.stringify(last)}. Unfinished: ${pending.join(', ') || 'none'}. `
    + '(Check network access to unpkg.com and fonts.googleapis.com.)',
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// PNG IHDR lives right after the 8-byte signature + 4-byte length +
// 4-byte "IHDR": width(4) height(4) bitDepth(1) colorType(1)…  Color
// types 4 (gray+alpha) and 6 (RGBA) carry an alpha channel.
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function pngInfo(buf) {
  if (buf.length < 26 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  const colorType = buf[25];
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType,
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

// Losslessly re-encode an 8-bit RGBA PNG as opaque RGB (drops the alpha
// channel App Store Connect forbids). Ancillary chunks are dropped, which
// also strips any metadata. Pass-through if the PNG already has no alpha.
function stripAlpha(input) {
  const info = pngInfo(input);
  if (!info) throw new Error('Capture is not a valid PNG.');
  if (!info.hasAlpha) return input;
  if (info.colorType !== 6 || input[24] !== 8) {
    throw new Error(`Unsupported PNG for alpha strip: colorType=${info.colorType} bitDepth=${input[24]}`);
  }
  if (input[28] !== 0) throw new Error('Interlaced PNGs are not supported.');

  const { width, height } = info;
  const idat = [];
  for (let off = 8; off < input.length;) {
    const len = input.readUInt32BE(off);
    const type = input.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(input.subarray(off + 8, off + 8 + len));
    off += 12 + len;
    if (type === 'IEND') break;
  }

  // Reverse the per-scanline PNG filters to recover raw RGBA pixels.
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const recon = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos++];
      const a = x >= bpp ? recon[row + x - bpp] : 0;
      const b = y > 0 ? recon[row - stride + x] : 0;
      const c = y > 0 && x >= bpp ? recon[row - stride + x - bpp] : 0;
      let val;
      switch (filter) {
        case 0: val = cur; break;
        case 1: val = cur + a; break;
        case 2: val = cur + b; break;
        case 3: val = cur + ((a + b) >> 1); break;
        case 4: val = cur + paeth(a, b, c); break;
        default: throw new Error(`Unknown PNG filter type ${filter}`);
      }
      recon[row + x] = val & 0xff;
    }
  }

  // Repack as RGB with filter 0 (None) on every scanline.
  const out = Buffer.alloc(height * (width * 3 + 1));
  let op = 0;
  for (let y = 0; y < height; y++) {
    out[op++] = 0;
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const p = row + x * bpp;
      out[op++] = recon[p];
      out[op++] = recon[p + 1];
      out[op++] = recon[p + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = truecolor RGB, no alpha
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(out, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Discover every frame: id, device class, a filename slug, expected size.
const DISCOVER_EXPR = `(() => {
  return [...document.querySelectorAll('[data-shot]')].map((el) => {
    const id = el.getAttribute('data-shot');
    const label = el.parentElement?.querySelector('[data-drags-parent]')?.textContent?.trim() || id;
    return { id, label };
  });
})()`;

async function captureFrame(cdp, sessionId, id) {
  // Force paint of off-screen frames, then measure in page coordinates.
  await evaluate(
    cdp,
    sessionId,
    `(() => { const el = document.querySelector('[data-shot="${id}"]');
      if (el) el.scrollIntoView({ block: 'start', inline: 'start' }); })()`,
  );
  await sleep(120);
  // Some frames embed a live scroll view (e.g. the tablet actor pane) whose
  // top is a portrait we can't ship. `data-scroll-detail="<px>"` on the frame
  // scrolls that pane's tallest `.tp-scroll` down by that many CSS px — native
  // scroll, so the surrounding rail / status bar / header stay put. Ancestor
  // CSS transforms (the device-scale wrapper) don't affect scrollTop.
  await evaluate(
    cdp,
    sessionId,
    `(() => { const el = document.querySelector('[data-shot="${id}"]');
      if (!el) return; const n = parseFloat(el.getAttribute('data-scroll-detail'));
      if (!Number.isFinite(n)) return;
      let target = null, max = -1;
      for (const s of el.querySelectorAll('.tp-scroll')) {
        if (s.scrollHeight > max) { max = s.scrollHeight; target = s; }
      }
      if (target) target.scrollTop = n; })()`,
  );
  await sleep(120);
  const rect = await evaluate(
    cdp,
    sessionId,
    `(() => { const el = document.querySelector('[data-shot="${id}"]');
      if (!el) return null; const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`,
  );
  if (!rect) throw new Error(`Frame [data-shot="${id}"] not found in page.`);
  const clip = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.w),
    height: Math.round(rect.h),
    scale: 1,
  };
  const { data } = await cdp.send(
    'Page.captureScreenshot',
    { format: 'png', clip, captureBeyondViewport: true, fromSurface: true },
    sessionId,
  );
  return { buffer: Buffer.from(data, 'base64'), expected: `${clip.width}x${clip.height}` };
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(opts.html)) throw new Error(`Design source not found: ${opts.html}`);

  const chromePath = findChrome(opts.chrome);
  console.log(`Chrome:  ${chromePath}`);
  console.log(`Source:  ${opts.html}`);
  console.log(`Output:  ${opts.outDir}\n`);

  const { proc, wsUrl, userDataDir } = await launchChrome(chromePath);
  let cdp;
  try {
    cdp = await CDP.connect(wsUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    const url = pathToFileURL(opts.html).href;
    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await cdp.send('Page.navigate', { url }, sessionId);
    await Promise.race([loaded, sleep(READY_TIMEOUT_MS)]);

    process.stdout.write('Rendering (React + Babel + fonts over network)… ');
    await waitForRender(cdp, sessionId);
    console.log('done.\n');

    let frames = await evaluate(cdp, sessionId, DISCOVER_EXPR);
    if (opts.only) frames = frames.filter((f) => opts.only.includes(f.id));
    if (!frames.length) throw new Error('No frames matched. Check --only ids against [data-shot] values.');

    const results = [];
    for (const { id, label } of frames) {
      const { bucket, validate, spec } = classify(id);
      // strip a redundant leading device word from the slug — it already
      // lives in the bucket dir (ipad/ or android/tablet-*).
      const slug = slugify(label).replace(/^(ipad|android)-?/, '') || `shot-${slugify(id)}`;
      const dir = join(opts.outDir, ...bucket.split('/'));
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `${slug}.png`);

      const { buffer, expected } = await captureFrame(cdp, sessionId, id);
      const png = stripAlpha(buffer);
      writeFileSync(file, png);

      const info = pngInfo(png);
      const dims = info ? `${info.width}x${info.height}` : 'unknown';
      const specOk = info ? validate(info.width, info.height) : false;
      const matchesFrame = dims === expected;
      const opaque = info ? !info.hasAlpha : false;
      results.push({ id, bucket, file, dims, specOk, matchesFrame, opaque, bytes: png.length });

      const flag = specOk && matchesFrame && opaque ? '✓' : '⚠';
      console.log(`${flag} ${bucket.padEnd(16)} ${dims.padEnd(10)} ${opaque ? 'RGB ' : 'RGBA'} ${(png.length / 1024).toFixed(0).padStart(5)} KB  ${file.replace(ROOT + '/', '')}`);
      if (!specOk) console.log(`    ⚠ ${dims} is not ${spec}`);
      if (!matchesFrame) console.log(`    ⚠ captured ${dims} but frame border-box is ${expected}`);
      if (!opaque) console.log('    ⚠ still carries an alpha channel — the store will reject it');
    }

    const bad = results.filter((r) => !r.specOk || !r.matchesFrame || !r.opaque);
    console.log(`\n${results.length} screenshot(s) written to ${opts.outDir.replace(ROOT + '/', '')}`);
    if (bad.length) {
      console.log(`${bad.length} need attention (see ⚠ above).`);
      process.exitCode = 1;
    } else {
      console.log('All frames match their store specs (on-spec size, opaque RGB). Ready to upload.');
    }
  } finally {
    try { await cdp?.send('Browser.close'); } catch { /* ignore */ }
    try { proc.kill('SIGTERM'); } catch { /* ignore */ }
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
