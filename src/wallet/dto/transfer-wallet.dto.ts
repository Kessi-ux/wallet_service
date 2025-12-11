// src/wallet/dto/transfer-wallet.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsUUID, 
  IsNumber, 
  IsPositive, 
  IsOptional 
} from 'class-validator';

export class WalletTransferDto {
  @ApiProperty({ example: 'user-uuid-123', description: 'Receiver user ID' })
  @IsString()
  @IsUUID()
  toUserId: string;

  @ApiProperty({ example: 5000, description: 'Amount to transfer in kobo' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'NGN', description: 'Currency of transfer' })
  @IsOptional()
  @IsString()
  currency: string;
}

export class WalletTransferResponseDto {
  @ApiProperty({ example: 'SUCCESS', description: 'Transaction status' })
  status: string;

  @ApiProperty({ example: 'tx_ref_123', description: 'Transaction reference' })
  reference: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 'user-a-uuid' })
  fromUserId: string;

  @ApiProperty({ example: 'user-b-uuid' })
  toUserId: string;
}
