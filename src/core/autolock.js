const LS_KEY = 'voicenotes_autolock';
const LS_TIMEOUT = 'voicenotes_autolock_timeout';
const DEFAULT_TIMEOUT_MS = 30_000;

export function isAutolockEnabled() {
  return localStorage.getItem(LS_KEY) !== 'off';
}

export function getAutolockTimeout() {
  const n = parseInt(localStorage.getItem(LS_TIMEOUT) || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function setAutolockEnabled(enabled) {
  localStorage.setItem(LS_KEY, enabled ? 'on' : 'off');
}

export function setAutolockTimeout(ms) {
  localStorage.setItem(LS_TIMEOUT, String(ms));
}

export function createAutolock({ onLock } = {}) {
  let hiddenAt = null;
  let timer = null;

  const check = () => {
    if (!isAutolockEnabled()) return;
    const t = getAutolockTimeout();
    if (document.visibilityState === 'hidden') {
      if (hiddenAt === null) hiddenAt = Date.now();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        hiddenAt = null;
        onLock && onLock();
      }, t);
      return;
    }
    if (document.visibilityState === 'visible' && hiddenAt !== null) {
      const delta = Date.now() - hiddenAt;
      hiddenAt = null;
      if (timer) { clearTimeout(timer); timer = null; }
      if (delta >= t) {
        onLock && onLock();
      }
    }
  };

  document.addEventListener('visibilitychange', check);
  window.addEventListener('blur', () => {
    if (document.visibilityState === 'hidden') check();
  });

  return {
    destroy() {
      document.removeEventListener('visibilitychange', check);
      if (timer) clearTimeout(timer);
    },
  };
}
