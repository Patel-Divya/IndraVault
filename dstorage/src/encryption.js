// encryption.js (NEW)

export async function importKey(password) {
  // Convert string → bytes
  const enc = new TextEncoder().encode(password);

  // Hash → 256-bit (32 bytes)
  const hash = await crypto.subtle.digest("SHA-256", enc);
  console.log("Key length:", hash.byteLength); // should be 32
  console.log("Key:", hash); // should be 32

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptChunk(buffer, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  return {
    iv: Array.from(iv),
    data: new Uint8Array(encrypted)
  };
}

export async function decryptChunk(data, iv, key) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    data
  );

  return new Uint8Array(decrypted);
}