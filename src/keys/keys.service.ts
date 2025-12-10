import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  // convert "1H"|"1D"|"1M"|"1Y" to Date
  expiryToDate(expiry: '1H' | '1D' | '1M' | '1Y') {
    const now = new Date();
    switch (expiry) {
      case '1H':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1D':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '1Y':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        throw new BadRequestException('Invalid expiry');
    }
  }

  // generate raw key
  generateRawKey() {
    return 'sk_live_' + randomBytes(20).toString('hex');
  }

  // create new API key for user (returns rawKey to show ONCE)
  async createApiKey(userId: string, name: string, permissions: string[], expiry: '1H'|'1D'|'1M'|'1Y') {
    // Validate permissions explicit (example: only allow specific perms)
    if (!permissions || permissions.length === 0) {
      throw new BadRequestException('Permissions must be provided');
    }

    // Enforce max 5 active keys (not revoked & not expired)
    const activeCount = await this.prisma.apiKey.count({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeCount >= 5) {
      throw new ForbiddenException('Maximum of 5 active API keys allowed per user');
    }

    const raw = this.generateRawKey();
    const keyHash = await bcrypt.hash(raw, 10);
    const expiresAt = this.expiryToDate(expiry);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        permissions,
        expiresAt,
      },
    });

    // Return api key info with raw key shown ONCE
    return { api_key: raw, id: apiKey.id, expires_at: apiKey.expiresAt.toISOString() };
  }

  // rollover expired key
  async rolloverKey(userId: string, expiredKeyId: string, expiry: '1H'|'1D'|'1M'|'1Y') {
    const key = await this.prisma.apiKey.findUnique({ where: { id: expiredKeyId } });
    if (!key) throw new BadRequestException('Expired key not found');

    if (key.userId !== userId) throw new ForbiddenException('Not owner of this key');

    if (key.expiresAt > new Date() && !key.revoked) {
      throw new BadRequestException('Key has not yet expired and cannot be rolled over');
    }

    if (key.revoked) {
    throw new BadRequestException('This key has already been rolled over or revoked');
    }

    await this.revokeKey(userId, expiredKeyId);

    // reuse same permissions/name
    const raw = this.generateRawKey();
    const keyHash = await bcrypt.hash(raw, 10);
    const expiresAt = this.expiryToDate(expiry);

    const newKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: key.name,
        keyHash,
        permissions: key.permissions,
        expiresAt,
      },
    });

    return { api_key: raw, id: newKey.id, expires_at: newKey.expiresAt.toISOString() };
  }

  // revoke key
  async revokeKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) throw new BadRequestException('Key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not owner');
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { revoked: true } });
    return { revoked: true };
  }
}
