
"use client"; 

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LogDisplay } from '@/components/deployment/LogDisplay';
import { AiLogAnalyzer } from '@/components/deployment/AiLogAnalyzer';
import { DeploymentControls } from '@/components/deployment/DeploymentControls';
import type { Deployment, DeploymentStatus } from '@/lib/types';
import { ArrowLeft, CheckCircle2, ExternalLink, Hourglass, AlertTriangle, Zap, Info, PowerOff, Settings2, FileText, Brain, RefreshCcw, Edit } from 'lucide-react';
import { getDeploymentById, getDeploymentLogs } from '@/lib/actions/deployment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { EditEnvVariablesDialog } from '@/components/deployment/EditEnvVariablesDialog';

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

const sensitiveKeywords = ['session', 'api', 'key', 'secret', 'token', 'pass', 'password', 'auth', 'credentials', 'mongodb_uri', 'database_url'];

const shouldHideValue = (key: string, value: any): boolean => {
  if (typeof value !== 'string' || value.length <= 25) {
    return false;
  }
  const keyLower = key.toLowerCase();
  return sensitiveKeywords.some(keyword => keyLower.includes(keyword));
};

const displayValueHelper = (key: string, value: any): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const sValue = String(value);
  if (shouldHideValue(key, sValue)) return `${sValue.substring(0,10)}... (hidden)`;
  if (sValue.length > 100) return `${sValue.substring(0,97)}...`;
  return sValue;
};


export default function DeploymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditEnvDialogOpen, setIsEditEnvDialogOpen] = useState(false);

  const fetchDeploymentData = useCallback(async (forceRefresh = false) => {
    if (!id) return;
    if (!deployment || forceRefresh) setIsLoading(true);
    setError(null);
    try {
      const deploymentData = await getDeploymentById(id);
      if (deploymentData) {
        setDeployment(deploymentData);
        if (logsLoading || deploymentData.status !== deployment?.status || forceRefresh) {
            setLogsLoading(true);
            const logData = await getDeploymentLogs(deploymentData.id); 
            setLogs(logData || []);
            setLogsLoading(false);
        }
      } else {
        setError("Deployment not found.");
        setDeployment(null);
      }
    } catch (err) {
      console.error("Failed to fetch deployment details:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setDeployment(null);
    } finally {
      if (!deployment || forceRefresh) setIsLoading(false); 
    }
  }, [id, deployment, logsLoading]); 

  useEffect(() => {
    if (id) {
        fetchDeploymentData(true); // Initial fetch with full loading indication
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only re-run if ID changes

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;
    if (deployment && (deployment.status === 'deploying' || deployment.status === 'pending')) {
      intervalId = setInterval(() => {
        fetchDeploymentData(); // No force refresh for interval, let it be gentle
      }, 10000); 
    }
    return () => {
        if (intervalId) clearInterval(intervalId); 
    }
  }, [deployment, fetchDeploymentData]);


  const handleStatusChange = (newStatus: DeploymentStatus) => {
    if (deployment) {
      setDeployment({ ...deployment, status: newStatus });
      if (newStatus !== 'deploying' && newStatus !== 'pending') {
         fetchDeploymentData(true); 
      }
    }
  };
  
  const handleEnvUpdateSuccess = () => {
    setIsEditEnvDialogOpen(false);
    fetchDeploymentData(true); 
  };

  if (isLoading && !deployment) { 
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive" className="shadow-xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </Alert>
    );
  }
  
  if (!deployment) {
    return (
      <Alert variant="destructive" className="shadow-xl">
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
       <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="shadow hover:shadow-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Button variant="ghost" onClick={() => fetchDeploymentData(true)} title="Refresh Data" className="text-muted-foreground hover:text-primary">
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">{deployment.appName}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Manage your &quot;{deployment.appName}&quot; deployment.</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(deployment.status)} className="text-md capitalize px-4 py-2 flex items-center gap-2 shadow-md">
              {getStatusIcon(deployment.status)}
              {deployment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <p><strong className="text-foreground/80">ID:</strong> <span className="font-mono text-muted-foreground">{deployment.id}</span></p>
            <p><strong className="text-foreground/80">Created:</strong> {new Date(deployment.createdAt).toLocaleString()}</p>
            <p><strong className="text-foreground/80">Region:</strong> {deployment.region || 'N/A'}</p>
            {deployment.lastDeployedAt && <p><strong className="text-foreground/80">Last Deployed:</strong> {new Date(deployment.lastDeployedAt).toLocaleString()}</p>}
          </div>
          {deployment.url && (
            <Button variant="link" asChild className="p-0 h-auto text-base">
                <a
                href={deployment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-accent hover:underline font-medium"
                >
                <ExternalLink className="mr-2 h-4 w-4" /> Visit Deployed App
                </a>
            </Button>
          )}
          <DeploymentControls deploymentId={deployment.id} currentStatus={deployment.status} onStatusChange={handleStatusChange} />
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2 h-auto shadow-md bg-muted p-1 rounded-lg">
          <TabsTrigger value="logs" className="py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"><FileText className="mr-2 h-4 w-4"/>Logs</TabsTrigger>
          <TabsTrigger value="ai-analyzer" className="py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"><Brain className="mr-2 h-4 w-4"/>AI Analyzer</TabsTrigger>
          <TabsTrigger value="env" className="py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"><Settings2 className="mr-2 h-4 w-4"/>Environment</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-6">
          <LogDisplay logs={logs} isLoading={logsLoading} />
        </TabsContent>
        <TabsContent value="ai-analyzer" className="mt-6">
          <AiLogAnalyzer initialLogs={logsLoading ? "Loading logs for analysis..." : combinedLogs} />
        </TabsContent>
         <TabsContent value="env" className="mt-6">
           <Card className="shadow-xl">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xl flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Environment Variables</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Current environment configuration for this deployment.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditEnvDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Variables
              </Button>
            </CardHeader>
            <CardContent>
              {deployment.envVariables && Object.keys(deployment.envVariables).length > 0 ? (
                <div className="space-y-2 text-sm max-h-96 overflow-y-auto bg-muted/50 p-4 rounded-lg shadow-inner border">
                  {Object.entries(deployment.envVariables).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/50 last:border-b-0 font-mono">
                      <strong className="text-foreground/80 col-span-1 truncate" title={key}>{key}:</strong>
                      <span className="col-span-2 break-all text-foreground/90" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>
                        {displayValueHelper(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert className="shadow-sm">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Environment Variables</AlertTitle>
                  <AlertDescription>
                    No specific environment variables were found for this deployment, or they are not set to be displayed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
      {deployment && (
        <EditEnvVariablesDialog
          isOpen={isEditEnvDialogOpen}
          onOpenChange={setIsEditEnvDialogOpen}
          deployment={deployment}
          onSuccess={handleEnvUpdateSuccess}
        />
      )}
    </div>
  );
}


    