
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Shield, Coins, Copy as CopyIcon, Info, CreditCard } from "lucide-react"; // Renamed Copy to CopyIcon, Added CreditCard
import { useRouter } from "next/navigation"; 
import { useToast } from "@/hooks/use-toast";
import { logoutUser, type LoggedInUser } from "@/lib/actions/auth"; 
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton"; // Import CopyButton
import { Badge } from "@/components/ui/badge"; 

export interface UserNavProps {
  user: LoggedInUser | null;
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser(); 
    } catch (error: any) {
      if (error.message?.includes('NEXT_REDIRECT')) {
        // Expected
      } else {
        toast({ title: "Logout Failed", description: error.message || "Failed to logout.", variant: "destructive" });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getAvatarFallback = () => {
    if (user?.name) {
      const nameParts = user.name.split(" ");
      if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
        return nameParts[0][0].toUpperCase() + nameParts[1][0].toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return "U"; 
  };

  return (
    <div id="tour-user-nav">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={`https://placehold.co/100x100.png?text=${getAvatarFallback()}`} 
                alt={user?.name || "User avatar"} 
                data-ai-hint="user avatar"
              />
              <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          {user ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  {user.role === 'admin' && (
                    <p className="text-xs leading-none text-primary font-semibold mt-1">Administrator</p>
                  )}
                  <div className="flex items-center text-xs text-muted-foreground mt-1.5">
                      <Coins className="mr-1.5 h-4 w-4 text-yellow-500" /> 
                      <span>{user.coins.toLocaleString()} Coins</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {user.referralCode && user.referralCode !== 'N/A' && (
                  <div className="px-2 py-1.5 text-sm">
                    <span className="text-xs text-muted-foreground">Referral Code:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs">{user.referralCode}</span>
                      <CopyButton textToCopy={user.referralCode} buttonText="" toastMessage="Referral code copied!" className="h-6 px-2"/>
                    </div>
                  </div>
                )}
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/buy-coins')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Buy Coins</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                  <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                <span>Log out</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Guest</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Not logged in
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/login')}>
                <User className="mr-2 h-4 w-4" />
                <span>Login</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/admin/login')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Login</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
