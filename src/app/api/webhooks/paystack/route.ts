
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import type { User } from "@/lib/types";
import { ObjectId } from 'mongodb';
import { logCoinTransaction } from '@/lib/actions/transactions';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  if (!PAYSTACK_SECRET_KEY) {
    console.error("Paystack secret key is not set.");
    return new NextResponse('Configuration error', { status: 500 });
  }

  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    console.warn("Invalid Paystack signature received.");
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const { metadata, amount, reference, currency } = event.data;
    const { userId, coins, packageName } = metadata;

    if (!userId || !coins) {
      console.error("Webhook metadata is missing userId or coins.", metadata);
      return new NextResponse('Webhook metadata is missing userId or coins', { status: 400 });
    }

    try {
      const db = await getDb();
      const usersCollection = db.collection<User>("users");
      
      const transactionExists = await db.collection('coin_transactions').findOne({ reference: reference });

      if (transactionExists) {
        console.log(`Transaction with reference ${reference} has already been processed.`);
        return new NextResponse('Transaction already processed', { status: 200 });
      }
      
      const userObjectId = new ObjectId(userId);

      const user = await usersCollection.findOne({ _id: userObjectId });

      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        return new NextResponse('User not found', { status: 404 });
      }

      const coinsToCredit = parseInt(coins, 10);

      const updateResult = await usersCollection.findOneAndUpdate(
        { _id: userObjectId },
        { $inc: { coins: coinsToCredit } },
        { returnDocument: "after" }
      );
      
      if (!updateResult) {
          throw new Error(`Failed to update coin balance for user ${userId}.`);
      }

      await logCoinTransaction({
          userId: userObjectId.toHexString(),
          type: "coin_purchase",
          amount: coinsToCredit,
          description: `Purchased ${coinsToCredit} coins (${packageName}).`,
          balanceAfter: updateResult.coins,
          reference: reference,
          paymentGateway: 'paystack',
          currency: currency,
          amountPaid: amount / 100
      });

      console.log(`Successfully credited ${coinsToCredit} coins to user ${userId}. New balance: ${updateResult.coins}`);
      
    } catch (error) {
      console.error('Error processing Paystack webhook:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  return new NextResponse('Webhook received', { status: 200 });
}
