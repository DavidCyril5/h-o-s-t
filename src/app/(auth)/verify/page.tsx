
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerificationCodeForm } from "@/components/auth/VerificationCodeForm";
import { Suspense } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl hover:shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <MailCheck className="h-8 w-8 text-primary" />
            <span className="ml-2 text-2xl font-semibold text-foreground">
              Anita Deploy
            </span>
          </Link>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent a verification code to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center">Loading form...</div>}>
            <VerificationCodeForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
