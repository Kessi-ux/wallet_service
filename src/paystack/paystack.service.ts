import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaystackService {
  constructor(private http: HttpService) {}

  async initializePayment(amount: number, email: string, reference: string) {
    try {
      const payload = {
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        reference,
      };

      const request = this.http.post(
        `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await firstValueFrom(request);
      return response.data;
    } catch (e) {
      throw new HttpException(
        e.response?.data || 'Paystack error',
        e.response?.status || 500,
      );
    }
  }
}
