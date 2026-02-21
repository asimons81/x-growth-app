import crypto from 'crypto';

function getEncryptionKey() {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('KEY_ENCRYPTION_SECRET must be set (minimum 16 characters)');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, encryptedB64, authTagB64] = payload.split(':');
  if (!ivB64 || !encryptedB64 || !authTagB64) {
    throw new Error('Invalid encrypted payload format');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
