
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Zap } from "lucide-react";

export default async function RegisterPage() {
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
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Join Anita Deploy to start deploying your bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
