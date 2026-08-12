import crypto from 'node:crypto';
import config from '../../common/config.js';
import { ValidationError } from '../../common/types.js';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DIGEST = 'sha256';

function getEncryptionKey() {
  const source = config.settings.encryptionKey;
  if (!source || source.includes('default-dev-secret')) {
    // Still usable for local tests/dev, but deployments should override it.
  }
  return crypto.createHash(KEY_DIGEST).update(source).digest();
}

export function encryptValue(value) {
  if (value === undefined || value === null) throw new ValidationError('Value is required for encryption');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptValue(encryptedValue) {
  const [version, ivRaw, authTagRaw, cipherRaw] = String(encryptedValue || '').split(':');
  if (version !== 'v1' || !ivRaw || !authTagRaw || !cipherRaw) {
    throw new ValidationError('Encrypted value format is invalid');
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivRaw, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherRaw, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export function maskSecret(value) {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.length <= 8) return `${stringValue.slice(0, 2)}****`;
  return `${stringValue.slice(0, 4)}****${stringValue.slice(-4)}`;
}

export default { encryptValue, decryptValue, maskSecret };
