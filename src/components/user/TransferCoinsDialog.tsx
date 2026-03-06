
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransferCoinsSchema, type TransferCoinsInput } from "@/lib/schemas";
import { transferCoins } from "@/lib/actions/user";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Coins } from "lucide-react";

interface TransferCoinsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserCoins: number;
  onTransferSuccess: (newBalance: number) => void;
}

export function TransferCoinsDialog({
  isOpen,
  onOpenChange,
  currentUserCoins,
  onTransferSuccess,
}: TransferCoinsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TransferCoinsInput>({
    resolver: zodResolver(TransferCoinsSchema),
    defaultValues: {
      recipientEmail: "",
      amount: 0,
    },
  });

  async function onSubmit(values: TransferCoinsInput) {
    setIsLoading(true);
    try {
      const result = await transferCoins(values);
      toast({
        title: result.success ? "Transfer Successful!" : "Transfer Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success && result.newSenderBalance !== undefined) {
        onTransferSuccess(result.newSenderBalance);
        form.reset();
        onOpenChange(false); // Close dialog on success
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) { // Prevent closing while submitting
        onOpenChange(open);
        if (!open) form.reset(); // Reset form if dialog is closed
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="mr-2 h-5 w-5 text-primary" />
            Transfer Coins
          </DialogTitle>
          <DialogDescription>
            Send coins to another user. Make sure the recipient's email is correct.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="flex items-center text-sm text-muted-foreground mb-4 p-2 bg-secondary/50 rounded-md">
            <Coins className="mr-2 h-4 w-4 text-yellow-500" />
            Your current balance:
            <span className="font-semibold text-foreground ml-1">{currentUserCoins.toLocaleString()} Coins</span>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient's Email</FormLabel>
                    <FormControl>
                      <Input placeholder="recipient@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount to Transfer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormControl>
                     <FormDescription>
                       Enter a whole number of coins to transfer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || form.getValues("amount") <=0}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Coins
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
