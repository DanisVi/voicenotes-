import { loadEncrypted, saveEncrypted } from '../core/storage.js';

const EMOJI_PALETTE = [
  '📁', '🎵', '💼', '🏠', '🎓', '⭐', '❤️', '🔥',
  '🌱', '💡', '📚', '🎨', '✈️', '🍕', '🎮', '🐾',
];

export class GroupsScreen {
  constructor(root, { vaultKey, onLock }) {
    this.root = root;
    this.vaultKey = vaultKey;
    this.onLock = onLock;
    this.el = null;
    this.data = { notes: [], groups: [] };
  }

  async mount() {
    try {
      const loaded = await loadEncrypted(this.vaultKey);
      if (loaded && Array.isArray(loaded.notes)) this.data = loaded;
      if (!Array.isArray(this.data.groups)) this.data.groups = [];
    } catch (e) {
      console.error('groups load failed', e);
    }
    this.el = document.createElement('div');
    this.el.className = 'min-h-dvh bg-[#F2F2F7] pb-24';
    this.el.innerHTML = this.render();
    this.root.appendChild(this.el);
    this.bindEvents();
    this.renderGroups();
  }

  async persist() {
    try {
      await saveEncrypted(this.vaultKey, this.data);
    } catch (e) {
      console.error('groups save failed', e);
    }
  }

