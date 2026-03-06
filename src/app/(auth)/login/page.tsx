
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Zap } from "lucide-react";

export default async function LoginPage() {
  const user = await getLoggedInUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl hover:shadow-2xl">
        <CardHeader className="text-center">
           <Link href="/" className="inline-flex items-center justify-center mb-4">
             <Zap className="h-8 w-8 text-primary" />
             <span className="ml-2 text-2xl font-semibold text-foreground">Anita Deploy</span>
           </Link>
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
