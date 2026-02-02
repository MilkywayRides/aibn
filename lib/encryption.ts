import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

// Generate encryption key from environment variable
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set")
  }
  return crypto.scryptSync(secret, "salt", KEY_LENGTH)
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const tag = cipher.getAuthTag()
  
  // Combine iv + tag + encrypted data
  return iv.toString("hex") + tag.toString("hex") + encrypted
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  
  // Extract iv, tag, and encrypted text
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex")
  const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), "hex")
  const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}
