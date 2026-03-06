
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Shout } from "@/lib/types";
import { useRouter } from "next/navigation";

interface UserMiniProfileDialogProps {
  shout: Shout | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function UserMiniProfileDialog({ shout, isOpen, onOpenChange }: UserMiniProfileDialogProps) {
  const router = useRouter();

  if (!shout) return null;

  const handleViewProfile = () => {
    // Assuming you have a route like /profile/[userId]
    router.push(`/profile/${shout.userId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader className="items-center text-center">
          <Avatar className="h-20 w-20 border-2 mb-2">
            <AvatarImage src={`https://placehold.co/80x80.png?text=${shout.userAvatarFallback}`} alt={shout.userName} />
            <AvatarFallback className="text-2xl">{shout.userAvatarFallback}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-xl">{shout.userName}</DialogTitle>
          {shout.userRole === 'admin' && <Badge variant="secondary">Admin</Badge>}
        </DialogHeader>
        
        <DialogFooter className="mt-4">
            <Button onClick={handleViewProfile} className="w-full">View Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
