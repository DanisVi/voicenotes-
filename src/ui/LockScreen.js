import { isVaultInitialized, createVault, verifyPasscode } from '../core/auth.js';

export class LockScreen {
  constructor(root, { onUnlock }) {
    this.root = root;
    this.onUnlock = onUnlock;
    this.el = null;
    this.buffer = '';
    this.mode = 'check';
  }

  async mount() {
    this.mode = (await isVaultInitialized()) ? 'unlock' : 'setup';
    this.el = document.createElement('div');
    this.el.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center text-white px-6';
    this.el.setAttribute('data-theme-lock', '1');
    this.el.style.background = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)';
    this.el.innerHTML = this.render();
    this.root.appendChild(this.el);
    this.bindEvents();
  }

  render() {
    const isSetup = this.mode === 'setup';
    const title = isSetup ? 'Создайте код' : 'VoiceNotes Pro';
    const subtitle = isSetup
      ? 'Он защитит ваши заметки'
      : 'Введите код-пароль';
    return `
      <div class="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h1 class="text-3xl font-bold mb-2">${title}</h1>
      <p class="text-white/50 text-sm mb-8 text-center">${subtitle}</p>
      <div id="dots" class="flex gap-3 mb-8"></div>
      <div id="pad" class="grid grid-cols-3 gap-4 max-w-xs w-full"></div>
      <div id="err" class="mt-6 text-red-400 text-sm text-center min-h-[20px]"></div>
    `;
  }

  bindEvents() {
    this.renderDots();
    this.renderPad();
  }

  renderDots() {
    const dots = this.el.querySelector('#dots');
    dots.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'w-4 h-4 rounded-full border-2 border-white transition-all';
      if (i < this.buffer.length) d.style.backgroundColor = '#fff';
      dots.appendChild(d);
    }
  }

  renderPad() {
    const pad = this.el.querySelector('#pad');
    pad.innerHTML = '';
    const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
    keys.forEach((k) => {
      const btn = document.createElement('button');
      if (k === '') { pad.appendChild(btn); return; }
      btn.textContent = k === 'del' ? '⌫' : k;
      btn.className = 'h-16 rounded-full text-2xl font-light text-white bg-white/10 active:bg-white/20 transition-colors';
      btn.addEventListener('click', () => this.onKey(k));
      pad.appendChild(btn);
    });
  }

  onKey(k) {
    if (k === 'del') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (this.buffer.length < 4) {
      this.buffer += k;
    }
    this.renderDots();
    if (this.buffer.length === 4) {
      setTimeout(() => this.submit(), 150);
    }
  }

  async submit() {
    const code = this.buffer;
    this.buffer = '';
    try {
      if (this.mode === 'setup') {
        const key = await createVault(code);
        this.showError('');
        this.onUnlock(key);
      } else {
        const key = await verifyPasscode(code);
        if (key) {
          this.showError('');
          this.onUnlock(key);
        } else {
          this.showError('Неверный код');
        }
      }
    } catch (e) {
      this.showError('Ошибка: ' + e.message);
    }
    this.renderDots();
  }

  showError(msg) {
    const err = this.el.querySelector('#err');
    err.textContent = msg;
    if (msg && navigator.vibrate) navigator.vibrate([80, 80, 80]);
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
  }
}
