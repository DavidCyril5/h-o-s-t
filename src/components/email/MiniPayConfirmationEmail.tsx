
import React from 'react';
import { Button } from '../ui/button';
import { CoinPurchaseInput } from '../../lib/schemas';

interface MiniPayConfirmationEmailProps {
  transactionId: string;
  screenshotUrl: string;
  coinPurchase: CoinPurchaseInput;
}

export function MiniPayConfirmationEmail({ transactionId, screenshotUrl, coinPurchase }: MiniPayConfirmationEmailProps) {
  const approveUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/minipay/approve?transactionId=${transactionId}`;
  const declineUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/minipay/decline?transactionId=${transactionId}`;

  return (
    <div>
      <h1>New MiniPay Payment for Approval</h1>
      <p>A new payment has been submitted via MiniPay and requires your approval.</p>
      <h2>Payment Details:</h2>
      <ul>
        <li><strong>Transaction ID:</strong> {transactionId}</li>
        <li><strong>User:</strong> {coinPurchase.email}</li>
        <li><strong>Package:</strong> {coinPurchase.package}</li>
        <li><strong>Coins:</strong> {coinPurchase.coinsToCredit}</li>
        <li><strong>Amount:</strong> {coinPurchase.amountInSelectedCurrency} {coinPurchase.currency}</li>
      </ul>
      <h2>Payment Screenshot:</h2>
      <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">View Screenshot</a>
      <br />
      <br />
      <a href={approveUrl}>
        <Button>Approve</Button>
      </a>
      <a href={declineUrl}>
        <Button variant="destructive">Decline</Button>
      </a>
    </div>
  );
}
