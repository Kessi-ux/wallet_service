// src/wallet/dto/paystack-webhook.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaystackWebhookDto {
  @ApiProperty()
  event: string;

  @ApiProperty()
  data: any;
}
