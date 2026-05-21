import { PaymentMethod } from '../../../../generated/prisma/client';

export class CreatePaymentDto {
  entries: {
    method: PaymentMethod;
    amount: number;
    change?: number;
  }[];
}