  render() {
    return `
      <header class="sticky top-0 z-20 bg-[#F2F2F7]/90 backdrop-blur border-b border-gray-200/60 px-4 pt-8 pb-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Группы</h1>
            <p id="groups-count" class="text-xs text-gray-500 mt-0.5">Всего: ${this.data.groups.length}</p>
          </div>
        </div>
      </header>
      <main id="groups-list" class="px-4 pt-4 space-y-3"></main>
      <button id="new-group-btn" class="fixed bottom-24 right-5 w-14 h-14 bg-blue-500 rounded-full text-white text-3xl shadow-xl z-20">+</button>
      <div id="group-sheet" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black/40" id="group-sheet-backdrop"></div>
        <div id="group-sheet-panel" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 pb-8 transition-transform duration-300" style="transform: translateY(100%)">
          <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h2 id="group-sheet-title" class="text-lg font-semibold mb-3">Новая группа</h2>
          <div id="emoji-grid" class="grid grid-cols-8 gap-2 mb-3"></div>
          <input id="group-name" type="text" maxlength="40" placeholder="Название группы..."
                 class="w-full p-3 bg-gray-100 rounded-xl outline-none mb-3" />
          <div class="flex gap-2">
            <button id="group-cancel" class="flex-1 py-3 bg-gray-100 rounded-xl">Отмена</button>
            <button id="group-save" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium">Сохранить</button>
          </div>
        </div>
      </div>
      <div id="confirm-sheet" class="fixed inset-0 z-[60] hidden">
        <div class="absolute inset-0 bg-black/40" id="confirm-backdrop"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-5 w-72">
          <p id="confirm-text" class="text-center text-gray-900 mb-4">Удалить группу?</p>
          <div class="flex gap-2">
            <button id="confirm-no" class="flex-1 py-2.5 bg-gray-100 rounded-xl">Отмена</button>
            <button id="confirm-yes" class="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium">Удалить</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.el.querySelector('#new-group-btn').addEventListener('click', () => this.openSheet());
    this.el.querySelector('#group-cancel').addEventListener('click', () => this.closeSheet());
    this.el.querySelector('#group-sheet-backdrop').addEventListener('click', () => this.closeSheet());
    this.el.querySelector('#group-save').addEventListener('click', () => this.saveGroup());
    this.el.querySelector('#confirm-no').addEventListener('click', () => this.closeConfirm());
    this.el.querySelector('#confirm-backdrop').addEventListener('click', () => this.closeConfirm());
  }

  openSheet(group = null) {
    this.editingId = group ? group.id : null;
    this.selectedEmoji = group ? group.emoji : EMOJI_PALETTE[0];
    const sheet = this.el.querySelector('#group-sheet');
    const panel = this.el.querySelector('#group-sheet-panel');
    const title = this.el.querySelector('#group-sheet-title');
    const input = this.el.querySelector('#group-name');
    title.textContent = group ? 'Редактировать группу' : 'Новая группа';
    input.value = group ? group.name : '';
    this.renderEmojiGrid();
    sheet.classList.remove('hidden');
    requestAnimationFrame(() => { panel.style.transform = 'translateY(0)'; });
  }

  closeSheet() {
    const sheet = this.el.querySelector('#group-sheet');
    const panel = this.el.querySelector('#group-sheet-panel');
    panel.style.transform = 'translateY(100%)';
    setTimeout(() => sheet.classList.add('hidden'), 300);
  }

  renderEmojiGrid() {
    const grid = this.el.querySelector('#emoji-grid');
    grid.innerHTML = '';
    EMOJI_PALETTE.forEach((em) => {
      const btn = document.createElement('button');
      btn.className = 'text-2xl p-1 rounded-lg ' +
        (em === this.selectedEmoji ? 'bg-blue-100 ring-2 ring-blue-500' : '');
      btn.textContent = em;
      btn.addEventListener('click', () => {
        this.selectedEmoji = em;
        this.renderEmojiGrid();
      });
      grid.appendChild(btn);
    });
  }

  renderGroups() {
    const list = this.el.querySelector('#groups-list');
    list.innerHTML = '';
    const cnt = this.el.querySelector('#groups-count');
    if (cnt) cnt.textContent = 'Всего: ' + this.data.groups.length;
    if (this.data.groups.length === 0) {
      list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4 text-3xl">📁</div>
          <p class="text-gray-400">Групп пока нет</p>
        </div>`;
      return;
    }
    this.data.groups.forEach((g) => {
      const count = this.data.notes.filter((n) => n.groupId === g.id).length;
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl p-4 shadow-sm flex items-center justify-between';
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">${g.emoji}</span>
          <div>
            <div class="font-medium text-gray-900">${g.name}</div>
            <div class="text-xs text-gray-400">${count} заметок</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="text-gray-400 text-lg" data-edit>✏️</button>
          <button class="text-gray-400 text-lg" data-del>🗑</button>
        </div>`;
      card.querySelector('[data-edit]').addEventListener('click', () => this.openSheet(g));
      card.querySelector('[data-del]').addEventListener('click', () => this.askDelete(g));
      list.appendChild(card);
    });
  }

  async saveGroup() {
    const input = this.el.querySelector('#group-name');
    const name = input.value.trim();
    if (!name) return;
    if (this.editingId) {
      const g = this.data.groups.find((x) => x.id === this.editingId);
      if (g) { g.name = name; g.emoji = this.selectedEmoji; }
    } else {
      this.data.groups.push({ id: Date.now(), name, emoji: this.selectedEmoji });
    }
    await this.persist();
    this.closeSheet();
    this.renderGroups();
  }

  askDelete(group) {
    this.pendingDeleteId = group.id;
    const sheet = this.el.querySelector('#confirm-sheet');
    const txt = this.el.querySelector('#confirm-text');
    txt.textContent = `Удалить группу «${group.name}»? Заметки останутся без группы.`;
    sheet.classList.remove('hidden');
    this.el.querySelector('#confirm-yes').onclick = () => this.confirmDelete();
  }

  closeConfirm() {
    this.el.querySelector('#confirm-sheet').classList.add('hidden');
    this.pendingDeleteId = null;
  }

  async confirmDelete() {
    const id = this.pendingDeleteId;
    if (!id) return;
    this.data.groups = this.data.groups.filter((g) => g.id !== id);
    this.data.notes.forEach((n) => { if (n.groupId === id) n.groupId = null; });
    await this.persist();
    this.closeConfirm();
    this.renderGroups();
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
  }
}

export function getGroupById(groups, id) {
  if (!id) return null;
  return groups.find((g) => g.id === id) || null;
}
