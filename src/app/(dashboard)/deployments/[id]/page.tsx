"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LogDisplay } from '@/components/deployment/LogDisplay';
import { AiLogAnalyzer } from '@/components/deployment/AiLogAnalyzer';
import { DeploymentControls } from '@/components/deployment/DeploymentControls';
import type { Deployment, DeploymentStatus } from '@/lib/types';
import {
  ArrowLeft, CheckCircle2, ExternalLink, Hourglass, AlertTriangle,
  Zap, Info, PowerOff, Settings2, FileText, Brain
} from 'lucide-react';
import { getDeploymentLogs } from '@/lib/actions/deployment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import AdBanner from '@/components/AdBanner'; // ✅ AdSense component

async function fetchDeploymentDetails(id: string): Promise<Deployment | null> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockDeployments: Deployment[] = [
    {
      id: 'anita-bot-alpha',
      appName: 'Anita Bot Alpha',
      status: 'succeeded',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastDeployedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      region: 'us-east',
      url: 'https://anita-bot-alpha.herokuapp.com'
    },
    {
      id: 'anita-staging-v4',
      appName: 'Anita Staging V4',
      status: 'deploying',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      region: 'eu-west'
    },
    {
      id: 'legacy-anita-bot',
      appName: 'Legacy Anita Bot',
      status: 'failed',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      region: 'us-west'
    },
    {
      id: 'anita-experimental',
      appName: 'Anita Experimental',
      status: 'stopped',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      region: 'eu-central',
      url: 'https://anita-experimental.herokuapp.com'
    }
  ];
  return mockDeployments.find(d => d.id === id) || null;
}

function getStatusBadgeVariant(status: DeploymentStatus) {
  switch (status) {
    case 'succeeded': return 'default';
    case 'deploying': return 'secondary';
    case 'pending': return 'outline';
    case 'failed': return 'destructive';
    case 'stopped': return 'outline';
    default: return 'outline';
  }
}

function getStatusIcon(status: DeploymentStatus) {
  switch (status) {
    case 'succeeded': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'deploying': return <Hourglass className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'stopped': return <PowerOff className="h-5 w-5 text-gray-500" />;
    default: return <Zap className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function DeploymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      fetchDeploymentDetails(id)
        .then(data => {
          setDeployment(data);
          if (data) {
            setLogsLoading(true);
            getDeploymentLogs(id).then(logData => {
              setLogs(logData);
              setLogsLoading(false);
            });
          }
        })
        .catch(err => console.error("Failed to fetch deployment details:", err))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleStatusChange = (newStatus: DeploymentStatus) => {
    if (deployment) {
      setDeployment({ ...deployment, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Deployment not found. It might have been deleted or the ID is incorrect.</AlertDescription>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </Alert>
    );
  }

  const combinedLogs = logs.join('\n');

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-3xl text-primary">{deployment.appName}</CardTitle>
              <CardDescription>Manage your &quot;{deployment.appName}&quot; deployment.</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(deployment.status)} className="text-md capitalize px-3 py-1.5 flex items-center gap-2">
              {getStatusIcon(deployment.status)}
              {deployment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong className="text-foreground/80">ID:</strong> {deployment.id}</p>
            <p><strong className="text-foreground/80">Created:</strong> {new Date(deployment.createdAt).toLocaleString()}</p>
            <p><strong className="text-foreground/80">Region:</strong> {deployment.region || 'N/A'}</p>
            {deployment.lastDeployedAt && (
              <p><strong className="text-foreground/80">Last Deployed:</strong> {new Date(deployment.lastDeployedAt).toLocaleString()}</p>
            )}
          </div>
          {deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-accent hover:underline"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Visit Deployed App
            </a>
          )}
          <DeploymentControls
            deploymentId={deployment.id}
            currentStatus={deployment.status}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>

      {/* ✅ AdSense banner placed after content */}
      <AdBanner />

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2 h-auto">
          <TabsTrigger value="logs" className="py-2.5 text-sm"><FileText className="mr-2 h-4 w-4" />Logs</TabsTrigger>
          <TabsTrigger value="ai-analyzer" className="py-2.5 text-sm"><Brain className="mr-2 h-4 w-4" />AI Analyzer</TabsTrigger>
          <TabsTrigger value="settings" className="py-2.5 text-sm md:hidden lg:inline-block" disabled><Settings2 className="mr-2 h-4 w-4" />Settings (Soon)</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-6">
          <LogDisplay logs={logs} isLoading={logsLoading} />
        </TabsContent>
        <TabsContent value="ai-analyzer" className="mt-6">
          <AiLogAnalyzer initialLogs={logsLoading ? "Loading logs for analysis..." : combinedLogs} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Deployment Settings</CardTitle>
              <CardDescription>Configuration options for this deployment (feature coming soon).</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                  Advanced settings and environment variable management for this deployment will be available here in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
