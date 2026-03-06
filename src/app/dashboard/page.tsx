
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutGrid, Coins, Send } from 'lucide-react';
import { DeploymentCard } from '@/components/deployment/DeploymentCard';
import { getDeployments } from '@/lib/actions/deployment';
import { getLoggedInUser, type LoggedInUser } from '@/lib/actions/auth';
import type { Deployment } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TransferCoinsDialog } from '@/components/user/TransferCoinsDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import OnboardingTour from '@/components/layout/OnboardingTour';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(true);
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [currentCoins, setCurrentCoins] = useState<number>(0);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchInitialData = useCallback(async () => {
    setIsLoadingDeployments(true);
    try {
      const [fetchedUser, fetchedDeployments] = await Promise.all([
        getLoggedInUser(),
        getDeployments()
      ]);
      setUser(fetchedUser);
      setCurrentCoins(fetchedUser?.coins ?? 0);
      setDeployments(fetchedDeployments);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load dashboard data.", variant: "destructive" });
    } finally {
      setIsLoadingDeployments(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleTransferSuccess = (newBalance: number) => {
    setCurrentCoins(newBalance);
    fetchInitialData();
  };

  return (
    <div className="space-y-8">
      <OnboardingTour />
      <Card className="shadow-xl hover:shadow-2xl border-primary/20">
        <CardHeader className="p-4 sm:p-6 bg-card rounded-t-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Your Deployments</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">Manage your Anita-V4 bot deployments.</CardDescription>
            </div>
            <Button asChild size="lg" className="w-full md:w-auto shadow-md hover:shadow-lg" disabled={!user} title="New Deployment" id="tour-new-deployment-btn">
              <Link href="/dashboard/deploy">
                <PlusCircle className="mr-2 h-5 w-5" /> New Deployment
              </Link>
            </Button>
          </div>
        </CardHeader>
        {user && (
          <CardContent className="p-4 sm:p-6 border-t">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center text-lg bg-secondary/50 p-3 rounded-lg shadow-sm border border-border">
                <Coins className="mr-2.5 h-6 w-6 text-yellow-500" />
                <span className="font-bold text-foreground">{currentCoins.toLocaleString()}</span>
                <span className="ml-1.5 text-sm text-muted-foreground">Coins</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransferDialogOpen(true)}
                  disabled={!user}
                  className="min-w-[150px] shadow-sm hover:shadow-md"
                  title="Transfer Coins"
                >
                  <Send className="mr-2 h-4 w-4" /> Transfer Coins
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div id="tour-deployment-area">
        {isLoadingDeployments ? (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading deployments...</p>
          </div>
        ) : deployments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deployments.map((deployment) => (
              <DeploymentCard key={deployment.id} deployment={deployment} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 border-2 border-dashed rounded-lg shadow-sm hover:shadow-md">
            <CardContent className="flex flex-col items-center">
              <LayoutGrid className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold text-foreground">No Deployments Yet</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Ready to launch your Anita-V4 bot? You&apos;ll need to purchase some coins to get started.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Button asChild className="mt-0 shadow-md hover:shadow-lg" disabled={!user} title="Create Deployment">
                  <Link href="/dashboard/deploy">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Deployment
                  </Link>
                </Button>
                 <Button asChild className="mt-0 shadow-md hover:shadow-lg" variant="outline" disabled={!user} title="Buy Coins">
                  <Link href="/dashboard/buy-coins">
                    <Coins className="mr-2 h-4 w-4" /> Buy Coins
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {user && (
        <TransferCoinsDialog
          isOpen={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          currentUserCoins={currentCoins}
          onTransferSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
