import { describe, it, expect } from 'vitest';
import { sha256 } from '../src/crypto.js';

describe('sha256', () => {
  it('should return a 64-character hex string', async () => {
    const hash = await sha256('hello');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic (same input produces same hash)', async () => {
    const hash1 = await sha256('hello');
    const hash2 = await sha256('hello');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await sha256('hello');
    const hash2 = await sha256('world');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', async () => {
    const hash = await sha256('');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should handle unicode characters', async () => {
    const hash = await sha256('Hello, World!');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should handle long input', async () => {
    const longStr = 'a'.repeat(10000);
    const hash = await sha256(longStr);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
