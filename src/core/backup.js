// Этап 10A — резервное копирование vault (.vnp файл)
import {
  deriveKey,
  decrypt,
  bytesToBase64,
  base64ToBytes,
} from './crypto.js';

import {
  META_SALT_KEY,
  VAULT_BLOB_KEY,
  readMeta,
  writeMeta,
  readRawVaultBlob,
  writeRawVaultBlob,
} from './storage.js';

import { CANARY_KEY, CANARY_TEXT } from './auth.js';

const BACKUP_VERSION = 1;
const BACKUP_APP = 'VoiceNotes Pro';

export async function exportVault() {
  const salt = await readMeta(META_SALT_KEY);
  if (!salt) throw new Error('Salt не найден в хранилище');

  const canary = await readMeta(CANARY_KEY);
  if (!canary) throw new Error('Canary не найден — vault повреждён');

  const vault = await readRawVaultBlob();
  if (!vault) throw new Error('Vault пуст — нечего экспортировать');

  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);

  const payload = {
    version: BACKUP_VERSION,
    app: BACKUP_APP,
    exportedAt: new Date().toISOString(),
    salt: bytesToBase64(saltBytes),
    canary,
    vault,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + '-' + pad(d.getMinutes());
  const filename = 'voicenotes-' + stamp + '.vnp';

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, bytes: json.length };
}

export async function parseBackupFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Файл не является корректным JSON');
  }
  if (data.app !== BACKUP_APP) {
    throw new Error('Это не файл VoiceNotes Pro');
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error('Неподдерживаемая версия: ' + data.version);
  }
  if (!data.salt || !data.canary || !data.vault) {
    throw new Error('Файл повреждён: нет обязательных полей');
  }
  return data;
}


// Этап 10B — импорт без подмены пароля сеанса.
// Возвращает расшифрованный vault из файла; ничего не пишет.
export async function decryptBackup(backup, passcode) {
  const salt = base64ToBytes(backup.salt);
  const key = await deriveKey(passcode, salt);

  let canaryText;
  try {
    canaryText = await decrypt(key, backup.canary);
  } catch {
    throw new Error('Неверный пароль');
  }
  if (canaryText !== CANARY_TEXT) {
    throw new Error('Неверный пароль');
  }

  let vaultJson;
  try {
    vaultJson = await decrypt(key, backup.vault);
  } catch {
    throw new Error('Не удалось расшифровать vault (файл повреждён)');
  }

  let vault;
  try {
    vault = JSON.parse(vaultJson);
  } catch {
    throw new Error('Расшифрованный vault не является JSON');
  }

  return {
    notes: Array.isArray(vault.notes) ? vault.notes : [],
    groups: Array.isArray(vault.groups) ? vault.groups : [],
  };
}

export function vaultStats(vault) {
  const notes = Array.isArray(vault && vault.notes) ? vault.notes : [];
  const groups = Array.isArray(vault && vault.groups) ? vault.groups : [];
  return {
    notes: notes.length,
    groups: groups.length,
    favorites: notes.filter((n) => !!n.favorite).length,
  };
}

// Слияние двух vault'ов без побочек.
// groups: union по id, локальные приоритетнее.
// notes:  union по id, при коллизии — версия с большим timestamp.
// Битая ссылка groupId (нет ни в local, ни в imported) → null.
// Возвращает новый объект, входные не мутирует.
export function mergeVaults(local, imported) {
  const localVault = {
    notes: Array.isArray(local && local.notes) ? local.notes : [],
    groups: Array.isArray(local && local.groups) ? local.groups : [],
  };
  const importedVault = {
    notes: Array.isArray(imported && imported.notes) ? imported.notes : [],
    groups: Array.isArray(imported && imported.groups) ? imported.groups : [],
  };

  // groups: сначала imported, потом local — local перезаписывает по id.
  const groupsById = new Map();
  for (const g of importedVault.groups) {
    if (g && g.id) groupsById.set(g.id, g);
  }
  for (const g of localVault.groups) {
    if (g && g.id) groupsById.set(g.id, g);
  }
  const groups = Array.from(groupsById.values());

  // notes: сначала imported, потом local; при коллизии — свежее по timestamp.
  const notesById = new Map();
  for (const n of importedVault.notes) {
    if (n && n.id) notesById.set(n.id, n);
  }
  for (const n of localVault.notes) {
    if (!n || !n.id) continue;
    const existing = notesById.get(n.id);
    if (!existing) {
      notesById.set(n.id, n);
      continue;
    }
    const a = Number(existing.timestamp) || 0;
    const b = Number(n.timestamp) || 0;
    notesById.set(n.id, b >= a ? n : existing);
  }

  // Чистим битые ссылки на группы.
  const validGroupIds = new Set(groups.map((g) => g.id));
  const notes = Array.from(notesById.values()).map((n) => {
    const gid = n.groupId && validGroupIds.has(n.groupId) ? n.groupId : null;
    return { ...n, groupId: gid };
  });

  // Порядок: новые заметки сверху, группы по алфавиту (ru).
  notes.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
  groups.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  );

  return { notes, groups };
}
