
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default async function AdminLoginPage() {
  const user = await getLoggedInUser();
  if (user && user.role === 'admin') {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <Link href="/" className="inline-flex items-center justify-center mb-4">
             <ShieldAlert className="h-8 w-8 text-primary" />
             <span className="ml-2 text-2xl font-semibold text-foreground">Admin Panel</span>
           </Link>
          <CardTitle className="text-2xl">Administrator Access</CardTitle>
          <CardDescription>Enter your admin credentials to manage the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
           <p className="mt-6 text-center text-sm text-muted-foreground">
            This area is for authorized personnel only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
