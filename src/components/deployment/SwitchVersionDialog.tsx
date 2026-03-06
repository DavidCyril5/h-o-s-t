
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { switchDeploymentVersion } from "@/lib/actions/deployment";
import { Loader2 } from "lucide-react";

interface SwitchVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deploymentId: string;
  currentVersion: string;
  onSuccess: () => void;
}

export function SwitchVersionDialog({
  open,
  onOpenChange,
  deploymentId,
  currentVersion,
  onSuccess,
}: SwitchVersionDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSwitchVersion = async () => {
    setIsLoading(true);
    const result = await switchDeploymentVersion(deploymentId, selectedVersion as any);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: "Version Switch Initiated",
        description: result.message,
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: "Version Switch Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Deployment Version</DialogTitle>
          <DialogDescription>
            Select a new version for your Anita deployment. This will update the
            GitHub repository and redeploy your application.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={selectedVersion}
            onValueChange={setSelectedVersion}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="V5" id="v5" />
              <Label htmlFor="v5">Anita V5 (Recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="V4" id="v4" />
              <Label htmlFor="v4">Anita V4</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="V3" id="v3" />
              <Label htmlFor="v3">Anita V3</Label>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSwitchVersion} disabled={isLoading || selectedVersion === currentVersion}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Switch and Redeploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
