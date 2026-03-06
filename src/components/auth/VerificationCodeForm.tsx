
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { verifyCodeAndLogin } from "@/lib/actions/auth";
import { resendVerificationCode } from "@/lib/actions/resend-verification-code";
import { VerificationCodeSchema } from "@/lib/schemas";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerificationCodeForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const [isResendPending, startResendTransition] = useTransition();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const form = useForm<z.infer<typeof VerificationCodeSchema>>({
    resolver: zodResolver(VerificationCodeSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: z.infer<typeof VerificationCodeSchema>) {
    if (!email) {
      setError("Email not found in URL.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyCodeAndLogin({ ...values, email });
      if (result && !result.success) {
        setError(result.message);
      }
    });
  }

  async function handleResendCode() {
    if (!email) {
      setError("Email not found in URL.");
      return;
    }
    setError(null);
    startResendTransition(async () => {
      const result = await resendVerificationCode(email);
      if (result && !result.success) {
        setError(result.message);
        if (result.remainingCooldown) {
          setCooldown(result.remainingCooldown);
        }
      } else {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="1234" disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Verifying..." : "Verify and Login"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full mt-4"
          onClick={handleResendCode}
          disabled={isResendPending || cooldown > 0}
        >
          {isResendPending
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend Code"}
        </Button>
      </form>
    </Form>
  );
}
