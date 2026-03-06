import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutGrid } from 'lucide-react';
import { DeploymentCard } from '@/components/deployment/DeploymentCard';
import type { Deployment } from '@/lib/types';
import AdBanner from '@/components/AdBanner'; // ✅ Import AdBanner

// Mock data for deployments - in a real app, this would come from an API/database
const mockDeployments: Deployment[] = [
  {
    id: 'anita-bot-alpha',
    appName: 'Anita Bot Alpha',
    status: 'succeeded',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    lastDeployedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    region: 'us-east',
    url: 'https://anita-bot-alpha.herokuapp.com',
    userId: ''
  },
  {
    id: 'anita-staging-v4',
    appName: 'Anita Staging V4',
    status: 'deploying',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    region: 'eu-west',
    userId: ''
  },
  {
    id: 'legacy-anita-bot',
    appName: 'Legacy Anita Bot',
    status: 'failed',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    region: 'us-west',
    userId: ''
  },
  {
    id: 'anita-experimental',
    appName: 'Anita Experimental',
    status: 'stopped',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    region: 'eu-central',
    url: 'https://anita-experimental.herokuapp.com',
    userId: ''
  },
];

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const deployments = mockDeployments; // In real app: fetchDeployments();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Deployments</h1>
          <p className="text-muted-foreground">Manage your Anita-V4 bot deployments.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/deploy">
            <PlusCircle className="mr-2 h-5 w-5" /> New Deployment
          </Link>
        </Button>
      </div>

      {/* ✅ Google AdSense Banner */}
      <AdBanner />

      {deployments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deployments.map((deployment) => (
            <DeploymentCard key={deployment.id} deployment={deployment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Deployments Yet</h3>
          <p className="text-muted-foreground mt-1">
            Get started by creating your first Anita-V4 bot deployment.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/deploy">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Deployment
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
