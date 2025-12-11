import { ApiProperty } from '@nestjs/swagger';

export class TransactionHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  fromWalletId?: string;

  @ApiProperty()
  toWalletId?: string;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ type: [TransactionHistoryItemDto] })
  transactions: TransactionHistoryItemDto[];
}
