import { colors } from '@/constants/Colors';

// On wide screens, show the phone layout as a centred column on a paper ground.
const css = `
html, body { background-color: ${colors.paper2}; }
#root { max-width: 480px; margin: 0 auto; background-color: ${colors.paper}; }
@media (min-width: 520px) { #root { box-shadow: 0 0 0 1px ${colors.rule}; } }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}
