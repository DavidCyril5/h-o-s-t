
"use client";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { banUser } from "@/lib/actions/admin";
import { useState, useTransition } from "react";

interface BanUserDialogProps {
  userId: string;
  userEmail: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function BanUserDialog({ userId, userEmail, isOpen, onOpenChange, onSuccess }: BanUserDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleBan = async () => {
    startTransition(async () => {
      const result = await banUser(userId, reason);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to ban {userEmail}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is permanent and will prevent the user from accessing the site. Their associated IP addresses will also be blocked.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ban-reason">Reason for ban (optional but recommended)</Label>
          <Input
            id="ban-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Spamming, abuse, etc."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleBan} disabled={isPending} variant="destructive">
              {isPending ? "Banning..." : "Ban User"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
