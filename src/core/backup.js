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

export async function importVault(backup, passcode) {
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

  await writeMeta(META_SALT_KEY, salt);
  await writeMeta(CANARY_KEY, backup.canary);
  await writeRawVaultBlob(backup.vault);

  return true;
}
