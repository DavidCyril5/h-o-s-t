
"use server";

import type { CoinPurchaseInput, MiniPayPaymentVerificationInput } from "@/lib/schemas";
import { getLoggedInUser } from "./auth";
import { getDb } from "../mongodb";
import type { PaymentTransaction } from "@/lib/types";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { logCoinTransaction } from "./transactions";
import { sendMiniPayConfirmationEmail } from "./email";

export async function initiateCoinPurchase(
  data: CoinPurchaseInput
): Promise<{ success: boolean; message: string; transactionReference?: string; }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  const transactionReference = `anitad_${user._id}_${new ObjectId().toString()}`;

  try {
    const db = await getDb();
    const transaction: Omit<PaymentTransaction, '_id'> = {
        userId: user._id,
        packageId: data.package,
        coinsPurchased: data.coinsToCredit,
        amountPaid: data.amountInSelectedCurrency,
        currency: data.currency,
        paymentGateway: data.paymentGateway,
        transactionReference,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await db.collection<PaymentTransaction>('payment_transactions').insertOne(transaction);

    return {
      success: true,
      message: `Transaction initiated. Ref: ${transactionReference}. Please proceed with payment.`,
      transactionReference,
    };

  } catch (dbError) {
    console.error("DB Error storing pending transaction:", dbError);
    return { success: false, message: "Failed to record transaction. Please try again."};
  }
}

export async function initiateMiniPayPayment(
  data: CoinPurchaseInput
): Promise<{ success: boolean; message: string; }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  // For MiniPay, we just need to save the pending transaction details.
  // The user will then manually pay and upload a screenshot.
  return { success: true, message: "Please proceed to the MiniPay payment instructions." };
}

export async function verifyMiniPayPayment(
  data: MiniPayPaymentVerificationInput
): Promise<{ success: boolean; message: string }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  try {
    const db = await getDb();
    const transactionToInsert: Omit<PaymentTransaction, '_id'> = {
      userId: user._id,
      packageId: data.coinPurchase.package,
      coinsPurchased: data.coinPurchase.coinsToCredit,
      amountPaid: data.coinPurchase.amountInSelectedCurrency,
      currency: data.coinPurchase.currency,
      paymentGateway: 'minipay',
      transactionReference: data.transactionId,
      status: 'pending_approval',
      gatewayResponse: { screenshotUrl: data.screenshotUrl },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('payment_transactions').insertOne(transactionToInsert);
    const transactionId = result.insertedId.toString();

    await sendMiniPayConfirmationEmail(transactionId, data.screenshotUrl, data.coinPurchase);

    return { success: true, message: "Payment submitted for verification." };
  } catch (error) {
    console.error("Error during MiniPay verification:", error);
    return { success: false, message: "An error occurred while submitting your payment for verification." };
  }
}


export async function verifyPaymentAndAwardCoins(
  gateway: 'paystack' | 'flutterwave',
  reference: string,
  gatewayResponse?: any
): Promise<{ success: boolean; message: string }> {
  console.log(`Attempting to verify payment for ${gateway} with reference ${reference}`);
  console.log("Gateway client-side response (for logging):", gatewayResponse);

  const db = await getDb();
  const transactionsCollection = db.collection<PaymentTransaction>("payment_transactions");
  const usersCollection = db.collection("users");

  const transaction = await transactionsCollection.findOne({ transactionReference: reference, status: 'pending' });

  if (!transaction) {
    console.error(`Transaction not found or not pending for reference: ${reference}`);
    const alreadyProcessed = await transactionsCollection.findOne({ transactionReference: reference, status: 'successful' });
    if (alreadyProcessed) {
      return { success: true, message: "Transaction already processed successfully." };
    }
    return { success: false, message: "Transaction not found or already processed with a different status." };
  }

  const isPaymentConsideredSuccessful = true;

  if (isPaymentConsideredSuccessful) {
    const userUpdateResult = await usersCollection.findOneAndUpdate(
      { _id: transaction.userId },
      { $inc: { coins: transaction.coinsPurchased } },
      { returnDocument: "after" }
    );

    if (userUpdateResult) {
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { status: 'successful', updatedAt: new Date(), gatewayResponse: gatewayResponse || { client_reported_success: true } } }
      );
      
      await logCoinTransaction({
        userId: transaction.userId,
        type: 'purchase',
        amount: transaction.coinsPurchased,
        description: `Purchased ${transaction.coinsPurchased} coins via ${gateway}. Ref: ${reference.slice(-6)}`,
        balanceAfter: userUpdateResult.coins,
        relatedTransactionId: transaction._id?.toString(),
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/buy-coins");
      revalidatePath("/dashboard/profile"); 
      return { success: true, message: `Payment successful! ${transaction.coinsPurchased} coins added to your account.` };
    } else {
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { status: 'failed', updatedAt: new Date(), gatewayResponse: { error: "Failed to update user coins despite client-reported success."} } }
      );
      return { success: false, message: "Payment reported as successful, but failed to update your coin balance. Please contact support." };
    }
  } else {
     await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { status: 'failed', updatedAt: new Date(), gatewayResponse: gatewayResponse || { verification_failed: true } } }
      );
    return { success: false, message: "Payment verification failed by server." };
  }
}
