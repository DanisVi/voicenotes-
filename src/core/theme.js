// Этап 12 — тёмная тема. Режимы: auto | light | dark.
// Хранится в localStorage, применяется через data-theme на <html>.

const KEY = 'voicenotes_theme';
const MODES = ['auto', 'light', 'dark'];

function readMode() {
  try {
    const v = localStorage.getItem(KEY);
    if (MODES.includes(v)) return v;
  } catch (e) {}
  return 'auto';
}

function writeMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch (e) {}
}

function systemPrefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
}

export function getThemeMode() {
  return readMode();
}

export function isDarkActive() {
  const m = readMode();
  if (m === 'dark') return true;
  if (m === 'light') return false;
  return systemPrefersDark();
}

export function applyTheme() {
  const dark = isDarkActive();
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', dark ? '#000000' : '#007AFF');
  }
}

export function cycleTheme() {
  const current = readMode();
  const idx = MODES.indexOf(current);
  const next = MODES[(idx + 1) % MODES.length];
  writeMode(next);
  applyTheme();
  return next;
}

export function getThemeIcon() {
  const m = readMode();
  if (m === 'light') return '☀️';
  if (m === 'dark') return '🌙';
  return '🌗';
}

export function getThemeLabel() {
  const m = readMode();
  if (m === 'light') return 'Светлая';
  if (m === 'dark') return 'Тёмная';
  return 'Авто';
}

export function initTheme() {
  applyTheme();
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (readMode() === 'auto') applyTheme();
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  } catch (e) {}
}
