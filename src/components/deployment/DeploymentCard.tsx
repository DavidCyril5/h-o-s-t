import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Deployment, DeploymentStatus } from '@/lib/types';
import { ExternalLink, Zap, AlertTriangle, CheckCircle2, Hourglass, PowerOff, Layers, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeploymentCardProps {
  deployment: Deployment;
}

function getStatusBadgeVariant(status: DeploymentStatus) {
  switch (status) {
    case 'succeeded':
      return 'default'; 
    case 'deploying':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'failed':
    case 'expired':
      return 'destructive';
    case 'stopped':
      return 'outline'; 
    default:
      return 'outline';
  }
}

function getStatusIcon(status: DeploymentStatus) {
  switch (status) {
    case 'succeeded':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'deploying':
      return <Hourglass className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'pending':
      return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'failed':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'stopped':
        return <PowerOff className="h-5 w-5 text-gray-500" />;
    case 'expired':
        return <ShieldAlert className="h-5 w-5 text-white-500" />;
    default:
      return <Zap className="h-5 w-5 text-muted-foreground" />;
  }
}


export function DeploymentCard({ deployment }: DeploymentCardProps) {
  const isExpired = deployment.status === 'expired';

  return (
    <Card className={cn(
      "flex flex-col h-full shadow-md hover:shadow-xl transition-shadow duration-300 ease-in-out",
      isExpired && "bg-neutral-800/50 border-destructive/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <CardTitle className={cn("text-xl font-semibold text-primary flex items-center", isExpired && "text-neutral-400")}>
              <Layers className="mr-2.5 h-5 w-5" />
              {deployment.appName}
            </CardTitle>
            <CardDescription className={cn("text-xs mt-1", isExpired && "text-neutral-500")}>Deployed: {new Date(deployment.createdAt).toLocaleDateString()}</CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(deployment.status)} className="capitalize flex items-center gap-1.5 px-3 py-1 text-xs shadow-sm">
            {getStatusIcon(deployment.status)}
            <span>{deployment.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        {isExpired && (
            <p className='text-destructive text-sm font-semibold'>This deployment has expired and is no longer active. Please redeploy if you want to use this service.</p>
        )}
        <p className={cn("text-sm text-muted-foreground", isExpired && "text-neutral-400")}>
          Region: <span className="font-medium text-foreground">{deployment.region || 'N/A'}</span>
        </p>
        {deployment.lastDeployedAt && (
             <p className={cn("text-sm text-muted-foreground", isExpired && "text-neutral-400")}>
                Last Activity: <span className="font-medium text-foreground">{new Date(deployment.lastDeployedAt).toLocaleDateString()}</span>
            </p>
        )}
        {deployment.url && (
          <div className="mt-2">
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("text-sm text-accent hover:underline flex items-center font-medium", isExpired && "pointer-events-none text-neutral-500")}
            >
              Visit App <ExternalLink className="ml-1.5 h-4 w-4" />
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end pt-4 border-t mt-auto">
        <Button asChild variant="outline" size="sm" className="shadow-sm hover:shadow-md" disabled={isExpired}>
          <Link href={`/dashboard/deployments/${deployment.id}`}>Manage</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}