import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

const ALLOWED_EXPIRIES = ['1H', '1D', '1M', '1Y'] as const;

export class CreateKeyDto {
  @ApiProperty({ example: 'wallet-service', description: 'Name for the API key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['deposit', 'transfer', 'read'], description: 'Permissions explicitly assigned' })
  @IsArray()
  permissions: string[];

  @ApiProperty({ example: '1D', description: 'Expiry: one of 1H, 1D, 1M, 1Y' })
  @IsString()
  @IsIn(ALLOWED_EXPIRIES as unknown as string[])
  expiry: '1H' | '1D' | '1M' | '1Y';
}
