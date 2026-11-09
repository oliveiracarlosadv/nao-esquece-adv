/**
 * Criptografia no navegador (Web Crypto API).
 * - Senhas: PBKDF2-SHA256 com sal aleatório.
 * - Backups protegidos: AES-256-GCM com chave derivada da senha do backup.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 210_000;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function randomB64(len = 16): string {
  return toB64(crypto.getRandomValues(new Uint8Array(len)));
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function hashPassword(password: string, saltB64 = randomB64()): Promise<{ hash: string; salt: string }> {
  const key = await pbkdf2(password, fromB64(saltB64));
  const raw = await crypto.subtle.exportKey('raw', key);
  return { hash: toB64(raw), salt: saltB64 };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const { hash: h } = await hashPassword(password, salt);
  return h === hash;
}

export type EncryptedPayload = { alg: 'AES-GCM'; kdf: 'PBKDF2-SHA256'; iterations: number; salt: string; iv: string; data: string };

export async function encryptText(text: string, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await pbkdf2(password, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toB64(salt), iv: toB64(iv), data: toB64(data) };
}

export async function decryptText(payload: EncryptedPayload, password: string): Promise<string> {
  const key = await pbkdf2(password, fromB64(payload.salt));
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(payload.iv) }, key, fromB64(payload.data));
  return dec.decode(data);
}

export async function sha1Short(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-1', enc.encode(text));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
