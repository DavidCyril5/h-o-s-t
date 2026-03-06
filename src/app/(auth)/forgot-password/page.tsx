
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Zap, KeyRound } from "lucide-react";
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const user = await getLoggedInUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl hover:shadow-2xl">
        <CardHeader className="text-center">
           <Link href="/" className="inline-flex items-center justify-center mb-4">
             <KeyRound className="h-8 w-8 text-primary" />
             <span className="ml-2 text-2xl font-semibold text-foreground">Anita Deploy</span>
           </Link>
          <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
          <CardDescription>
            No problem. Enter your email address below and we&apos;ll send you a link to reset it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
