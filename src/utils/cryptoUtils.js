/**
 * Universal Encryption & Decryption Engine
 * Supports Web Crypto API (window.crypto.subtle) when in Secure Context (HTTPS/localhost)
 * And provides a self-contained JS Fallback for non-secure HTTP / IP address contexts.
 */

// Helper: Convert Uint8Array to Base64
function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
function base64ToUint8(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Pure JS SHA-256 Implementation (Universal - Works in HTTP & HTTPS)
 */
function sha256(ascii) {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = (sha256.h = sha256.h || []);
  let k = (sha256.k = sha256.k || []);
  let primeCounter = k[lengthProperty];

  const isPrime = (n) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  const getFractionalBits = (n) => Math.floor((n - Math.floor(n)) * maxWord);

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = getFractionalBits(mathPow(candidate, 1 / 2));
      }
      k[primeCounter] = getFractionalBits(mathPow(candidate, 1 / 3));
      primeCounter++;
    }
  }

  hash = hash.slice(0);

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = i >> 2;
    words[j] = (words[j] || 0) | (ascii.charCodeAt(i) << ((3 - (i % 4)) * 8));
  }

  words[asciiBitLength >> 5] = (words[asciiBitLength >> 5] || 0) | (0x80 << (24 - (asciiBitLength % 32)));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15], w2 = w[j - 2];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);

      if (j >= 16) {
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = hash[7] + (((hash[4] >>> 6) | (hash[4] << 26)) ^ ((hash[4] >>> 11) | (hash[4] << 21)) ^ ((hash[4] >>> 25) | (hash[4] << 7))) + ch + k[j] + (w[j] || 0);
      const temp2 = (((hash[0] >>> 2) | (hash[0] << 30)) ^ ((hash[0] >>> 13) | (hash[0] << 19)) ^ ((hash[0] >>> 22) | (hash[0] << 10))) + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Universal Stream Cipher Encryption (Fallback when Web Crypto API is unavailable in HTTP)
 */
function encryptJS(plaintext, passphrase) {
  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plaintext);
  
  // Random 16-byte salt as hex
  const saltHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  
  // Generate keystream blocks using SHA-256
  let keyBlock = sha256(passphrase + saltHex);
  const cipherBytes = new Uint8Array(plainBytes.length);

  for (let i = 0; i < plainBytes.length; i++) {
    if (i > 0 && i % 32 === 0) {
      keyBlock = sha256(keyBlock + passphrase + (i / 32));
    }
    const kByte = parseInt(keyBlock.substring((i % 32) * 2, (i % 32) * 2 + 2), 16);
    cipherBytes[i] = plainBytes[i] ^ kByte;
  }

  // MAC Checksum for integrity & password verification
  const mac = sha256(saltHex + passphrase + uint8ToBase64(cipherBytes));

  return JSON.stringify({
    version: 'MFPulse_Encrypted_v1',
    isEncrypted: true,
    engine: 'UniversalJS',
    salt: saltHex,
    mac: mac,
    ciphertext: uint8ToBase64(cipherBytes)
  }, null, 2);
}

/**
 * Universal Stream Cipher Decryption
 */
function decryptJS(encryptedObj, passphrase) {
  const { salt, mac, ciphertext } = encryptedObj;
  
  const expectedMac = sha256(salt + passphrase + ciphertext);
  if (expectedMac !== mac) {
    throw new Error('Incorrect password or corrupted file');
  }

  const cipherBytes = base64ToUint8(ciphertext);
  let keyBlock = sha256(passphrase + salt);
  const plainBytes = new Uint8Array(cipherBytes.length);

  for (let i = 0; i < cipherBytes.length; i++) {
    if (i > 0 && i % 32 === 0) {
      keyBlock = sha256(keyBlock + passphrase + (i / 32));
    }
    const kByte = parseInt(keyBlock.substring((i % 32) * 2, (i % 32) * 2 + 2), 16);
    plainBytes[i] = cipherBytes[i] ^ kByte;
  }

  const decoder = new TextDecoder();
  return decoder.decode(plainBytes);
}

/**
 * Check Web Crypto API Availability
 */
function hasWebCryptoSubtle() {
  return typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.subtle !== 'undefined' &&
    typeof window.crypto.subtle.importKey === 'function';
}

/**
 * Main Exported Encrypt Function
 */
export async function encryptData(plaintextStr, passphrase) {
  if (!passphrase) throw new Error('Passphrase is required');

  if (hasWebCryptoSubtle()) {
    try {
      const encoder = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const passphraseKey = await window.crypto.subtle.importKey(
        'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, encoder.encode(plaintextStr)
      );

      return JSON.stringify({
        version: 'MFPulse_Encrypted_v1',
        isEncrypted: true,
        engine: 'WebCrypto',
        salt: uint8ToBase64(salt),
        iv: uint8ToBase64(iv),
        ciphertext: uint8ToBase64(new Uint8Array(encryptedBuffer))
      }, null, 2);
    } catch (e) {
      console.warn('WebCrypto failed, falling back to UniversalJS cipher:', e);
    }
  }

  // Fallback to Universal JS Cipher
  return encryptJS(plaintextStr, passphrase);
}

/**
 * Main Exported Decrypt Function
 */
export async function decryptData(encryptedJsonStr, passphrase) {
  let parsed;
  try {
    parsed = typeof encryptedJsonStr === 'string' ? JSON.parse(encryptedJsonStr) : encryptedJsonStr;
  } catch (e) {
    throw new Error('Invalid JSON format');
  }

  if (!parsed.isEncrypted || !parsed.ciphertext) {
    throw new Error('File is not an encrypted backup format');
  }

  // Handle UniversalJS Engine Backups
  if (parsed.engine === 'UniversalJS' || parsed.mac) {
    return decryptJS(parsed, passphrase);
  }

  // Handle WebCrypto Engine Backups
  if (hasWebCryptoSubtle() && parsed.salt && parsed.iv) {
    try {
      const encoder = new TextEncoder();
      const salt = base64ToUint8(parsed.salt);
      const iv = base64ToUint8(parsed.iv);
      const ciphertextBuffer = base64ToUint8(parsed.ciphertext).buffer;

      const passphraseKey = await window.crypto.subtle.importKey(
        'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, key, ciphertextBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (err) {
      throw new Error('Incorrect password or corrupted file');
    }
  }

  // Final Fallback to JS engine
  return decryptJS(parsed, passphrase);
}
