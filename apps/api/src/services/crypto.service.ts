import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '@cf19/shared';
import { env } from '../config/env.js';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;

const JWT_SECRET =
  env.SUPABASE_SERVICE_ROLE_KEY ??
  env.API_SECRET_KEY ??
  'cf19-tay-nguyen-enterprise-jwt-secret-2026';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  store_id: string | null;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Hashes a 6-digit Manager PIN using Node crypto.scryptSync.
 * Format matches supabase/seed.sql 100%: `scrypt$<salt>$<64-byte-hex>`.
 */
export function hashManagerPin(plainPin: string, customSalt?: string): string {
  const salt = customSalt ?? randomBytes(16).toString('hex');
  const derivedHex = scryptSync(plainPin, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derivedHex}`;
}

/**
 * Constant-time verification of a Manager PIN against stored `scrypt$<salt>$<hex>`.
 */
export function verifyManagerPin(
  plainPin: string,
  storedHash: string | null | undefined,
): boolean {
  if (!plainPin || !storedHash) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [prefix, salt, expectedHex] = parts;
  if (prefix !== SCRYPT_PREFIX || !salt || !expectedHex) {
    return false;
  }

  if (
    !/^[0-9a-fA-F]+$/.test(expectedHex) ||
    expectedHex.length !== SCRYPT_KEY_LENGTH * 2
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const actualBuffer = scryptSync(plainPin, salt, SCRYPT_KEY_LENGTH);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

export function signAccessToken(params: {
  userId: string;
  role: UserRole;
  assignedStoreId: string | null;
  email: string;
  ttlSeconds?: number;
}): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: AccessTokenPayload = {
    sub: params.userId,
    role: params.role,
    store_id: params.assignedStoreId,
    email: params.email,
    iat: nowSec,
    exp: nowSec + (params.ttlSeconds ?? 60 * 60 * 24),
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const signature = base64UrlEncode(
    createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [header, payload, sig] = parts;
  if (!header || !payload || !sig) {
    return null;
  }

  const expectedSig = base64UrlEncode(
    createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest(),
  );
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as AccessTokenPayload;
    if (!decoded.sub || typeof decoded.exp !== 'number') {
      return null;
    }
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
