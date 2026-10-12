import { MainScreen } from './MainScreen.js';
import { SettingsScreen } from './SettingsScreen.js';
import { GroupsScreen } from './GroupsScreen.js';

export class Shell {
  constructor(root, { vaultKey, onLock }) {
    this.root = root;
    this.vaultKey = vaultKey;
    this.onLock = onLock;
    this.el = null;
    this.currentTab = 'notes';
    this.screens = {};
  }

  async mount() {
    this.el = document.createElement('div');
    this.el.className = 'min-h-dvh bg-[#F2F2F7] outline-none';
    this.el.setAttribute('tabindex', '-1');
    this.el.innerHTML = this.render();
    this.root.appendChild(this.el);
    this.bindEvents();
    await this.switchTab('notes');
    this.el.focus();
  }

  render() {
    return `
      <div id="screen-host"></div>
      <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 flex justify-around items-center py-2 z-40" style="padding-bottom: env(safe-area-inset-bottom)">
        <button data-tab="notes" class="nav-btn flex flex-col items-center gap-1 px-4 py-2">
          <span class="text-xl">📝</span>
          <span class="text-[10px] font-medium">Заметки</span>
        </button>
        <button data-tab="groups" class="nav-btn flex flex-col items-center gap-1 px-4 py-2">
          <span class="text-xl">📂</span>
          <span class="text-[10px] font-medium">Группы</span>
        </button>
        <button data-tab="security" class="nav-btn flex flex-col items-center gap-1 px-4 py-2">
      <span class="text-xl">⚙️</span>
          <span class="text-[10px] font-medium">Настройки</span>
        </button>
      </nav>
    `;
  }

  bindEvents() {
    this.el.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    this.onKeydown = (e) => this.handleKeydown(e);
    this.el.addEventListener('keydown', this.onKeydown);
    this.onClick = (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      this.el.focus();
    };
    this.el.addEventListener('click', this.onClick);
  }

  handleKeydown(e) {
    if (e.defaultPrevented) return;
    const t = e.target;
    const inField = t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]');

    // Esc пробрасываем в активный экран (закрытие шитов и т.п.)
    if (e.key === 'Escape') {
      const screen = this.screens[this.currentTab];
      if (screen && typeof screen.handleEscape === 'function' && screen.handleEscape()) {
        e.preventDefault();
      }
      return;
    }

    if (inField) return;

    // Alt+1/2/3 — переключение табов
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.key === '1') { e.preventDefault(); this.switchTab('notes'); }
      else if (e.key === '2') { e.preventDefault(); this.switchTab('groups'); }
      else if (e.key === '3') { e.preventDefault(); this.switchTab('security'); }
    }
  }

  async switchTab(tab) {
    if (this.screens[this.currentTab]?.unmount) {
      this.screens[this.currentTab].unmount();
    }
    this.currentTab = tab;
    this.highlightTab(tab);
    const host = this.el.querySelector('#screen-host');
    host.innerHTML = '';
    if (tab === 'notes') {
      const s = new MainScreen(host, { vaultKey: this.vaultKey, onLock: this.onLock });
      this.screens[tab] = s;
      await s.mount();
    } else if (tab === 'security') {
      const s = new SettingsScreen(host, {
        vaultKey: this.vaultKey, onLock: this.onLock, root: this.root, onKeyChange: (k) => { this.vaultKey = k; },
      });
      this.screens[tab] = s;
      await s.mount();
    } else if (tab === 'groups') {
        const s = new GroupsScreen(host, { vaultKey: this.vaultKey, onLock: this.onLock });
        this.screens[tab] = s;
        await s.mount();
    }
  }

  highlightTab(tab) {
    this.el.querySelectorAll('.nav-btn').forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.style.color = active ? '#007AFF' : '#8E8E93';
    });
  }

  unmount() {
    Object.values(this.screens).forEach((s) => s?.unmount?.());
    if (this.el) {
      if (this.onKeydown) this.el.removeEventListener('keydown', this.onKeydown);
      if (this.onClick) this.el.removeEventListener('click', this.onClick);
      this.el.remove();
    }
    this.el = null;
  }
}
