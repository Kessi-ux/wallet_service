import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

const ALLOWED_EXPIRIES = ['1H', '1D', '1M', '1Y'] as const;

export class RolloverKeyDto {
  @ApiProperty({ example: 'FGH2485K6KK79GKG9GKGK', description: 'Expired api key id' })
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @ApiProperty({ example: '1M', description: 'New expiry for the rolled-over key' })
  @IsString()
  @IsIn(ALLOWED_EXPIRIES as unknown as string[])
  expiry: '1H' | '1D' | '1M' | '1Y';
}
