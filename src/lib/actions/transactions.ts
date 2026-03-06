
"use server";

import { getDb } from "../mongodb";
import type { CoinTransaction, CoinTransactionType } from "../types";
import { ObjectId } from "mongodb";

interface LogCoinTransactionDetails {
  userId: string;
  type: CoinTransactionType;
  amount: number; // Positive for credit, negative for debit
  description: string;
  balanceAfter: number;
  relatedTransactionId?: string;
  relatedUserId?: string;
}

export async function logCoinTransaction(details: LogCoinTransactionDetails): Promise<void> {
  try {
    const db = await getDb();
    const coinTransactionsCollection = db.collection<Omit<CoinTransaction, '_id'>>("coinTransactions");

    const transactionLog: Omit<CoinTransaction, '_id'> = {
      userId: details.userId,
      type: details.type,
      amount: details.amount,
      description: details.description,
      balanceAfter: details.balanceAfter,
      relatedTransactionId: details.relatedTransactionId,
      relatedUserId: details.relatedUserId,
      timestamp: new Date(),
    };

    await coinTransactionsCollection.insertOne(transactionLog);
  } catch (error) {
    console.error("Error logging coin transaction:", error, "Details:", details);
    // Depending on severity, you might want to re-throw or handle more gracefully
  }
}

export async function getCoinTransactionHistoryForUser(userId: string): Promise<CoinTransaction[]> {
  try {
    const db = await getDb();
    const transactions = await db.collection<CoinTransaction>("coinTransactions")
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(100) // Add pagination later if needed
      .toArray();
    return transactions.map(t => ({ ...t, _id: t._id.toString() }));
  } catch (error) {
    console.error(`Error fetching coin transaction history for user ${userId}:`, error);
    return [];
  }
}
