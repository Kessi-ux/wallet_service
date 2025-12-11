import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '@prisma/client';
import { PaystackService } from '../paystack/paystack.service';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { WalletBalanceDto, DepositStatusDto } from './dto/wallet-response.dto';
import { WalletTransferDto } from './dto/transfer-wallet.dto';

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
  async getBalance(userId: string, currency = 'NGN'): Promise<WalletBalanceDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId_currency: {userId, currency:'NGN'} }, });
    if (!wallet) throw new NotFoundException('Wallet not found');
    //return { balance: wallet.balance.toString() };
     return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
    };
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

  async handlePaystackWebhook(
    body: any,
    signature: string,
    paystackSecret: string
  ) {

    // 1. Validate Paystack signature
    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    const { event, data } = body;

    // Only process charge.success
    if (event !== 'charge.success') {
      return { status: 'ignored' };
    }

    const reference = data.reference;

    // 2. Idempotency check
    const existing = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (existing) {
      return { status: 'already_processed' };
    }

      // 3️⃣ Find the user by Paystack customer email
  const user = await this.prisma.user.findUnique({
    where: { email: data.customer.email }, // <--- edit: fetch user first
  });

  if (!user) {
    throw new BadRequestException('User not found for Paystack customer'); // <--- edit: handle missing user
  }

    // 3. Update wallet & transaction
    let userWallet = await this.prisma.wallet.findUnique({
      where: { userId_currency: { userId: String(data.customer.id), currency: 'NGN' } }, // adjust according to your schema
    });

    if (!userWallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Atomic transaction
    await this.prisma.$transaction(async (prisma) => {
      // Credit wallet
      await prisma.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { increment: data.amount / 100 } }, // Paystack sends amount in kobo
      });

      // Save transaction
      await prisma.transaction.create({
        data: {
          toWalletId: userWallet.id,
          type: 'DEPOSIT',
          status: 'SUCCESS',
          amount: body.data.amount,
          reference: reference,
          metadata: { source: 'Paystack' },
          initiatedById: null,
        },
      });
    });

    return { status: 'success' };
  }

  async verifyDeposit(trxref: string) {
    const secret = process.env.PAYSTACK_SECRET;
    const url = `https://api.paystack.co/transaction/verify/${trxref}`;

    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${secret}` },
      });

      if (res.data.status && res.data.data.status === 'success') {
        // Here you can credit the user's wallet if you want, or just return success
        return 'success';
      }
      return 'failed';
    } catch (err) {
      console.error('Error verifying deposit:', err);
      return 'failed';
    }
  }

  async verifyPaystackTransaction(reference: string) {
    const paystackSecret = process.env.PAYSTACK_SECRET;
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET not set');

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      const { data } = response.data;

      // Just return info; DO NOT credit wallet
      return {
        status: data.status,
        reference: data.reference,
        amount: data.amount,
        paid_at: data.paid_at,
        currency: data.currency,
        customer_email: data.customer?.email,
        gateway_response: data.gateway_response,
      };
    } catch (error) {
      throw new BadRequestException('Transaction verification failed: ' + error.response?.data?.message || error.message);
    }
  }

  async getDepositStatus(reference: string): Promise<DepositStatusDto> {
    const txn = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!txn) {
      throw new NotFoundException('Deposit not found');
    }

    return {
      reference: txn.reference,
      status: txn.status,
      amount: Number(txn.amount),
    };
  }

  async transferFunds(fromUserId: string, body: WalletTransferDto) {
    const { toUserId, amount, currency } = body;

    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Atomic transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Find sender wallet
      const senderWallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: fromUserId, currency } },
      });

      if (!senderWallet) throw new NotFoundException('Sender wallet not found');
      if (senderWallet.balance < amount)
        throw new BadRequestException('Insufficient balance');

      // Find receiver wallet
      const receiverWallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: toUserId, currency } },
      });

      if (!receiverWallet) throw new NotFoundException('Receiver wallet not found');

      // Debit sender
      await prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      // Credit receiver
      await prisma.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          reference: randomUUID(),
          type: 'TRANSFER',
          status: 'SUCCESS',
          amount,
          fromWalletId: senderWallet.id,
          toWalletId: receiverWallet.id,
          metadata: { note: 'User-to-user transfer' },
          initiatedById: fromUserId,
        },
      });

      return {
        status: transaction.status,
        reference: transaction.reference,
      };
    });

    return result;
  }

  async getUserTransactions(userId: string) {
  // get all wallet IDs owned by the user
  const wallets = await this.prisma.wallet.findMany({
    where: { userId },
    select: { id: true }
  });

    const walletIds = wallets.map(w => w.id);

  // fetch all transactions where wallet participates
  return (await this.prisma.transaction.findMany({
    where: {
      OR: [
        { fromWalletId: { in: walletIds } },
        { toWalletId: { in: walletIds } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  })).map(tx => ({
    ...tx,
    amount: Number(tx.amount),
  }));
  }
}