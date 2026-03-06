
"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { CreateShoutSchema, EditShoutSchema, type CreateShoutInput, type EditShoutInput } from "@/lib/schemas";
import { createShout, getRecentShouts, editShout, deleteShout } from "@/lib/actions/shoutbox";
import { broadcastTyping } from "@/lib/actions/shoutboxTyping";
import type { Shout } from "@/lib/types";
import type { LoggedInUser } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, RefreshCw, Edit, Trash2, AlertTriangle, MessageSquarePlus, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import Pusher from 'pusher-js';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserMiniProfileDialog } from "./UserMiniProfileDialog"; // Import the new component

interface ShoutboxCardProps {
    currentUser: LoggedInUser | null;
}

interface TypingUser {
  userId: string;
  userName: string;
}

export function ShoutboxCard({ currentUser }: ShoutboxCardProps) {
  const { toast } = useToast();
  const [shouts, setShouts] = useState<Shout[]>([]);
  const [isLoadingShouts, setIsLoadingShouts] = useState(true);
  const [isPosting, startPostingTransition] = useTransition();
  const [isRefreshing, startRefreshingTransition] = useTransition();

  const [editingShout, setEditingShout] = useState<Shout | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [shoutToDelete, setShoutToDelete] = useState<Shout | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [profileViewShout, setProfileViewShout] = useState<Shout | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createForm = useForm<CreateShoutInput>({
    resolver: zodResolver(CreateShoutSchema),
    defaultValues: { message: "" },
  });

  const editForm = useForm<EditShoutInput>({
    resolver: zodResolver(EditShoutSchema),
    defaultValues: { message: "" },
  });

  const fetchShouts = useCallback(async () => {
    setIsLoadingShouts(true);
    try {
      const result = await getRecentShouts();
      if (result.success && result.shouts) {
        setShouts(result.shouts);
      } else {
        toast({ title: "Error", description: result.message || "Failed to load shouts.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch shouts.", variant: "destructive" });
    } finally {
      setIsLoadingShouts(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchShouts();
    const intervalId = setInterval(fetchShouts, 60000); 

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('shoutbox');

    channel.bind('user-typing', (data: TypingUser & { isTyping: boolean }) => {
      if (data.userId === currentUser?._id) return;
      setTypingUsers(prev => {
        if (data.isTyping) {
          if (prev.find(u => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    });

    return () => {
        clearInterval(intervalId);
        pusher.unsubscribe('shoutbox');
        pusher.disconnect();
    };
  }, [fetchShouts, currentUser]);

  const handleRefresh = () => {
    startRefreshingTransition(() => {
        fetchShouts();
    });
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    broadcastTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000); // 2 seconds of inactivity
  }

  async function onCreateSubmit(values: CreateShoutInput) {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastTyping(false);
    if (!currentUser) { 
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        return;
    }
    if (currentUser.isBannedFromShoutbox) {
        toast({ title: "Posting Restricted", description: "You are currently banned from posting.", variant: "destructive"});
        return;
    }
    startPostingTransition(async () => {
      try {
        const result = await createShout(values);
        toast({ title: result.success ? "Posted!" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) {
          createForm.reset();
          fetchShouts(); 
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to post message.", variant: "destructive" });
      }
    });
  }

  const openEditDialog = (shout: Shout) => {
    setEditingShout(shout);
    editForm.reset({ message: shout.message });
  }

  async function onEditSubmit(values: EditShoutInput) {
    if (!editingShout || !currentUser) return;
    setIsEditLoading(true);
    try {
        const result = await editShout(editingShout._id, values);
        toast({ title: result.success ? "Updated!" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) {
            setEditingShout(null);
            fetchShouts();
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to update shout.", variant: "destructive" });
    } finally {
        setIsEditLoading(false);
    }
  }

  const openDeleteDialog = (shout: Shout) => {
    setShoutToDelete(shout);
  }

  async function onDeleteConfirm() {
    if (!shoutToDelete || !currentUser) return;
    setIsDeletingLoading(true);
    try {
        const result = await deleteShout(shoutToDelete._id);
        toast({ title: result.success ? "Deleted!" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) {
            setShoutToDelete(null);
            fetchShouts();
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete shout.", variant: "destructive" });
    } finally {
        setIsDeletingLoading(false);
    }
  }

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return <p className="text-xs text-muted-foreground italic">{typingUsers[0].userName} is typing...</p>;
    if (typingUsers.length === 2) return <p className="text-xs text-muted-foreground italic">{typingUsers.map(u => u.userName).join(' and ')} are typing...</p>;
    return <p className="text-xs text-muted-foreground italic">Several people are typing...</p>;
  }

  const renderShoutMessage = (shout: Shout) => {
    if (!currentUser) return <p>{shout.message}</p>;

    const mentionRegex = new RegExp(`@${currentUser.name}\b`, 'gi');
    const parts = shout.message.split(mentionRegex);
    const isMentioned = (shout.mentionedUserIds || []).includes(currentUser._id);

    return (
        <p className={`text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5 ${isMentioned ? 'bg-primary/10 p-2 rounded-md' : ''}`}>
            {parts.map((part, index) => 
                index % 2 !== 0 ? (
                    <strong key={index} className="text-primary font-bold bg-primary/20 rounded-sm px-1">@{currentUser.name}</strong>
                ) : (
                    part
                )
            )}
        </p>
    );
};


  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
        {currentUser && currentUser.isBannedFromShoutbox && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Posting Restricted</AlertTitle>
                <AlertDescription>
                    You are currently banned from posting in the Community Feed due to too many infractions.
                </AlertDescription>
            </Alert>
        )}
        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-3">
            <FormField
              control={createForm.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={currentUser?.isBannedFromShoutbox ? "You are banned from posting." : "What's on your mind? (Max 280 chars)"}
                      rows={3}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleTyping();
                      }}
                      className="resize-none text-sm"
                      disabled={isPosting || !currentUser || currentUser.isBannedFromShoutbox}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPosting || !currentUser || currentUser.isBannedFromShoutbox} className="w-full sm:w-auto">
              {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
              Post
            </Button>
          </form>
        </Form>

        <div className="flex justify-between items-center mt-2 mb-1">
            <div className="h-5">
                {renderTypingIndicator()}
            </div>
             <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoadingShouts}>
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="sr-only">Refresh Feed</span>
            </Button>
        </div>

        <ScrollArea className="flex-grow rounded-md border">
            <div className="p-4 space-y-4">
                {isLoadingShouts && (
                    <div className="flex items-center justify-center h-full py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading messages...</span>
                    </div>
                )}
                {!isLoadingShouts && shouts.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No messages yet. Be the first!</p>
                )}
                {!isLoadingShouts && shouts.map((shout) => (
                    <div key={shout._id} className="flex items-start space-x-3 p-3 bg-card rounded-lg shadow-sm border">
                        <div onClick={() => setProfileViewShout(shout)} className="cursor-pointer">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${shout.userAvatarFallback}`} alt={shout.userName} data-ai-hint="avatar user"/>
                                <AvatarFallback>{shout.userAvatarFallback}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{shout.userName}</p>
                                    {shout.userRole === 'admin' && <CheckCircle className="w-4 h-4 text-blue-500" title="Admin" />}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(shout.createdAt), { addSuffix: true })}
                                    {shout.isEdited && <span className="text-xs text-muted-foreground/70"> (edited)</span>}
                                </p>
                            </div>
                            {renderShoutMessage(shout)}
                            {(currentUser?._id === shout.userId || currentUser?.role === 'admin') && (
                                <div className="mt-2 flex items-center gap-2">
                                    <Button variant="ghost" size="xs" onClick={() => openEditDialog(shout)} className="text-xs text-muted-foreground hover:text-primary">
                                        <Edit className="h-3.5 w-3.5 mr-1"/> Edit
                                    </Button>
                                    <Button variant="ghost" size="xs" onClick={() => openDeleteDialog(shout)} className="text-xs text-destructive hover:text-destructive/80">
                                        <Trash2 className="h-3.5 w-3.5 mr-1"/> Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>

        <UserMiniProfileDialog
            shout={profileViewShout}
            isOpen={!!profileViewShout}
            onOpenChange={(isOpen) => !isOpen && setProfileViewShout(null)}
        />

        {/* Edit Dialog */}
        <Dialog open={!!editingShout} onOpenChange={(isOpen) => !isOpen && setEditingShout(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Shout</DialogTitle>
                    <DialogDescription>Make changes to your message.</DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                        <FormField
                            control={editForm.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea {...field} rows={4} className="resize-none" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isEditLoading}>
                                {isEditLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!shoutToDelete} onOpenChange={(isOpen) => !isOpen && setShoutToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Delete Shout?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this shout? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDeleteConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeletingLoading}
                    >
                        {isDeletingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
