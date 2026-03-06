
"use client"; 

import Link from 'next/link';
import { Zap, LayoutDashboard, PlusCircle, MessagesSquare } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { UserNav, type UserNavProps } from './UserNav'; 
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { useState, useEffect } from 'react'; 
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"; 
import { ShoutboxCard } from '@/components/shoutbox/ShoutboxCard'; 
import type { LoggedInUser } from '@/lib/actions/auth';

interface HeaderProps {
  user: LoggedInUser | null; 
}

export function Header({ user }: HeaderProps) {
  const [shoutboxOpen, setShoutboxOpen] = useState(false);
  const [currentUserForShoutbox, setCurrentUserForShoutbox] = useState<LoggedInUser | null>(user);

  useEffect(() => {
    setCurrentUserForShoutbox(user);
  }, [user]);


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/dashboard" className="flex items-center">
          <Zap className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold text-foreground">Anita Deploy</span>
        </Link>
        <nav className="ml-10 hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-primary text-foreground/70"
          >
            <LayoutDashboard className="inline-block mr-1 h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/deploy"
            className="transition-colors hover:text-primary text-foreground/70"
          >
            <PlusCircle className="inline-block mr-1 h-4 w-4" />
            New Deployment
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-1 sm:space-x-2 md:space-x-4">
          <ThemeToggle />
          <NotificationBell user={user} /> 

          <Sheet open={shoutboxOpen} onOpenChange={setShoutboxOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" title="Open Community Feed" id="tour-community-feed"> 
                <MessagesSquare className="h-5 w-5" />
                <span className="sr-only">Open Community Feed</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[calc(100vw-2rem)] max-w-md sm:max-w-lg p-0 flex flex-col">
              <SheetHeader className="p-4 pt-6 sm:p-6 sm:pb-2 border-b">
                <div className="flex justify-between items-center">
                  <SheetTitle className="flex items-center text-xl sm:text-2xl">
                    <MessagesSquare className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Community Feed
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs sm:text-sm">
                  Share quick messages with others. Cleared every 24 hours. Be respectful.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-grow overflow-y-auto"> 
                <ShoutboxCard currentUser={currentUserForShoutbox} />
              </div>
            </SheetContent>
          </Sheet>

          <div id="tour-user-nav">
            <UserNav user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
    
