
import { ReactNode } from "react";
import Link from "next/link";
import { Shield, LogOut, Settings, Users, LayoutDashboardIcon, BarChart3, Megaphone } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getLoggedInUser();

  // Middleware should have already redirected non-logged-in users.
  // This is the final, definitive check for the user's role.
  if (!user) {
    redirect('/login'); // Should be unreachable if middleware is correct, but safe to have.
  }
  
  if (user.role !== 'admin') {
    redirect('/dashboard'); // If a regular user tries to access /admin, send them to their dashboard.
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-card border-r p-6 flex flex-col">
        <Link href="/admin/dashboard" className="flex items-center mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-semibold text-foreground">Admin Panel</span>
        </Link>
        <nav className="flex flex-col space-y-2 flex-1">
          <Button variant="ghost" className="justify-start" asChild>
            <Link href="/admin/dashboard"><LayoutDashboardIcon className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
           <Button variant="ghost" className="justify-start" asChild>
            <Link href="/admin/stats"><BarChart3 className="mr-2 h-4 w-4" /> Statistics</Link>
          </Button>
          <Button variant="ghost" className="justify-start" asChild>
            <Link href="/admin/dashboard"><Users className="mr-2 h-4 w-4" /> User Management</Link>
          </Button>
           <Button variant="ghost" className="justify-start" asChild>
            <Link href="/admin/announcements"><Megaphone className="mr-2 h-4 w-4" /> Announcements</Link>
          </Button>
          <Button variant="ghost" className="justify-start text-muted-foreground" disabled>
            <Settings className="mr-2 h-4 w-4" /> Site Settings
          </Button>
        </nav>
        <div className="mt-auto">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href="/"><LogOut className="mr-2 h-4 w-4" /> Exit Admin</Link>
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-secondary">
        {children}
      </main>
    </div>
  );
}
