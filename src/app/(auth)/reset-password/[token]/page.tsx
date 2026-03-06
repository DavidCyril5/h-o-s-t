
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { KeyRound, AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/types";
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/actions/auth";

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

async function validateToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");
    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    return !!user;
  } catch (error) {
    console.error("Error validating reset token:", error);
    return false;
  }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = params;
  
  const loggedInUser = await getLoggedInUser();
  if (loggedInUser) {
    redirect("/dashboard");
  }

  const isTokenValid = await validateToken(token);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl hover:shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
            <span className="ml-2 text-2xl font-semibold text-foreground">Anita Deploy</span>
          </Link>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTokenValid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Invalid or Expired Link</AlertTitle>
              <AlertDescription>
                This password reset link is invalid or has expired. Please{" "}
                <Link href="/forgot-password" className="font-medium underline hover:text-destructive/80">
                  request a new one
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
