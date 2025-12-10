import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata, } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Reflector } from '@nestjs/core';
import { APIKEY_PERMISSIONS_KEY } from '../decorators/apikey-permissions.decorator';
import { ApiKey } from '@prisma/client';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const rawKey = req.header('x-api-key');
    if (!rawKey) {
      throw new UnauthorizedException('x-api-key header required');
    }

    // Fetch candidate keys for faster search - limit to non-revoked
    const candidateKeys = await this.prisma.apiKey.findMany({
      where: { revoked: false },
      orderBy: { createdAt: 'desc' },
    });



    // Find matching hashed key
    let matched: ApiKey | null = null;
    for (const k of candidateKeys) {
      const ok = await bcrypt.compare(rawKey, k.keyHash);
      if (ok) {
        matched = k;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid API key');

    // check expiry
    if (matched.expiresAt && matched.expiresAt < new Date()) {
      throw new ForbiddenException('API key expired');
    }

    // check required permissions (if any)
    const requiredPermissions: string[] = this.reflector.get(APIKEY_PERMISSIONS_KEY, context.getHandler()) || [];
    if (requiredPermissions.length > 0) {
      const hasAll = requiredPermissions.every((p) => matched.permissions.includes(p));
      if (!hasAll) throw new ForbiddenException('API key missing required permissions');
    }

    // Attach api key metadata to request for downstream usage
    req.apiKey = { id: matched.id, name: matched.name, userId: matched.userId, permissions: matched.permissions };
    req.apiKeyRaw = rawKey;

    return true;
  }
}
