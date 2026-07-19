const ENCRYPTION_ITERATIONS = 250000;
const textEncoder = new TextEncoder();

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(String(value)));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

export async function deriveSecretKey(
  secret: string,
  saltBytes: Uint8Array,
  iterations = ENCRYPTION_ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

export interface DecryptedUser {
  name: string;
  avatar?: string;
  score?: number;
  totalHistory?: number[];
  histHistory?: number[];
  mathHistory?: number[];
  readHistory?: number[];
  sub1History?: number[];
  sub2History?: number[];
  type?: string;
}

export async function decryptUserPayload(secret: string, payload: any): Promise<DecryptedUser> {
  const saltBytes = base64ToBytes(payload.salt_b64);
  const ivBytes = base64ToBytes(payload.iv_b64);
  const cipherBytes = base64ToBytes(payload.ciphertext_b64);
  const key = await deriveSecretKey(secret, saltBytes, Number(payload.iterations) || ENCRYPTION_ITERATIONS);
  
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as any
    },
    key,
    cipherBytes as any
  );
  
  const decryptedObj = JSON.parse(new TextDecoder().decode(plainBuffer));
  return {
    name: decryptedObj.name,
    avatar: decryptedObj.avatar,
    score: decryptedObj.score !== undefined ? decryptedObj.score : (decryptedObj.totalHistory?.slice(-1)[0] || decryptedObj.total?.slice(-1)[0] || 0),
    totalHistory: decryptedObj.totalHistory || decryptedObj.total || [],
    histHistory: decryptedObj.hist || [],
    mathHistory: decryptedObj.math_s || [],
    readHistory: decryptedObj.read_s || [],
    sub1History: decryptedObj.sub1 || [],
    sub2History: decryptedObj.sub2 || [],
    type: decryptedObj.type || 'ҰБТ'
  } as DecryptedUser;
}

export async function loadEncryptedUser(secret: string): Promise<DecryptedUser> {
  const normalizedSecret = String(secret || '').trim();
  if (!normalizedSecret) {
    throw new Error('Secret is empty');
  }

  const fileKey = await sha256Hex(normalizedSecret);
  const response = await fetch(`./users/${fileKey}.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('User file not found');
  }
  const payload = await response.json();
  return decryptUserPayload(normalizedSecret, payload);
}
