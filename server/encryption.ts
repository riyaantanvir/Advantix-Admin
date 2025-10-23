import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES-256-GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM authentication tag
const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY';

// Get or validate encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env[ENCRYPTION_KEY_ENV];
  
  if (!key) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} environment variable is required for encryption. ` +
      'Generate a secure key with: openssl rand -base64 32'
    );
  }

  // Convert base64 key to buffer (32 bytes for AES-256)
  const keyBuffer = Buffer.from(key, 'base64');
  
  if (keyBuffer.length !== 32) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} must be exactly 32 bytes (base64 encoded). ` +
      'Current length: ' + keyBuffer.length
    );
  }

  return keyBuffer;
}

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns null if encryption key is not configured
 */
export function encrypt(plaintext: string): EncryptedData | null {
  if (!plaintext) {
    return null;
  }

  // Check if encryption key is configured
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error) {
    // Encryption key not configured - return null
    console.warn('Encryption key not configured, skipping encryption for sensitive field');
    return null;
  }
}

/**
 * Decrypts encrypted data using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData): string {
  if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error('Invalid encrypted data structure');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Hash a password using bcrypt (for the farming account passwords themselves)
 * Note: This is different from user authentication passwords
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a hashed password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

/**
 * Helper to encrypt optional field (returns null if input is null/undefined)
 */
export function encryptOptional(plaintext: string | null | undefined): EncryptedData | null {
  if (!plaintext) return null;
  return encrypt(plaintext);
}

/**
 * Helper to decrypt optional field (returns null if input is null)
 */
export function decryptOptional(encryptedData: EncryptedData | null): string | null {
  if (!encryptedData) return null;
  return decrypt(encryptedData);
}

/**
 * Validate encryption key on server startup
 */
export function validateEncryptionSetup(): void {
  try {
    getEncryptionKey();
    console.log('✓ Encryption key validated successfully');
  } catch (error) {
    console.error('✗ Encryption setup validation failed:', error);
    throw error;
  }
}
