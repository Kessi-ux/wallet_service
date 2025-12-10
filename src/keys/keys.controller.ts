import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { KeysService } from './keys.service';
import { CreateKeyDto } from './dto/create-key.dto';
import { RolloverKeyDto } from './dto/rollover-key.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyPermissions } from './decorators/apikey-permissions.decorator';

@ApiTags('API Keys')
@ApiBearerAuth('JWT')
@Controller('keys')
export class KeysController {
  constructor(private keysService: KeysService) {}

  // Only authenticated user (JWT) can create API keys for themselves
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create API key for logged-in user' })
  @ApiBody({ type: CreateKeyDto })
  @ApiResponse({ status: 201, description: 'API Key created (raw key returned once)' })
  async create(@Req() req: any, @Body() dto: CreateKeyDto) {
    // req.user populated by JwtAuthGuard (sub => user.id)
    const userId = req.user?.id;
    return this.keysService.createApiKey(userId, dto.name, dto.permissions, dto.expiry);
  }

  // Rollover expired key -> only the owner with JWT can do this
  @Post('rollover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rollover an expired API key (only owner)' })
  @ApiBody({ type: RolloverKeyDto })
  @ApiResponse({ status: 201, description: 'New API key created (raw key shown once)' })
  async rollover(@Req() req: any, @Body() dto: RolloverKeyDto) {
    const userId = req.user?.id;
    return this.keysService.rolloverKey(userId, dto.expired_key_id, dto.expiry);
  }
}
