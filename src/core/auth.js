import { deriveKey, encrypt, decrypt } from './crypto.js';
import { getOrCreateSalt, openDB } from './storage.js';

const CANARY_TEXT = 'voicenotes::canary::v1';
const META_STORE = 'meta';
const CANARY_KEY = 'canary';
const WEBAUTHN_KEY = 'webauthn_cred';
async function metaGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(META_STORE, 'readonly');
    const r = t.objectStore(META_STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function metaSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(META_STORE, 'readwrite');
    t.objectStore(META_STORE).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
export async function isVaultInitialized() {
  const canary = await metaGet(CANARY_KEY);
  return canary != null;
}

export async function createVault(passcode) {
  const salt = await getOrCreateSalt();
  const key = await deriveKey(passcode, salt);
  const canary = await encrypt(key, CANARY_TEXT);
  await metaSet(CANARY_KEY, canary);
  return key;
}
export async function verifyPasscode(passcode) {
  const canary = await metaGet(CANARY_KEY);
  if (!canary) throw new Error('Vault not initialized');
  const salt = await getOrCreateSalt();
  const key = await deriveKey(passcode, salt);
  try {
    const text = await decrypt(key, canary);
    if (text !== CANARY_TEXT) return null;
    return key;
  } catch {
    return null;
  }
}
export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function saveWebAuthnCredential(credentialId) {
  await metaSet(WEBAUTHN_KEY, credentialId);
}
export async function hasWebAuthnCredential() {
  const id = await metaGet(WEBAUTHN_KEY);
  return id != null;
}

export async function clearAuth() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(META_STORE, 'readwrite');
    t.objectStore(META_STORE).delete(CANARY_KEY);
    t.objectStore(META_STORE).delete(WEBAUTHN_KEY);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
