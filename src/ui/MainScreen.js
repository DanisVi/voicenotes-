import { VoiceModal } from './VoiceModal.js';
import { loadEncrypted, saveEncrypted } from '../core/storage.js';

export class MainScreen {
  constructor(root, { vaultKey, onLock }) {
    this.root = root;
    this.vaultKey = vaultKey;
    this.onLock = onLock;
    this.el = null;
    this.data = { notes: [] };
    this.query = '';
    this.filterFav = false;
    this.filterGroupId = null;
  }

  async mount() {
    try {
      const loaded = await loadEncrypted(this.vaultKey);
      if (loaded && Array.isArray(loaded.notes)) this.data = loaded;
      if (!Array.isArray(this.data.groups)) this.data.groups = [];
    } catch (e) {
      console.error('load failed', e);
    }
    this.el = document.createElement('div');
    this.el.className = 'min-h-dvh bg-[#F2F2F7] pb-24';
    this.el.innerHTML = this.render();
    this.root.appendChild(this.el);
    this.bindEvents();
    this.fillGroupChips();
    this.renderList();
  }

  async persist() {
    try {
      await saveEncrypted(this.vaultKey, this.data);
    } catch (e) {
      console.error('save failed', e);
    }
  }

  render() {
    const total = this.data.notes.length;
    const favCount = this.data.notes.filter((n) => n.favorite).length;
    return `
      <header class="sticky top-0 z-20 bg-[#F2F2F7]/90 backdrop-blur border-b border-gray-200/60 px-4 pt-8 pb-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Заметки</h1>
            <p class="text-xs text-gray-500 mt-0.5">Всего: ${total} · В избранном: ${favCount}</p>
          </div>
          <button id="lock-btn" class="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white">🔒</button>
        </div>
        <input id="search" type="text" placeholder="Поиск..."
          class="mt-3 w-full px-4 py-2.5 bg-white rounded-xl text-sm shadow-sm outline-none" />
        <div class="flex gap-2 mt-3">
          <button id="tab-all" class="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white">Все</button>
          <button id="tab-fav" class="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">★ Избранное</button>
        </div>
        <div id="group-chips" class="flex gap-2 mt-2 overflow-x-auto pb-1"></div>
      </header>
      <main id="list" class="px-4 pt-4 space-y-3"></main>
      <button id="voice-btn" class="fixed bottom-40 right-5 w-12 h-12 bg-white border border-gray-200 rounded-full text-xl shadow-lg z-20">🎤</button>
      <button id="fab" class="fixed bottom-24 right-5 w-14 h-14 bg-blue-500 rounded-full text-white text-3xl shadow-xl z-20">+</button>
      <div id="sheet" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black/40" id="sheet-backdrop"></div>
        <div id="sheet-panel" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 pb-8 transition-transform duration-300" style="transform: translateY(100%)">
          <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <textarea id="note-text" rows="5" placeholder="Текст заметки..."
            class="w-full p-3 bg-gray-100 rounded-xl resize-none outline-none"></textarea>
        <div class="mt-3">
          <div class="text-xs text-gray-500 mb-2">Группа</div>
          <div id="note-group-chips" class="flex gap-2 overflow-x-auto pb-1"></div>
        </div>
          <div class="flex gap-2 mt-3">
            <button id="cancel" class="flex-1 py-3 bg-gray-100 rounded-xl">Отмена</button>
            <button id="save" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.el.querySelector('#lock-btn').addEventListener('click', () => this.onLock());
    this.el.querySelector('#voice-btn').addEventListener('click', () => this.openVoice());
    this.el.querySelector('#fab').addEventListener('click', () => this.openSheet());
    this.el.querySelector('#cancel').addEventListener('click', () => this.closeSheet());
    this.el.querySelector('#sheet-backdrop').addEventListener('click', () => this.closeSheet());
    this.el.querySelector('#save').addEventListener('click', () => {
      this.saveNote().catch((e) => console.error('saveNote failed', e));
    });
    this.el.querySelector('#tab-all').addEventListener('click', () => this.setFilter(false));
    this.el.querySelector('#tab-fav').addEventListener('click', () => this.setFilter(true));
    this.el.querySelector('#search').addEventListener('input', (e) => {
      this.query = e.target.value.toLowerCase();
      this.renderList();
    });
  }

  openVoice() {
    const modal = new VoiceModal(this.el, {
      vaultKey: this.vaultKey,
      groups: this.data.groups,
      onSave: ({ text, groupId, favorite }) => this.addNoteFromVoice(text, groupId, favorite),
      onClose: () => { this.voiceModal = null; },
    });
    this.voiceModal = modal;
    modal.mount();
  }

  async addNoteFromVoice(text, groupId, favorite) {
    if (!text) return;
    this.data.notes.unshift({
      id: Date.now(),
      text,
      timestamp: new Date().toISOString(),
      favorite: !!favorite,
      groupId: groupId || null,
    });
    await this.persist();
    this.refreshHeader();
    this.renderList();
    this.fillGroupChips();
  }

  setFilter(favOnly) {
    this.filterFav = favOnly;
    const tAll = this.el.querySelector('#tab-all');
    const tFav = this.el.querySelector('#tab-fav');
    if (favOnly) {
      tAll.className = 'px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200';
      tFav.className = 'px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white';
    } else {
      tAll.className = 'px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white';
      tFav.className = 'px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200';
    }
    this.renderList();
  }

  openSheet() {
    this.el.querySelector('#note-text').value = '';
    this.pendingGroupId = null;
    this.fillNoteGroupChips();
    const sheet = this.el.querySelector('#sheet');
    const panel = this.el.querySelector('#sheet-panel');
    sheet.classList.remove('hidden');
    requestAnimationFrame(() => {
      panel.style.transform = 'translateY(0)';
    });
  }

  closeSheet() {
    const sheet = this.el.querySelector('#sheet');
    const panel = this.el.querySelector('#sheet-panel');
    panel.style.transform = 'translateY(100%)';
    setTimeout(() => sheet.classList.add('hidden'), 300);
  }

  fillGroupChips() {
    const wrap = this.el.querySelector('#group-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const mk = (label, id) => {
      const btn = document.createElement('button');
      const active = this.filterGroupId === id;
      btn.className = 'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ' + (active ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-200');
      btn.textContent = label;
      btn.addEventListener('click', () => this.setGroupFilter(id));
      wrap.appendChild(btn);
    };
    mk('Все', null);
    this.data.groups.forEach((g) => mk(g.emoji + ' ' + g.name, g.id));
  }

  setGroupFilter(id) {
    this.filterGroupId = id;
    this.fillGroupChips();
    this.renderList();
  }

  fillNoteGroupChips() {
    const wrap = this.el.querySelector('#note-group-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const mk = (label, id) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = this.pendingGroupId === id;
      btn.className = 'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ' + (active ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-200');
      btn.textContent = label;
      btn.addEventListener('click', () => { this.pendingGroupId = id; this.fillNoteGroupChips(); });
      wrap.appendChild(btn);
    };
    mk('Без группы', null);
    this.data.groups.forEach((g) => mk(g.emoji + ' ' + g.name, g.id));
  }

  async saveNote() {
    const text = this.el.querySelector('#note-text').value.trim();
    if (!text) return;
    this.data.notes.unshift({
      id: Date.now(),
      text,
      timestamp: new Date().toISOString(),
      favorite: false,
      groupId: this.pendingGroupId || null,
    });
    await this.persist();
    this.closeSheet();
    this.refreshHeader();
    this.renderList();
  }

  refreshHeader() {
    const total = this.data.notes.length;
    const favCount = this.data.notes.filter((n) => n.favorite).length;
    const p = this.el.querySelector('header p');
    if (p) p.textContent = 'Всего: ' + total + ' · В избранном: ' + favCount;
  }

  async deleteNote(id) {
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    await this.persist();
    this.refreshHeader();
    this.renderList();
  }

  async toggleFav(id) {
    const n = this.data.notes.find((x) => x.id === id);
    if (!n) return;
    n.favorite = !n.favorite;
    await this.persist();
    this.refreshHeader();
    this.renderList();
  }

  formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return 'Сегодня, ' + time;
    if (isYest) return 'Вчера, ' + time;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' + time;
  }

  renderList() {
    const list = this.el.querySelector('#list');
    list.innerHTML = '';
    let notes = this.data.notes;
    if (this.filterFav) notes = notes.filter((n) => n.favorite);
    if (this.query) notes = notes.filter((n) => n.text.toLowerCase().includes(this.query));
    if (this.filterGroupId) notes = notes.filter((n) => n.groupId === this.filterGroupId);
    if (notes.length === 0) {
      list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4 text-3xl">📝</div>
          <p class="text-gray-400">${this.query ? 'Ничего не найдено' : 'Заметок пока нет'}</p>
        </div>`;
      return;
    }
    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl p-4 shadow-sm';
      card.innerHTML = `
        <div class="flex items-start justify-between mb-1">
          <span class="text-xs text-gray-400"></span>
          <button class="text-lg leading-none" data-fav>${note.favorite ? '★' : '☆'}</button>
        </div>
        <p class="text-gray-900 whitespace-pre-wrap break-words mb-2"></p>
        <button class="text-xs text-red-500" data-del>Удалить</button>
      `;
      card.querySelector('span').textContent = this.formatDate(note.timestamp);
      card.querySelector('p').textContent = note.text;
      card.querySelector('[data-fav]').style.color = note.favorite ? '#FF9500' : '#C7C7CC';
      card.querySelector('[data-fav]').addEventListener('click', () => this.toggleFav(note.id));
      card.querySelector('[data-del]').addEventListener('click', () => this.deleteNote(note.id));
      list.appendChild(card);
    });
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
  }
}
