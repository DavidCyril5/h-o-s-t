
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { CoinPurchaseSchema, type CoinPurchaseInput, type CoinPurchasePackage, type SupportedCurrency, type PaymentGateway } from "../../lib/schemas";
import { useToast } from "../../hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Coins, ShoppingCart, Lock } from "lucide-react";
import { usePaystackPayment } from 'react-paystack';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { initiateCoinPurchase, verifyPaymentAndAwardCoins, initiateMiniPayPayment } from "../../lib/actions/billing";
import { getLoggedInUser, type LoggedInUser } from "../../lib/actions/auth";
import { MiniPayForm } from "./MiniPayForm";
import { coinPackages, currencyRatesList, VAT_RATE, minipayPricesUSD } from "../../lib/constants";

const paystackPublicKey = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '').trim();
const flutterwavePublicKey = ("FLWPUBK-2aaf7a67b36476e69ba13f9e46207759-X" || '').trim();

export function CoinPurchaseForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [showMiniPayForm, setShowMiniPayForm] = useState(false);

  useEffect(() => {
    getLoggedInUser().then(user => {
        setCurrentUser(user);
        if (user) {
            form.setValue("email", user.email);
            form.setValue("name", user.name || "");
        }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formDefaultValues = {
      package: "medium_150" as CoinPurchasePackage,
      currency: "NGN" as SupportedCurrency,
      paymentGateway: "paystack" as PaymentGateway,
      email: currentUser?.email || "",
      name: currentUser?.name || "",
      amountInSelectedCurrency: 0,
      amountInNGN: 0,
      coinsToCredit: 0,
  };

  const form = useForm<CoinPurchaseInput>({
    resolver: zodResolver(CoinPurchaseSchema),
    defaultValues: formDefaultValues,
  });

  const selectedPackageId = form.watch("package");
  const selectedCurrencyCode = form.watch("currency");
  const selectedPaymentGateway = form.watch("paymentGateway");

  useEffect(() => {
    if (selectedPaymentGateway === 'minipay') {
      form.setValue('currency', 'USD');
    }
  }, [selectedPaymentGateway, form]);

  const selectedPkg = coinPackages.find(p => p.id === selectedPackageId) || coinPackages.find(p => p.id === formDefaultValues.package)!;
  const selectedCurrInfo = currencyRatesList.find(c => c.code === selectedCurrencyCode) || currencyRatesList.find(c => c.code === formDefaultValues.currency)!;

  let subtotalInSelectedCurrency: number;
  let vatInSelectedCurrency: number;
  let totalInSelectedCurrency: number;

  if (selectedPaymentGateway === 'minipay') {
    totalInSelectedCurrency = minipayPricesUSD[selectedPkg.id as keyof typeof minipayPricesUSD];
    subtotalInSelectedCurrency = totalInSelectedCurrency;
    vatInSelectedCurrency = 0;
  } else {
    subtotalInSelectedCurrency = parseFloat((selectedPkg.priceNGN * selectedCurrInfo.rate).toFixed(2));
    vatInSelectedCurrency = parseFloat((subtotalInSelectedCurrency * VAT_RATE).toFixed(2));
    totalInSelectedCurrency = subtotalInSelectedCurrency + vatInSelectedCurrency;
  }

  useEffect(() => {
    form.setValue("amountInSelectedCurrency", totalInSelectedCurrency);
    form.setValue("amountInNGN", selectedPkg.priceNGN);
    form.setValue("coinsToCredit", selectedPkg.coins);
    if (currentUser) {
      if (!form.getValues("email")) form.setValue("email", currentUser.email);
      if (!form.getValues("name")) form.setValue("name", currentUser.name || "");
    }
  }, [selectedPkg, totalInSelectedCurrency, form, currentUser, selectedCurrencyCode, selectedPaymentGateway]);


  const initialPkgForHook = coinPackages.find(p => p.id === (form.formState.defaultValues?.package || formDefaultValues.package)) || coinPackages[0];
  const initialCurrInfoForHook = currencyRatesList.find(c => c.code === (form.formState.defaultValues?.currency || formDefaultValues.currency)) || currencyRatesList[0];
  const calculatedInitialAmountForHook = parseFloat(((initialPkgForHook.priceNGN * initialCurrInfoForHook.rate) * (1 + VAT_RATE)).toFixed(2));

  const flutterwaveHookInitialConfig = {
      public_key: flutterwavePublicKey, // Uses the trimmed key
      tx_ref: 'init_hook_ref_' + Date.now(),
      amount: calculatedInitialAmountForHook > 0 ? calculatedInitialAmountForHook : 1,
      currency: initialCurrInfoForHook.code,
      payment_options: "card,mobilemoney,ussd",
      customer: {
          email: form.formState.defaultValues?.email || formDefaultValues.email || "customer@example.com",
          name: form.formState.defaultValues?.name || formDefaultValues.name || "Customer Name",
      },
      customizations: {
          title: "Anita Deploy - Coin Purchase",
          description: `Payment for ${initialPkgForHook.coins} coins`,
          logo: "https://placehold.co/100x100.png?text=AD",
      },
  };
  const initiateFlutterwavePayment = useFlutterwave(flutterwaveHookInitialConfig);


  const handlePaymentSuccess = async (response: any, gateway: 'paystack' | 'flutterwave') => {
    const reference = response.reference || response.transaction_id || response.tx_ref;
    console.log(`${gateway} client SDK success response:`, response);
    toast({ title: `${gateway} Payment Submitted`, description: `Ref: ${reference}. Verifying with server...` });

    setIsLoading(true);
    const verificationResult = await verifyPaymentAndAwardCoins(gateway, reference, response);
    toast({
      title: verificationResult.success ? "Purchase Complete!" : "Verification Issue",
      description: verificationResult.message,
      variant: verificationResult.success ? "default" : "destructive",
    });
    if (verificationResult.success) {
      router.refresh();
    }
    setIsLoading(false);
  };

  const handlePaymentClose = (gateway: 'paystack' | 'flutterwave') => {
    console.log(`${gateway} payment modal closed by user.`);
    toast({ title: "Payment Cancelled", description: "The payment process was cancelled.", variant: "default" });
    setIsLoading(false);
  };

  const initializePaystackPayment = usePaystackPayment({
      reference: '',
      email: '',
      amount: 0,
      currency: 'NGN',
      publicKey: paystackPublicKey, // Uses the trimmed key
  });


  async function onSubmit(values: CoinPurchaseInput) {
    setIsLoading(true);

    if (values.paymentGateway === 'paystack' && !paystackPublicKey) {
        toast({title: "Configuration Error", description: "Paystack public key is not set. Please contact support.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    if (values.paymentGateway === 'flutterwave' && !flutterwavePublicKey) {
        toast({title: "Configuration Error", description: "Flutterwave public key is not set or is invalid. Please contact support.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    if (!currentUser) {
      toast({title: "Error", description: "User not loaded. Please refresh and try again.", variant: "destructive"});
      setIsLoading(false);
      return;
    }

    if (values.paymentGateway === 'minipay') {
      const initResult = await initiateMiniPayPayment(values);
      if (initResult.success) {
        setShowMiniPayForm(true);
      } else {
        toast({ title: "Initiation Failed", description: initResult.message || "Could not initiate transaction.", variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }

    const initResult = await initiateCoinPurchase(values);

    if (!initResult.success || !initResult.transactionReference) {
        toast({ title: "Initiation Failed", description: initResult.message || "Could not initiate transaction.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const transactionReference = initResult.transactionReference;

    if (values.paymentGateway === "paystack") {
      initializePaystackPayment({
        onSuccess: (response) => handlePaymentSuccess(response, 'paystack'),
        onClose: () => handlePaymentClose('paystack'),
        config: {
            reference: transactionReference,
            email: values.email,
            amount: values.amountInSelectedCurrency * 100, 
            currency: values.currency,
            publicKey: paystackPublicKey, // Uses the trimmed key
            metadata: {
                userId: currentUser._id,
                packageName: selectedPkg.name,
                coins: selectedPkg.coins,
                transactionType: "coin_purchase",
            }
        }
      });
    } else if (values.paymentGateway === "flutterwave") {
      const finalFlutterwaveConfigForHandler = {
        public_key: flutterwavePublicKey, // Uses the trimmed key
        tx_ref: transactionReference,
        amount: Number(values.amountInSelectedCurrency),
        currency: values.currency,
        payment_options: "card,mobilemoney,ussd",
        customer: {
            email: values.email,
            name: values.name || "Anita Deploy User",
        },
        meta: {
            userId: currentUser._id,
            packageName: selectedPkg.name,
            coins: selectedPkg.coins,
            transactionType: "coin_purchase"
        },
        customizations: {
            title: "Anita Deploy - Coin Purchase",
            description: `Payment for ${selectedPkg.coins} coins for ${selectedPkg.name}`,
            logo: "https://placehold.co/100x100.png?text=AD",
        }
      };
      initiateFlutterwavePayment({
        ...finalFlutterwaveConfigForHandler,
        callback: (response) => {
          handlePaymentSuccess(response, 'flutterwave');
          closePaymentModal();
        },
        onClose: () => handlePaymentClose('flutterwave'),
      });
    }
  }

  if (showMiniPayForm) {
    return <MiniPayForm coinPurchase={form.getValues()} />;
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        <FormField
          control={form.control}
          name="package"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-lg font-semibold">1. Select Coin Package</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {coinPackages.map((pkg) => {
                    const priceToDisplay = () => {
                        if (selectedPaymentGateway === 'minipay') {
                            return `$${minipayPricesUSD[pkg.id as keyof typeof minipayPricesUSD].toFixed(2)}`;
                        }
                        const currencyInfo = currencyRatesList.find(c => c.code === selectedCurrencyCode) || currencyRatesList.find(c => c.code === 'NGN')!;
                        const price = pkg.priceNGN * currencyInfo.rate;
                        return `${currencyInfo.symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    };

                    return (
                        <FormItem key={pkg.id} className="flex-1">
                        <FormControl>
                            <RadioGroupItem value={pkg.id} id={pkg.id} className="sr-only" />
                        </FormControl>
                        <Label
                            htmlFor={pkg.id}
                            className={`flex flex-col items-center justify-between rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all
                            ${field.value === pkg.id ? "border-primary ring-2 ring-primary shadow-lg" : "border-muted"}`}
                        >
                            <div className="flex items-center text-xl font-semibold mb-2">
                            <Coins className="mr-2 h-6 w-6 text-yellow-500" /> {pkg.coins} Coins
                            </div>
                            <p className="text-sm font-bold text-primary">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                            <p className="text-lg font-semibold mt-3 text-foreground">
                                {priceToDisplay()}
                            </p>
                        </Label>
                        </FormItem>
                    );
                })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">2. Select Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={selectedPaymentGateway === 'minipay'}>
                <FormControl>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencyRatesList.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.name} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The price will be converted to your selected currency.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card className="bg-secondary/50 shadow-md">
            <CardHeader>
                <CardTitle className="text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-md">
                    <span className="font-medium text-muted-foreground">Package:</span>
                    <span>{selectedPkg.name} ({selectedPkg.coins} Coins)</span>
                </div>
                <div className="flex justify-between items-center text-md">
                    <span className="font-medium text-muted-foreground">Subtotal:</span>
                    <span>{selectedCurrInfo.symbol}{subtotalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                 <div className="flex justify-between items-center text-md">
                    <span className="font-medium text-muted-foreground">VAT (7.5%):</span>
                    <span>{selectedCurrInfo.symbol}{vatInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="text-2xl font-bold text-primary pt-2 border-t mt-2">
                    <span className="font-medium text-muted-foreground">Total:</span> {selectedCurrInfo.symbol}
                    {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     <span className="text-sm font-normal text-muted-foreground ml-1"> ({selectedCurrencyCode})</span>
                </p>
                {selectedCurrencyCode !== 'NGN' && selectedPaymentGateway !== 'minipay' && (
                    <p className="text-sm text-muted-foreground">
                        (Approx. {currencyRatesList.find(c => c.code === 'NGN')?.symbol}
                        {selectedPkg.priceNGN.toLocaleString()} NGN before VAT)
                    </p>
                )}
            </CardContent>
        </Card>


        <FormField
          control={form.control}
          name="paymentGateway"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-lg font-semibold">3. Select Payment Gateway</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <FormItem className="flex-1">
                    <FormControl>
                      <RadioGroupItem value="paystack" id="paystack" className="sr-only" />
                    </FormControl>
                    <Label htmlFor="paystack" className={`flex items-center justify-center rounded-lg border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === "paystack" ? "border-primary ring-2 ring-primary" : "border-muted"}`}>
                      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQApU1W4AukdeecItSYUAnaupxpTxdmevCRPg&s" alt="Paystack" className="h-7" data-ai-hint="paystack logo"/>
                    </Label>
                  </FormItem>
                  <FormItem className="flex-1">
                    <FormControl>
                      <RadioGroupItem value="flutterwave" id="flutterwave" className="sr-only" />
                    </FormControl>
                    <Label htmlFor="flutterwave" className={`flex items-center justify-center rounded-lg border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === "flutterwave" ? "border-primary ring-2 ring-primary" : "border-muted"}`}>
                       <img src="https://flutterwave.com/images/logo/full.svg" alt="Flutterwave" className="h-7" data-ai-hint="flutterwave logo"/>
                    </Label>
                  </FormItem>
                  <FormItem className="flex-1">
                    <FormControl>
                      <RadioGroupItem value="minipay" id="minipay" className="sr-only" />
                    </FormControl>
                    <Label htmlFor="minipay" className={`flex items-center justify-center rounded-lg border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === "minipay" ? "border-primary ring-2 ring-primary" : "border-muted"}`}>
                       <img src="https://play-lh.googleusercontent.com/zrpEYl52Hp_6KeOlLtJhw5JkfWBAwo4iAFhFUl8w22ty5pMpOPbBIowxzFaEuuVDGkc=w240-h480-rw" alt="MiniPay" className="h-7"/>
                    </Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <Button type="submit" size="lg" className="w-full text-base py-6" disabled={isLoading || !currentUser}>
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          {currentUser ? 'Proceed to Payment' : 'Loading User...'}
        </Button>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center">
            <Lock className="h-3 w-3 mr-1.5"/> Secure payment processing.
        </p>
      </form>
    </Form>
  );
}
