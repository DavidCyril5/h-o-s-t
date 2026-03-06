
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VerifyAdminPasswordSchema, type VerifyAdminPasswordInput } from "@/lib/schemas";
import { verifyAdminPasswordAgain } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";

interface AdminVerifyPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function AdminVerifyPasswordDialog({ isOpen, onOpenChange, onSuccess }: AdminVerifyPasswordDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<VerifyAdminPasswordInput>({
    resolver: zodResolver(VerifyAdminPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  async function onSubmit(values: VerifyAdminPasswordInput) {
    setIsLoading(true);
    try {
      const result = await verifyAdminPasswordAgain(values);
      if (result.success) {
        toast({ title: "Session Verified", description: result.message });
        onSuccess();
        onOpenChange(false); // Close dialog on success
      } else {
        toast({ title: "Verification Failed", description: result.message, variant: "destructive" });
        form.resetField("password"); // Clear password field on failure
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
            Verify Admin Session
          </DialogTitle>
          <DialogDescription>
            For security, please re-enter your password to continue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                   <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Verify Password
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
