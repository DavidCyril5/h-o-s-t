
import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from 'next/navigation';
import { getMaintenanceModeSettings } from "@/lib/actions/admin";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, maintenanceSettings] = await Promise.all([
    getLoggedInUser(),
    getMaintenanceModeSettings()
  ]);

  // Middleware redirects if no cookie, but this is a definitive server-side check.
  if (!user) {
    redirect('/login');
  }

  // Handle maintenance mode at the layout level
  if (maintenanceSettings.isActive && user.role !== 'admin') {
    redirect('/maintenance');
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1 container py-8">
        {children}
      </main>
      <footer className="py-6 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          Anita Deploy &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
