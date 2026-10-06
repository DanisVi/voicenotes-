import { deriveKey, encrypt, decrypt, randomBytes, SALT_LENGTH } from './crypto.js';

const DB_NAME = 'voicenotes';
const DB_VERSION = 1;
const VAULT_STORE = 'vault';
const META_STORE = 'meta';

const META_SALT_KEY = 'salt';
const META_VERSION_KEY = 'schemaVersion';
const VAULT_BLOB_KEY = 'encrypted_blob';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    try {
      result = fn(os);
    } catch (e) {
      reject(e);
      return;
    }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

async function getMeta(key) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(META_STORE, 'readonly');
      const req = t.objectStore(META_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
}

async function setMeta(key, value) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(META_STORE, 'readwrite');
      t.objectStore(META_STORE).put(value, key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    }).catch(reject);
  });
}

export async function getOrCreateSalt() {
  let salt = await getMeta(META_SALT_KEY);
  if (!salt) {
    salt = randomBytes(SALT_LENGTH);
    await setMeta(META_SALT_KEY, salt);
  }
  if (!(salt instanceof Uint8Array)) {
    salt = new Uint8Array(salt);
  }
  return salt;
}

export async function hasVault() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(VAULT_STORE, 'readonly');
      const req = t.objectStore(VAULT_STORE).get(VAULT_BLOB_KEY);
      req.onsuccess = () => resolve(req.result != null);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
}

export async function saveEncrypted(key, data) {
  const json = JSON.stringify(data);
  const payload = await encrypt(key, json);
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(VAULT_STORE, 'readwrite');
      t.objectStore(VAULT_STORE).put(payload, VAULT_BLOB_KEY);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    }).catch(reject);
  });
}

export async function loadEncrypted(key) {
  const payload = await new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(VAULT_STORE, 'readonly');
      const req = t.objectStore(VAULT_STORE).get(VAULT_BLOB_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
  if (!payload) return null;
  const json = await decrypt(key, payload);
  return JSON.parse(json);
}

export async function clearVault() {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction([VAULT_STORE, META_STORE], 'readwrite');
      t.objectStore(VAULT_STORE).clear();
      t.objectStore(META_STORE).clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    }).catch(reject);
  });
}
