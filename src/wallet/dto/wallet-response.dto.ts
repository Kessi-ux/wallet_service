// src/wallet/dto/wallet-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceDto {
  @ApiProperty({ example: 15000, description: 'Current wallet balance in kobo' })
  balance: number;

  @ApiProperty({ example: 'NGN', description: 'Currency of the wallet' })
  currency: string;
}

export class DepositStatusDto {
  @ApiProperty({ example: 'dep_123456', description: 'Deposit reference' })
  reference: string;

  @ApiProperty({ example: 'SUCCESS', description: 'Status of the deposit' })
  status: string;

  @ApiProperty({ example: 5000, description: 'Amount deposited' })
  amount: number;
}
