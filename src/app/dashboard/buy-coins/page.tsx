
import { CoinPurchaseForm } from "@/components/billing/CoinPurchaseForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, AlertTriangle } from "lucide-react"; // AlertTriangle might not be needed if Alert is removed
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Alert imports might not be needed

export const dynamic = 'force-dynamic';

export default function BuyCoinsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <CreditCard className="mr-3 h-8 w-8 text-primary" /> Buy Coins
          </h1>
          <p className="text-muted-foreground">Purchase coins to use for deployments and other features.</p>
        </div>
      </div>

      {/* The simulation notice has been removed.
          For a production environment, ensure robust webhook verification is implemented
          in src/lib/actions/billing.ts for Paystack and Flutterwave.
      */}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Select a Coin Package</CardTitle>
          <CardDescription>Choose the number of coins you&apos;d like to purchase.</CardDescription>
        </CardHeader>
        <CardContent>
          <CoinPurchaseForm />
        </CardContent>
      </Card>
    </div>
  );
}

