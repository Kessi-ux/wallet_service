import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './apikey.guard';
import { APIKEY_PERMISSIONS_KEY } from '../decorators/apikey-permissions.decorator';

@Injectable()
export class EitherAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // If Authorization Bearer present -> verify JWT
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'supersecret' });
        // attach user identity to req.user (mimic passport)
        req.user = { id: payload.sub, email: payload.email };
        return true;
      } catch (e) {
        throw new UnauthorizedException('Invalid or expired JWT');
      }
    }

    // Otherwise try API key (ApiKeyGuard will throw appropriate exceptions)
    // But we need to ensure permission metadata is passed to apikey.guard: ApiKeyGuard uses Reflector to fetch metadata
    return this.apiKeyGuard.canActivate(context);
  }
}
