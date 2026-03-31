import CryptoJS from "crypto-js";

// Convert ArrayBuffer → WordArray
const arrayBufferToWordArray = (ab) => {
  const i8a = new Uint8Array(ab);
  const a = [];
  for (let i = 0; i < i8a.length; i += 4) {
    a.push(
      (i8a[i]     << 24) |
      (i8a[i + 1] << 16) |
      (i8a[i + 2] <<  8) |
       i8a[i + 3]
    );
  }
  return CryptoJS.lib.WordArray.create(a, i8a.length);
};

// Convert WordArray → Uint8Array
const wordArrayToUint8Array = (wordArray) => {
  const words    = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8       = new Uint8Array(sigBytes);
  let i = 0, j = 0;

  while (true) {
    if (i === sigBytes) break;
    const w = words[j++];
    u8[i++] = (w >> 24) & 0xff; if (i === sigBytes) break;
    u8[i++] = (w >> 16) & 0xff; if (i === sigBytes) break;
    u8[i++] = (w >>  8) & 0xff; if (i === sigBytes) break;
    u8[i++] =  w        & 0xff;
  }
  return u8;
};

// Encrypt any file
export const encryptFile = (buffer, key) => {
  const wordArray = arrayBufferToWordArray(buffer);
  return CryptoJS.AES.encrypt(wordArray, key).toString();
};

// Decrypt any file
export const decryptFile = (ciphertext, key) => {
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
  return wordArrayToUint8Array(decrypted);
};
