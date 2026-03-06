export const dynamic = 'force-dynamic';

import { getPlatformStats } from "@/lib/actions/admin";
import { StatCard } from "@/components/admin/StatCard";
import { Users, Package, Coins as CoinsIcon, AlertTriangle, BarChart3, UserX, TrendingUp, TrendingDown, UsersRound, BadgePercent, Banknote, Building } from "lucide-react"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AdBanner from "@/components/AdBanner"; // ✅ AdSense banner component

export default async function AdminStatsPage() {
  const statsResult = await getPlatformStats();

  if (!statsResult.success || !statsResult.stats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Platform Statistics
          </h1>
           <p className="text-muted-foreground">Detailed overview of platform activity and metrics.</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Stats</AlertTitle>
          <AlertDescription>
            {statsResult.message || "Could not load platform statistics. Please try again later."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { 
    totalUsers, 
    totalDeployments, 
    totalCoinsInSystem, 
    totalBannedUsers,
    dailyActiveUsers,
    totalSucceededDeployments,
    totalFailedDeployments,
    totalStoppedDeployments,
    deploymentSuccessRate,
    coinsPurchasedToday,
    coinsSpentOnDeploymentsToday,
  } = statsResult.stats;

  return (
    <div className="space-y-10">
       <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Platform Statistics
          </h1>
          <p className="text-muted-foreground">Detailed overview of platform activity and metrics.</p>
        </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-xl"><UsersRound className="mr-2 h-5 w-5 text-accent" />User Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total Users" value={totalUsers.toLocaleString()} icon={Users} description="Overall registered users." />
            <StatCard title="Daily Active Users (24h)" value={dailyActiveUsers.toLocaleString()} icon={TrendingUp} description="Users active in the last 24 hours." />
            <StatCard title="Banned Users" value={totalBannedUsers.toLocaleString()} icon={UserX} description="Total number of banned users." />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-xl"><Building className="mr-2 h-5 w-5 text-accent" />Deployment Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Deployments" value={totalDeployments.toLocaleString()} icon={Package} description="All deployments ever created." />
            <StatCard title="Succeeded Deployments" value={totalSucceededDeployments.toLocaleString()} icon={TrendingUp} description="Successfully running or completed." />
            <StatCard title="Failed Deployments" value={totalFailedDeployments.toLocaleString()} icon={TrendingDown} description="Deployments that failed." />
            <StatCard title="Stopped Deployments" value={totalStoppedDeployments.toLocaleString()} icon={Package} description="Deployments manually stopped." />
            <StatCard title="Success Rate" value={`${deploymentSuccessRate.toFixed(1)}%`} icon={BadgePercent} description="Succeeded / (Succeeded + Failed)." />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-xl"><Banknote className="mr-2 h-5 w-5 text-accent" />Coin Economy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total Coins in System" value={totalCoinsInSystem.toLocaleString()} icon={CoinsIcon} description="Sum of all active user coin balances." />
            <StatCard title="Coins Purchased Today" value={coinsPurchasedToday.toLocaleString()} icon={CoinsIcon} description="Total coins bought by users today." />
            <StatCard title="Coins Spent on Deployments Today" value={coinsSpentOnDeploymentsToday.toLocaleString()} icon={CoinsIcon} description="Coins used for new non-admin deployments today." />
        </CardContent>
      </Card>

      {/* ✅ AdSense banner placement after coin economy */}
      <AdBanner />

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <BarChart3 className="mr-2 h-5 w-5 text-accent" />
            Usage Trends
          </CardTitle>
          <CardDescription>Visual charts showing platform growth (feature coming soon).</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertTitle>Charts Coming Soon!</AlertTitle>
            <AlertDescription>
              Detailed charts for user registration trends, deployment activity, coin economy flow, and more will be available here in a future update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
