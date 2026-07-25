import { jest } from '@jest/globals';
import { issueToken, verifyToken } from '../utils/token.js';

describe('HMAC session tokens', () => {
  const userId = '68475212-a05c-457e-8986-7b710b7ebe7c';

  it('round-trips a user id through issue and verify', () => {
    expect(verifyToken(issueToken(userId))).toBe(userId);
  });

  it('rejects a token whose signature was tampered with', () => {
    const [payload] = issueToken(userId).split('.');
    expect(verifyToken(`${payload}.notarealsignature`)).toBeNull();
  });

  it('rejects a token whose payload was swapped for another user', () => {
    const [, signature] = issueToken(userId).split('.');
    const forged = Buffer.from(
      JSON.stringify({ userId: 'attacker', exp: Date.now() + 60_000 })
    ).toString('base64url');

    expect(verifyToken(`${forged}.${signature}`)).toBeNull();
  });

  it.each([
    ['empty string', ''],
    ['missing separator', 'nodot'],
    ['non-string input', null],
    ['garbage', 'aaa.bbb'],
  ])('rejects malformed input: %s', (_label, input) => {
    expect(verifyToken(input)).toBeNull();
  });

  it('rejects a token past its expiry', () => {
    const token = issueToken(userId);
    // 13h later — tokens live 12h.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 13 * 60 * 60 * 1000);

    expect(verifyToken(token)).toBeNull();
  });
});
