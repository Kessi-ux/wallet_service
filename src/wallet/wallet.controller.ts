import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../keys/guards/apikey.guard';
import { Permissions } from '../keys/decorators/apikey-permissions.decorator';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance for logged-in user' })
  @ApiResponse({ status: 200, description: 'Returns wallet balance' })
  async getBalance(@Req() req: any) {
    return await this.walletService.getBalance(req.user.id);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiSecurity('APIKey')
  @ApiOperation({ summary: 'Deposit money into user wallet' })
  @ApiResponse({ status: 201, description: 'Deposit initialized successfully' })
  @Permissions('deposit')
  async deposit(@Req() req, @Body() dto: DepositDto) {
    // req.user → from JWT
    // req.apiUser → from API key guard
    const userId = req.user?.id || req.apiUser?.id;

    return this.walletService.initializeDeposit(userId, dto.amount);
  }
}
