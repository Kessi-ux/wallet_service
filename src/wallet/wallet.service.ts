import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '@prisma/client';
import { PaystackService } from '../paystack/paystack.service';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private config: ConfigService,
  ) {}

  // Create wallet automatically for a new user
  async createWalletForUser(userId: string, currency: string): Promise<Wallet> {
    // Generate a unique wallet number (could be random or sequential)
    const walletNumber = 'WAL' + Date.now(); // simple example

    // Check if wallet already exists (prevent duplicates)
    const existing = await this.prisma.wallet.findUnique({ 
      where: { userId_currency: { userId, currency} 
    } 
  });
    if (existing) throw new BadRequestException('Wallet already exists for this user');

    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        walletNumber,
        balance: 0n, // BigInt for initial balance
        currency,
      },
    });
    return wallet;
  }

  // Get balance of a user's wallet
  async getBalance(userId: string, currency = 'NGN'): Promise<{ balance: string }> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId_currency: {userId, currency} } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    return { balance: wallet.balance.toString() };
  }

  async initializeDeposit(userId: string, amount: number) {
    // 1. Fetch user + wallet
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) throw new ForbiddenException('Wallet not found');

    // 2. Create a unique reference
    const reference = `dep_${uuid()}`;

    // 3. Save a pending transaction
    await this.prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        amount,
        reference,
        status: 'PENDING',
        toWalletId: wallet.id,
        initiatedById: userId,
      },
    });

    const email = this.config.get<string>('USER_EMAIL');

    // 4. Call Paystack
    const response = await this.paystack.initializePayment(
      amount,
      email || 'uchenyikesandu@gmail.com',  // Replace with real user email
      reference,
    );

    return {
      authorization_url: response.data.authorization_url,
      reference,
    };
  }
}
