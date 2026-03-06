
import { getLoggedInUser } from "@/lib/actions/auth";
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { UserCircle, Mail, CalendarDays, Coins, Gift, Shield, Users, BarChart3, KeyRound, UserCog, Trash2, AlertTriangle, Award } from "lucide-react";
import { UpdateProfileForm } from "@/components/user/UpdateProfileForm";
import { ChangePasswordForm } from "@/components/user/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/user/DeleteAccountDialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getLoggedInUser();

  if (!user) {
    redirect("/login");
  }

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <UserCircle className="mr-3 h-8 w-8 text-primary" /> Your Profile
        </h1>
        <p className="text-muted-foreground">View and manage your account details and settings.</p>
      </div>

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-4">
          <Avatar className="h-24 w-24 border-2 border-primary shadow-sm">
            <AvatarImage 
              src={`https://placehold.co/100x100.png?text=${getAvatarFallback()}`} 
              alt={user.name}
              data-ai-hint="user avatar"
            />
            <AvatarFallback className="text-3xl">{getAvatarFallback()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {user.email}
            </CardDescription>
            {user.role === 'admin' && (
                <Badge variant="default" className="mt-2 text-xs">
                    <Shield className="mr-1.5 h-3.5 w-3.5" /> Admin
                </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center p-4 bg-secondary/60 rounded-lg shadow">
              <Coins className="mr-3 h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-muted-foreground">Coin Balance</p>
                <p className="font-semibold text-lg text-foreground">{user.coins.toLocaleString()} Coins</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-secondary/60 rounded-lg shadow">
              <CalendarDays className="mr-3 h-6 w-6 text-blue-500" />
              <div>
                <p className="text-muted-foreground">Joined On</p>
                <p className="font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
          
          {user.referralCode && user.referralCode !== 'N/A' && (
            <Card className="bg-card border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Gift className="mr-2 h-5 w-5 text-accent" />
                  Your Referral Code
                </CardTitle>
                <CardDescription className="text-xs">Share this code with friends. You earn 10 coins for each successful referral!</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 bg-muted/40 rounded-md">
                <p className="text-lg font-mono font-semibold text-primary break-all">{user.referralCode}</p>
                <CopyButton textToCopy={user.referralCode} buttonText="Copy Code" />
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-green-500" />
                    Referral Statistics
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center p-4 bg-secondary/60 rounded-lg shadow-sm">
                    <Users className="mr-3 h-5 w-5 text-indigo-500" />
                    <div>
                        <p className="text-muted-foreground">Users Referred</p>
                        <p className="font-semibold text-lg text-foreground">{user.referredUsersCount.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center p-4 bg-secondary/60 rounded-lg shadow-sm">
                    <Coins className="mr-3 h-5 w-5 text-amber-500" />
                    <div>
                        <p className="text-muted-foreground">Total Coins from Referrals</p>
                        <p className="font-semibold text-lg text-foreground">{user.referralCoinsEarned.toLocaleString()} Coins</p>
                    </div>
                </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      <Separator />

       <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Award className="mr-2 h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
          <CardDescription className="text-xs">
            Milestones you've reached on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.achievements && user.achievements.length > 0 ? (
            <TooltipProvider>
              <div className="flex flex-wrap gap-4">
                {user.achievements.map((achievement) => {
                  const achievementDetails = ACHIEVEMENTS[achievement.id];
                  const Icon = achievementDetails ? achievementDetails.icon : Award;
                  return (
                    <Tooltip key={achievement.id}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 text-primary transition-all hover:bg-primary/20 hover:scale-105">
                            <Icon className="h-8 w-8" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{achievement.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No achievements yet. Start deploying and interacting to earn some!
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCog className="mr-2 h-5 w-5 text-primary" />
            Update Profile Information
          </CardTitle>
          <CardDescription className="text-xs">Change your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm user={user} />
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription className="text-xs">Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl border-destructive hover:shadow-2xl hover:border-destructive/70">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">Manage irreversible account actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start space-y-4">
            <p className="text-sm text-muted-foreground">
              Deleting your account is permanent. All your data, including deployments,
              will be removed and cannot be recovered.
            </p>
            <DeleteAccountDialog>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </DeleteAccountDialog>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
