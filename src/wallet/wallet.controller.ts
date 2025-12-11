import { Controller, Get, Param, Post, Query, Body, Req, UseGuards, HttpCode, Headers, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBody, ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { ApiKeyGuard } from '../keys/guards/apikey.guard';
import { Permissions } from '../keys/decorators/apikey-permissions.decorator';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';
import { WalletBalanceDto, DepositStatusDto } from './dto/wallet-response.dto';
import { WalletTransferDto } from './dto/transfer-wallet.dto';
import { WalletTransferResponseDto } from './dto/transfer-wallet.dto';
import { TransactionHistoryResponseDto } from './dto/transaction-history.dto';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get wallet balance for logged-in user' })
  @ApiResponse({ status: 200, description: 'Returns wallet balance', type: WalletBalanceDto })
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

  @Post('paystack/webhook')
  @HttpCode(200) // Paystack expects 200 OK
  @ApiOperation({ summary: 'Handle Paystack Webhook' })
  @ApiBody({ type: PaystackWebhookDto })
  async handleWebhook(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const paystackSecret = process.env.PAYSTACK_SECRET;
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET is not set');
    const rawBody = req.body;

    console.log('🚀 PAYSTACK WEBHOOK HIT (POST) 🚀');

    return this.walletService.handlePaystackWebhook(rawBody, signature, paystackSecret);
  }

  @Get('paystack/webhook')
  ping() {
    console.log('[DEBUG] GET /wallet/paystack/webhook hit');
    return 'Webhook alive';
  }

  @Get('manual-verify')
  @ApiOperation({ summary: 'Manually verify a Paystack transaction' })
  @ApiQuery({ name: 'reference', required: true, description: 'Transaction reference from Paystack' })
  @ApiResponse({ status: 200, description: 'Transaction verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid reference or verification failed' })
  async manualVerify(@Query('reference') reference: string) {
    if (!reference) {
      throw new BadRequestException('Transaction reference is required');
    }

  const result = await this.walletService.verifyPaystackTransaction(reference);
  return result;
  }

  @Get('deposit/:reference/status')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiOperation({ summary: 'Check deposit status by reference' })
  @ApiResponse({ status: 200, description: 'Deposit status returned', type: DepositStatusDto })
  async getDepositStatus(@Param('reference') reference: string) {
    return this.walletService.getDepositStatus(reference);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiSecurity('APIKey')
  @ApiOperation({ summary: 'Transfer funds to another user wallet' })
  @ApiResponse({ status: 201, description: 'Funds transferred', type: WalletTransferResponseDto })
  @Permissions('transfer')
  async transferFunds(@Req() req, @Body() body: WalletTransferDto) {
    const fromUserId = req.user.id;
    return this.walletService.transferFunds(fromUserId, body);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiSecurity('APIKey')
  @ApiOkResponse({
    description: 'User transaction history retrieved successfully',
    type: TransactionHistoryResponseDto,
    isArray: true,
  })
  async getTransactions(@Req() req) {
    const userId = req.user.id; //  Comes from your auth guard
    return this.walletService.getUserTransactions(userId);
  }
}
