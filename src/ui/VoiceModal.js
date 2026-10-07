import { createRecognizer, isSpeechSupported } from '../modules/voice.js';
import { parseCommand } from '../modules/parser.js';

export class VoiceModal {
  constructor(root, { vaultKey, groups = [], onSave, onClose } = {}) {
    this.root = root;
    this.vaultKey = vaultKey;
    this.groups = groups;
    this.onSave = onSave;
    this.onClose = onClose;
    this.el = null;
    this.rec = null;
    this.finalText = '';
    this.interimText = '';
    this.state = 'idle';
    this.selectedGroupId = null;
    this.favorite = false;
    this.errorMsg = '';
  }

  async mount() {
    this.el = document.createElement('div');
    this.el.className = 'fixed inset-0 z-[70]';
    this.el.innerHTML = this.render();
    this.root.appendChild(this.el);
    this.bindEvents();
    if (!isSpeechSupported()) {
      this.state = 'unsupported';
      this.updateUI();
    } else {
      this.state = 'recording';
      this.updateUI();
      this.startRecognition();
    }
  }

  render() {
    return `
      <div class="absolute inset-0 bg-black/60" id="vm-backdrop"></div>
      <div class="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 pb-10" id="vm-panel">
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
        <div id="vm-body"></div>
      </div>
    `;
  }

  unmount() {
    if (this.rec) { try { this.rec.abort(); } catch (_) {} }
    if (this.el) this.el.remove();
    this.el = null;
  }

  bindEvents() {
    this.el.querySelector('#vm-backdrop').addEventListener('click', () => this.close());
  }

  startRecognition() {
    this.rec = createRecognizer({
      lang: 'ru-RU',
      onResult: ({ final, interim }) => {
        this.interimText = (final || interim || "").trim();
        const t = this.el.querySelector('#vm-transcript');
        if (t) t.textContent = this.interimText || '…';
      },
      onError: (e) => {
        if (e.error === 'aborted') return;
        this.errorMsg = e.error || 'unknown';
        this.state = 'error';
        this.updateUI();
      },
      onEnd: () => {
        if (this.state !== 'recording') return;
        this.stop();
      },
    });
    this.rec.start();
  }

  stop() {
    if (this.state !== 'recording') return;
    if (this.rec) { try { this.rec.abort(); } catch (_) {} }

    const raw = (this.interimText || '').trim();
    const parsed = parseCommand(raw, this.groups || []);

    if (parsed.cancelled) {
      this.close();
      return;
    }

    this.finalText = parsed.text;

    if (parsed.groupName) {
      const hit = (this.groups || []).find((g) => g.name === parsed.groupName);
      if (hit) this.selectedGroupId = hit.id;
    }

    if (parsed.favorite) this.favorite = true;

    this.state = 'preview';
    this.updateUI();
  }

  save() {
    const ta = this.el.querySelector('#vm-text');
    const text = ta ? ta.value.trim() : this.finalText;
    if (!text) return this.close();
    this.onSave && this.onSave({ text, groupId: this.selectedGroupId || null, favorite: this.favorite });
    this.close();
  }

  close() {
    this.unmount();
    this.onClose && this.onClose();
  }

  updateUI() {
    const body = this.el.querySelector('#vm-body');
    if (this.state === 'unsupported') {
      body.innerHTML = `
        <div class="text-center">
          <div class="text-5xl mb-3">🚫</div>
          <p class="text-gray-700 font-medium mb-1">Голосовой ввод недоступен</p>
          <p class="text-sm text-gray-400 mb-5">Браузер не поддерживает Web Speech API</p>
          <button id="vm-close" class="w-full py-3 bg-gray-100 rounded-xl">Закрыть</button>
        </div>`;
      body.querySelector('#vm-close').onclick = () => this.close();
      return;
    }
    if (this.state === 'recording') {
      body.innerHTML = `
        <div class="text-center">
          <button id="vm-mic" class="w-24 h-24 rounded-full bg-red-500 text-white text-4xl mx-auto mb-4 animate-pulse">🎤</button>
          <p class="text-sm text-gray-500 mb-2">Слушаю… (тап — стоп)</p>
          <p id="vm-transcript" class="text-gray-900 min-h-[3rem] mb-5 whitespace-pre-wrap">${this.interimText || '…'}</p>
        </div>`;
      body.querySelector('#vm-mic').onclick = () => this.stop();
      return;
    }
    if (this.state === 'error') {
      body.innerHTML = `
        <div class="text-center">
          <div class="text-5xl mb-3">⚠️</div>
          <p class="text-gray-700 font-medium mb-1">Ошибка распознавания</p>
          <p class="text-xs text-gray-400 mb-5">${this.errorMsg || 'unknown'}</p>
          <div class="flex gap-2">
            <button id="vm-x-close" class="flex-1 py-3 bg-gray-100 rounded-xl">Закрыть</button>
            <button id="vm-x-retry" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium">Повторить</button>
          </div>
        </div>`;
      body.querySelector('#vm-x-close').onclick = () => this.close();
      body.querySelector('#vm-x-retry').onclick = () => this.retry();
      return;
    }
    if (this.state === 'preview') {
      body.innerHTML = this.renderPreview();
      this.bindPreviewEvents();
      return;
    }
  }

  renderPreview() {
    const badgeParts = [];
    if (this.selectedGroupId) {
      const g = (this.groups || []).find((x) => x.id === this.selectedGroupId);
      if (g) badgeParts.push('🎯 ' + g.emoji + ' ' + g.name);
    }
    if (this.favorite) badgeParts.push('★ Избранное');
    const badge = badgeParts.length
      ? '<div class="text-xs text-blue-600 mb-2">' + badgeParts.join(' · ') + '</div>'
      : '';

    return `
      <p class="text-xs text-gray-500 mb-2">Распознано (можно исправить):</p>
      ${badge}
      <textarea id="vm-text" rows="3" class="w-full p-3 bg-gray-100 rounded-xl outline-none mb-3 resize-none">${this.finalText}</textarea>
      <div class="text-xs text-gray-500 mb-2">Группа</div>
      <div id="vm-groups" class="flex gap-2 overflow-x-auto pb-2 mb-5"></div>
      <div class="flex gap-2">
        <button id="vm-cancel" class="flex-1 py-3 bg-gray-100 rounded-xl">Отменить</button>
        <button id="vm-save" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium">Сохранить</button>
      </div>
    `;
  }

  bindPreviewEvents() {
    const groups = this.el.querySelector('#vm-groups');
    const mk = (label, id) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = this.selectedGroupId === id;
      btn.className = 'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ' +
        (active ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-200');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.selectedGroupId = id;
        this.bindPreviewEvents();
      });
      groups.appendChild(btn);
    };
    groups.innerHTML = '';
    mk('Без группы', null);
    this.groups.forEach((g) => mk(g.emoji + ' ' + g.name, g.id));
    this.el.querySelector('#vm-cancel').onclick = () => this.close();
    this.el.querySelector('#vm-save').onclick = () => this.save();
  }

  retry() {
    this.errorMsg = '';
    this.interimText = '';
    this.finalText = '';
    this.state = 'recording';
    this.updateUI();
    this.startRecognition();
  }
}
