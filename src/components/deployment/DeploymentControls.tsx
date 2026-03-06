
"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, StopCircle, RefreshCw, Loader2, AlertTriangle, Trash2, Rocket, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { controlDeployment, deleteDeployment } from "@/lib/actions/deployment"; // Server Actions
import type { DeploymentStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { SwitchVersionDialog } from "./SwitchVersionDialog"; // Import the new dialog

interface DeploymentControlsProps {
  deploymentId: string;
  currentStatus: DeploymentStatus;
  currentVersion: string; // Add currentVersion to props
  onStatusChange: (newStatus: DeploymentStatus) => void; 
}

export function DeploymentControls({ deploymentId, currentStatus, currentVersion, onStatusChange }: DeploymentControlsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"start" | "stop" | "restart" | "delete" | "redeploy" | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<"start" | "stop" | "restart" | "delete" | "redeploy" | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSwitchVersionOpen, setIsSwitchVersionOpen] = useState(false); // State for the new dialog

  const handleOpenConfirmDialog = (action: "start" | "stop" | "restart" | "delete" | "redeploy") => {
    setActionToConfirm(action);
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionToConfirm) return;

    setLoadingAction(actionToConfirm);
    setIsConfirmOpen(false); 

    try {
      let result;
      if (actionToConfirm === "delete") {
        result = await deleteDeployment(deploymentId);
        if (result.success) {
          toast({
            title: "Deletion Successful",
            description: result.message,
          });
          router.push('/dashboard');
        } else {
          toast({
            title: "Deletion Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } else { 
        result = await controlDeployment(deploymentId, actionToConfirm as "start" | "stop" | "restart" | "redeploy");
        if (result.success) {
          toast({
            title: "Action Successful",
            description: result.message,
          });
          let newStatus: DeploymentStatus = currentStatus;
          if (result.newStatus) {
              newStatus = result.newStatus;
          } else {
              if (actionToConfirm === "start") newStatus = "deploying"; 
              if (actionToConfirm === "stop") newStatus = "stopped";
              if (actionToConfirm === "restart") newStatus = "deploying";
              if (actionToConfirm === "redeploy") newStatus = "deploying";
          }
          onStatusChange(newStatus);
        } else {
          toast({
            title: "Action Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An unexpected error occurred while performing ${actionToConfirm}.`,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
      setActionToConfirm(null);
    }
  };

  const handleVersionSwitchSuccess = () => {
    // Refresh the page to show updated deployment status and information
    router.refresh();
  };

  const canStart = currentStatus === 'stopped' || currentStatus === 'failed';
  const canStop = currentStatus === 'succeeded' || currentStatus === 'deploying' || currentStatus === 'pending';
  const canRestart = currentStatus === 'succeeded' || currentStatus === 'failed' || currentStatus === 'stopped';
  const canRedeploy = currentStatus === 'succeeded' || currentStatus === 'failed' || currentStatus === 'stopped';
  const canSwitchVersion = currentStatus === 'succeeded' || currentStatus === 'failed' || currentStatus === 'stopped';

  const getDialogTexts = () => {
    switch (actionToConfirm) {
      case "start": return { title: "Start Deployment?", description: "Are you sure you want to start this deployment? This may incur costs or use resources.", confirmText: "Yes, Start"};
      case "stop": return { title: "Stop Deployment?", description: "Are you sure you want to stop this deployment? The application will become unavailable.", confirmText: "Yes, Stop", variant: "destructive" as const};
      case "restart": return { title: "Restart Deployment?", description: "This will stop and then start the application.", confirmText: "Yes, Restart"};
      case "redeploy": return { title: "Redeploy Application?", description: "This will trigger a new build from the connected GitHub repository. Are you sure?", confirmText: "Yes, Redeploy"};
      case "delete": return { title: "Delete Deployment?", description: "This action is irreversible. The Heroku app and all its data will be permanently deleted. Are you sure?", confirmText: "Yes, Delete Permanently", variant: "destructive" as const};
      default: return { title: "", description: "", confirmText: ""};
    }
  };
  
  const dialogContent = getDialogTexts();

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
        <Button
          onClick={() => handleOpenConfirmDialog("start")}
          disabled={loadingAction !== null || !canStart}
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
        >
          {loadingAction === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Start
        </Button>
        <Button
          onClick={() => handleOpenConfirmDialog("stop")}
          disabled={loadingAction !== null || !canStop}
          variant="outline"
          className="text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700"
        >
          {loadingAction === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
          Stop
        </Button>
        <Button
            onClick={() => handleOpenConfirmDialog("redeploy")}
            disabled={loadingAction !== null || !canRedeploy}
            variant="outline"
            className="text-indigo-600 border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
        >
            {loadingAction === "redeploy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Redeploy
        </Button>
        <Button
          onClick={() => handleOpenConfirmDialog("restart")}
          disabled={loadingAction !== null || !canRestart}
          variant="outline"
          className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          {loadingAction === "restart" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Restart
        </Button>
        <Button
          onClick={() => setIsSwitchVersionOpen(true)} // Open the switch version dialog
          disabled={loadingAction !== null || !canSwitchVersion}
          variant="outline"
          className="text-purple-600 border-purple-600 hover:bg-purple-50 hover:text-purple-700"
        >
          <GitBranch className="mr-2 h-4 w-4" />
          Switch Version
        </Button>
         <Button
          onClick={() => handleOpenConfirmDialog("delete")}
          disabled={loadingAction !== null}
          variant="destructive"
          className="ml-auto"
        >
          {loadingAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Delete
        </Button>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
             {(actionToConfirm === "stop" || actionToConfirm === "delete") && <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> }
             {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionToConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={dialogContent.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {loadingAction === actionToConfirm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {dialogContent.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SwitchVersionDialog
        open={isSwitchVersionOpen}
        onOpenChange={setIsSwitchVersionOpen}
        deploymentId={deploymentId}
        currentVersion={currentVersion}
        onSuccess={handleVersionSwitchSuccess}
      />
    </>
  );
}
