import { clearVault, loadEncrypted, saveEncrypted } from '../core/storage.js';
import { clearAuth } from '../core/auth.js';
import { exportVault, parseBackupFile, decryptBackup, vaultStats, mergeVaults } from '../core/backup.js';

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
        <div class="bg-white rounded-xl p-4 shadow-sm">
          <div class="font-semibold text-gray-900 mb-1">Резервная копия</div>
          <div class="text-xs text-gray-500 mb-3">Экспорт / импорт зашифрованного vault (.vnp)</div>
          <div class="flex gap-2">
            <button id="export-btn" class="flex-1 bg-blue-500 text-white rounded-lg p-3 text-sm font-semibold">Экспорт</button>
            <button id="import-btn" class="flex-1 bg-gray-100 text-gray-900 rounded-lg p-3 text-sm font-semibold">Импорт</button>
          </div>
          <input id="import-file" type="file" accept="*/*" class="hidden" />
          <div id="backup-status" class="text-xs text-gray-500 mt-2 hidden"></div>
        </div>
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
    this.bindBackupEvents();
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
    const ok = await this.showConfirmDialog({
      title: 'Стереть ВСЕ данные?',
      message: 'Это необратимо: заметки + пароль будут удалены.',
      confirmText: 'Стереть',
      danger: true,
    });
    if (!ok) return;
    await clearVault();
    await clearAuth();
    location.reload();
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
  }

  bindBackupEvents() {
    const exportBtn = this.el.querySelector('#export-btn');
    const importBtn = this.el.querySelector('#import-btn');
    const fileInput = this.el.querySelector('#import-file');

    if (exportBtn) exportBtn.addEventListener('click', () => this.handleExport());
    if (importBtn) importBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelected(e.target.files[0]));
    }
  }

  async handleExport() {
    try {
      const { filename, bytes } = await exportVault();
      this.showToast('Экспортировано: ' + filename + ' (' + bytes + ' байт)', 'ok');
    } catch (e) {
      this.showToast('Ошибка экспорта: ' + e.message, 'err');
    }
  }


  async handleFileSelected(file) {
    const input = this.el.querySelector('#import-file');
    if (!file) return;
    try {
      const backup = await parseBackupFile(file);
      const passcode = await this.showPasswordPrompt();
      if (!passcode) {
        if (input) input.value = '';
        return;
      }

      // 1. Расшифровать файл паролем из файла (ничего не пишем).
      const imported = await decryptBackup(backup, passcode);

      // 2. Прочитать текущий vault (уже расшифрован текущим ключом).
      const current = (await loadEncrypted(this.vaultKey)) || { notes: [], groups: [] };

      // 3. Посчитать статистику для превью.
      const sCur = vaultStats(current);
      const sImp = vaultStats(imported);
      const merged = mergeVaults(current, imported);
      const sMer = vaultStats(merged);

      // 4. Модалка выбора: Слить / Заменить / Отмена.
      const choice = await this.showImportChoiceDialog({
        cur: sCur,
        imp: sImp,
        mer: sMer,
      });
      if (choice === 'cancel') {
        if (input) input.value = '';
        return;
      }

      if (choice === 'replace') {
        const ok = await this.showConfirmDialog({
          title: 'Заменить все данные?',
          message:
            'Ваши текущие ' + sCur.notes + ' заметок и ' + sCur.groups +
            ' групп будут полностью заменены данными из файла (' +
            sImp.notes + ' заметок). Это необратимо.',
          confirmText: 'Заменить',
          danger: true,
        });
        if (!ok) {
          if (input) input.value = '';
          return;
        }
        await saveEncrypted(this.vaultKey, {
          notes: imported.notes,
          groups: imported.groups,
        });
        this.showToast(
          'Импорт (замена): ' + sImp.notes + ' заметок. Перезагрузка...',
          'ok'
        );
      } else {
        // choice === 'merge'
        await saveEncrypted(this.vaultKey, merged);
        const addedNotes = sMer.notes - sCur.notes;
        const addedGroups = sMer.groups - sCur.groups;
        this.showToast(
          'Слияние: +' + addedNotes + ' заметок, +' + addedGroups +
            ' групп. Перезагрузка...',
          'ok'
        );
      }

      setTimeout(() => location.reload(), 900);
    } catch (e) {
      this.showToast('Ошибка: ' + e.message, 'err');
      if (input) input.value = '';
    }
  }
  showToast(text, kind) {
    const el = this.el.querySelector('#backup-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden', 'text-green-600', 'text-red-600', 'text-gray-500');
    el.classList.add(kind === 'ok' ? 'text-green-600' : kind === 'err' ? 'text-red-600' : 'text-gray-500');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 5000);
  }

  showPasswordPrompt() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
      overlay.innerHTML =
        '<div class="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">' +
        '  <div class="font-bold text-gray-900 mb-1">Пароль для импорта</div>' +
        '  <div class="text-xs text-gray-500 mb-3">Введите мастер-пароль, которым был зашифрован файл</div>' +
        '  <input id="_pw_input" type="password" class="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none" placeholder="Мастер-пароль" />' +
        '  <div class="flex gap-2 mt-4">' +
        '    <button id="_pw_cancel" class="flex-1 bg-gray-100 text-gray-900 rounded-lg p-3 text-sm font-semibold">Отмена</button>' +
        '    <button id="_pw_ok" class="flex-1 bg-blue-500 text-white rounded-lg p-3 text-sm font-semibold">Импорт</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      const input = overlay.querySelector('#_pw_input');
      const close = (val) => { overlay.remove(); resolve(val); };

      overlay.querySelector('#_pw_cancel').addEventListener('click', () => close(null));
      overlay.querySelector('#_pw_ok').addEventListener('click', () => {
        const v = input.value;
        if (!v) return;
        close(v);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value) close(input.value);
        if (e.key === 'Escape') close(null);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      setTimeout(() => input.focus(), 50);
    });
  }

  showImportChoiceDialog({ cur, imp, mer }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className =
        'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
      overlay.innerHTML =
        '<div class="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">' +
        '  <div class="font-bold text-gray-900 mb-1">Импорт резервной копии</div>' +
        '  <div class="text-xs text-gray-500 mb-3">Файл расшифрован. Выберите, что делать с данными.</div>' +
        '  <div class="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 space-y-1">' +
        '    <div>В файле: <b>' + imp.notes + '</b> заметок, <b>' + imp.groups + '</b> групп, ★ <b>' + imp.favorites + '</b></div>' +
        '    <div>Сейчас: <b>' + cur.notes + '</b> заметок, <b>' + cur.groups + '</b> групп</div>' +
        '    <div class="text-blue-600">После слияния: <b>' + mer.notes + '</b> заметок, <b>' + mer.groups + '</b> групп</div>' +
        '  </div>' +
        '  <div class="flex flex-col gap-2">' +
        '    <button id="_ic_merge" class="w-full bg-blue-500 text-white rounded-lg p-3 text-sm font-semibold">Слить (сохранить оба набора)</button>' +
        '    <button id="_ic_replace" class="w-full bg-gray-100 text-red-600 rounded-lg p-3 text-sm font-semibold">Заменить (только из файла)</button>' +
        '    <button id="_ic_cancel" class="w-full bg-gray-100 text-gray-900 rounded-lg p-3 text-sm font-semibold">Отмена</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      const close = (val) => {
        overlay.remove();
        resolve(val);
      };
      overlay.querySelector('#_ic_merge').addEventListener('click', () => close('merge'));
      overlay.querySelector('#_ic_replace').addEventListener('click', () => close('replace'));
      overlay.querySelector('#_ic_cancel').addEventListener('click', () => close('cancel'));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close('cancel');
      });
    });
  }

  showConfirmDialog({ title, message, confirmText, danger }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
      const btnCls = danger
        ? 'flex-1 bg-red-500 text-white rounded-lg p-3 text-sm font-semibold'
        : 'flex-1 bg-blue-500 text-white rounded-lg p-3 text-sm font-semibold';
      overlay.innerHTML =
        '<div class="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">' +
        '  <div class="font-bold text-gray-900 mb-1">' + title + '</div>' +
        '  <div class="text-xs text-gray-500 mb-4">' + message + '</div>' +
        '  <div class="flex gap-2">' +
        '    <button id="_cf_cancel" class="flex-1 bg-gray-100 text-gray-900 rounded-lg p-3 text-sm font-semibold">Отмена</button>' +
        '    <button id="_cf_ok" class="' + btnCls + '">' + confirmText + '</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      const close = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('#_cf_cancel').addEventListener('click', () => close(false));
      overlay.querySelector('#_cf_ok').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }
}
