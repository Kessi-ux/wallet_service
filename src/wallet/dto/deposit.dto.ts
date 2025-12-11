import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: 5000, description: 'Amount to deposit in naira' })
  @IsNumber()
  @Min(1)
  amount: number;
}
