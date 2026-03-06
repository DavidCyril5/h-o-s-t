
'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { type CoinPurchaseInput } from '../../lib/schemas';
import { verifyMiniPayPayment } from '../../lib/actions/billing';
import { Loader2, Coins } from 'lucide-react';
import { coinPackages } from '../../lib/constants';

interface MiniPayFormProps {
  coinPurchase: CoinPurchaseInput;
}

export function MiniPayForm({ coinPurchase }: MiniPayFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  
  const selectedPkg = coinPackages.find(p => p.id === coinPurchase.package)!;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setScreenshotFile(event.target.files[0]);
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!screenshotFile) {
      toast({ title: 'Error', description: 'Please upload a screenshot of your payment.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', screenshotFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload screenshot.');
      }

      const uploadResult = await uploadResponse.json();
      const screenshotUrl = uploadResult.url;

      if (!screenshotUrl) {
        throw new Error('Screenshot URL not returned from server.');
      }

      const verificationData = {
        transactionId: `minipay-${Date.now()}`,
        screenshotUrl: screenshotUrl,
        coinPurchase,
      };

      const result = await verifyMiniPayPayment(verificationData);

      if (result.success) {
        toast({ title: 'Payment Submitted', description: 'Your payment is pending confirmation. You will be notified once it is approved.' });
        setIsPaid(true);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay with MiniPay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-card p-4 flex flex-col items-center space-y-2 text-center">
            <div className="flex items-center text-2xl font-bold mb-2">
                <Coins className="mr-2 h-8 w-8 text-yellow-500" /> 
                You are purchasing the <span className='text-primary mx-1'>{selectedPkg.name}</span> for {selectedPkg.coins} Coins
            </div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold">How to pay with MiniPay:</h3>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Download the MiniPay app from the Google Play Store.</li>
            <li>Register and verify your account with your phone number.</li>
            <li>Fund your MiniPay wallet.</li>
            <li>
              Send the exact amount of <span className="font-bold text-primary">${coinPurchase.amountInSelectedCurrency.toFixed(2)} USD</span> to the following phone number: <span className="font-semibold">+2349066528353</span>.
            </li>
            <li>Take a screenshot of the payment confirmation.</li>
          </ol>
        </div>

        <a href="https://play.google.com/store/apps/details?id=com.opera.minipay" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full">Download from Play Store</Button>
        </a>

        {!isPaid ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="screenshot">Upload Screenshot</Label>
              <Input id="screenshot" type="file" accept="image/*" onChange={handleFileChange} />
            </div>

            <Button onClick={handlePaymentConfirmation} disabled={isLoading || !screenshotFile} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              I have Paid
            </Button>
          </div>
        ) : (
          <div className="text-center text-green-600 font-semibold">
            Your transaction is pending approval. You will be notified shortly.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
