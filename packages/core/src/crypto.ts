// Isomorphic SHA-256 wrapper (REQ-QUOTE-002)
// Works in both browser (SubtleCrypto) and Node.js (node:crypto)

export async function sha256(data: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data).digest('hex');
}
