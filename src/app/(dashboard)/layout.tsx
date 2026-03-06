
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Here you would typically add authentication checks.
  // For this example, we assume the user is authenticated.
  // e.g., by checking a session or token.
  // If not authenticated, redirect to /login.
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
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
