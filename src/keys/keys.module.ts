import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from './guards/apikey.guard';
import { EitherAuthGuard } from './guards/either-auth.guard';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'supersecret' }), // used by EitherAuthGuard
  ],
  controllers: [KeysController],
  providers: [KeysService, PrismaService, ApiKeyGuard, EitherAuthGuard, Reflector],
  exports: [KeysService, ApiKeyGuard, EitherAuthGuard],
})
export class KeysModule {}
