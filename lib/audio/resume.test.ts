jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  clearPosition,
  getResumePosition,
  positionsReady,
  savePosition,
} from './resume';

const DUR = 300;

describe('resume positions', () => {
  beforeEach(async () => {
    await positionsReady;
    clearPosition('pp_1');
    clearPosition('pp_2');
  });

  it('returns 0 for an unknown perspective', () => {
    expect(getResumePosition('pp_1', DUR)).toBe(0);
  });

  it('round-trips a resumable position (rounded to seconds)', () => {
    savePosition('pp_1', 123.7, DUR);
    expect(getResumePosition('pp_1', DUR)).toBe(124);
  });

  it('ignores the first few seconds', () => {
    savePosition('pp_1', 3, DUR);
    expect(getResumePosition('pp_1', DUR)).toBe(0);
  });

  it('treats a near-the-end position as finished and starts fresh', () => {
    savePosition('pp_1', DUR - 2, DUR);
    expect(getResumePosition('pp_1', DUR)).toBe(0);
  });

  it('drops the entry when progress crosses into finished', () => {
    savePosition('pp_1', 150, DUR);
    expect(getResumePosition('pp_1', DUR)).toBe(150);
    savePosition('pp_1', DUR - 1, DUR); // now finished → entry removed
    expect(getResumePosition('pp_1', DUR)).toBe(0);
  });

  it('clearPosition removes a saved position', () => {
    savePosition('pp_2', 90, DUR);
    expect(getResumePosition('pp_2', DUR)).toBe(90);
    clearPosition('pp_2');
    expect(getResumePosition('pp_2', DUR)).toBe(0);
  });
});
