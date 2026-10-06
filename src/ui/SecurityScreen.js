import { clearVault } from '../core/storage.js';
import { clearAuth } from '../core/auth.js';

export class SecurityScreen {
  constructor(host, { vaultKey, onLock, root }) {
    this.host = host;
    this.vaultKey = vaultKey;
    this.onLock = onLock;
    this.root = root;
    this.el = null;
  }

  async mount() {
    this.el = document.createElement('div');
    this.el.className = 'min-h-dvh bg-[#F2F2F7] pb-32';
    this.el.innerHTML = this.render();
    this.host.appendChild(this.el);
    this.bindEvents();
  }

  render() {
    return `
      <header class="sticky top-0 z-20 bg-[#F2F2F7]/90 backdrop-blur border-b border-gray-200/60 px-4 pt-8 pb-3">
        <h1 class="text-3xl font-bold text-gray-900">Безопасность</h1>
        <p class="text-xs text-gray-500 mt-1">Шифрование и защита данных</p>
      </header>
      <main class="px-4 pt-4 space-y-3">
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white">
          <div class="flex items-center gap-4 mb-3">
            <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">🔐</div>
            <div>
              <div class="font-bold">Защита активна</div>
              <div class="text-xs text-gray-300">AES-256-GCM • PBKDF2 (250k)</div>
            </div>
          </div>
          <div class="text-xs text-gray-400 bg-white/5 rounded-lg p-2">Ключ выводится из вашего пароля и хранится только в памяти</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div class="font-semibold text-gray-900">Автоблокировка</div>
            <div class="text-xs text-gray-500">При сворачивании вкладки</div>
          </div>
          <div id="autolock" class="w-12 h-7 rounded-full bg-green-500 relative transition-colors cursor-pointer">
            <div class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform" style="transform: translateX(20px)"></div>
          </div>
        </div>
        <button id="lock-now" class="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between text-left">
          <div>
            <div class="font-semibold text-gray-900">Заблокировать сейчас</div>
            <div class="text-xs text-gray-500">Очистить ключ из памяти</div>
          </div>
          <span class="text-gray-400">→</span>
        </button>
        <button id="wipe" class="w-full bg-red-50 rounded-xl p-4 shadow-sm flex items-center justify-between text-left">
          <div>
            <div class="font-semibold text-red-600">Стереть всё</div>
            <div class="text-xs text-red-400">Необратимо: заметки + пароль</div>
          </div>
          <span class="text-red-400">→</span>
        </button>
      </main>
    `;
  }

  bindEvents() {
    this.el.querySelector('#lock-now').addEventListener('click', () => this.onLock());
    this.el.querySelector('#wipe').addEventListener('click', () => this.wipeAll());
    this.el.querySelector('#autolock').addEventListener('click', (e) => this.toggleAutolock(e.currentTarget));
  }

  toggleAutolock(el) {
    const knob = el.querySelector('div');
    const active = el.dataset.on !== '0';
    if (active) {
      el.dataset.on = '0';
      el.className = 'w-12 h-7 rounded-full bg-gray-300 relative transition-colors cursor-pointer';
      knob.style.transform = 'translateX(0)';
      localStorage.setItem('voicenotes_autolock', '0');
    } else {
      el.dataset.on = '1';
      el.className = 'w-12 h-7 rounded-full bg-green-500 relative transition-colors cursor-pointer';
      knob.style.transform = 'translateX(20px)';
      localStorage.setItem('voicenotes_autolock', '1');
    }
  }

  async wipeAll() {
    if (!confirm('Стереть ВСЕ данные? Это необратимо!')) return;
    await clearVault();
    await clearAuth();
    location.reload();
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
  }
}
