
import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { logCoinTransaction } from '../../../../lib/actions/transactions';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest, { params }: { params: { action: string } }) {
  const { action } = params;
  const transactionId = request.nextUrl.searchParams.get('transactionId');

  if (!transactionId) {
    return new NextResponse('Missing transactionId', { status: 400 });
  }

  const db = await getDb();
  const transactionsCollection = db.collection('payment_transactions');
  const usersCollection = db.collection('users');

  const transaction = await transactionsCollection.findOne({ _id: new ObjectId(transactionId) });

  if (!transaction) {
    return new NextResponse('Transaction not found', { status: 404 });
  }

  if (action === 'approve') {
    if (transaction.status === 'successful') {
      return new NextResponse('Transaction already approved', { status: 200 });
    }

    const userUpdateResult = await usersCollection.findOneAndUpdate(
      { _id: transaction.userId },
      { $inc: { coins: transaction.coinsPurchased } },
      { returnDocument: 'after' }
    );

    if (userUpdateResult) {
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { status: 'successful', updatedAt: new Date() } }
      );

      await logCoinTransaction({
        userId: transaction.userId,
        type: 'purchase',
        amount: transaction.coinsPurchased,
        description: `Purchased ${transaction.coinsPurchased} coins via MiniPay. Ref: ${transactionId}`,
        balanceAfter: userUpdateResult.coins,
        relatedTransactionId: transaction._id?.toString(),
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/buy-coins");
      revalidatePath("/dashboard/profile");

      return new NextResponse('Transaction approved and coins awarded', { status: 200 });
    } else {
      return new NextResponse('Failed to award coins', { status: 500 });
    }
  } else if (action === 'decline') {
    await transactionsCollection.updateOne(
      { _id: transaction._id },
      { $set: { status: 'declined', updatedAt: new Date() } }
    );

    // You might want to send an email to the user here to inform them of the declination.

    return new NextResponse('Transaction declined', { status: 200 });
  } else {
    return new NextResponse('Invalid action', { status: 400 });
  }
}
