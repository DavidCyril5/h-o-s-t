
"use client";

import { useEffect, useState } from "react";
import { getAdminAnnouncements, deleteAnnouncement } from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Inbox, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // No longer used directly in the loop
} from "@/components/ui/alert-dialog";

export function AdminAnnouncementsList() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false); // State to control dialog visibility
    const { toast } = useToast();

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAdminAnnouncements();
            if (result.success && result.announcements) {
                setAnnouncements(result.announcements);
            } else {
                setError(result.message || "Failed to load announcements.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const openDeleteDialog = (ann: Announcement) => {
        setAnnouncementToDelete(ann);
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!announcementToDelete) return;
        setIsDeleting(announcementToDelete._id);
        try {
            const result = await deleteAnnouncement(announcementToDelete._id);
            toast({
                title: result.success ? "Success!" : "Error",
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
            if (result.success) {
                setAnnouncements(prev => prev.filter(ann => ann._id !== announcementToDelete._id));
                setIsDialogOpen(false); // Close dialog on success
                setAnnouncementToDelete(null);
            }
        } catch (err) {
            toast({ title: "Error", description: "An unexpected error occurred during deletion.", variant: "destructive" });
        } finally {
            setIsDeleting(null);
            // No need to setAnnouncementToDelete(null) here if dialog closes, onOpenChange will handle
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading announcements...</span>
            </div>
        );
    }

    if (error) {
        return <p className="text-destructive">Error: {error}</p>;
    }

    if (announcements.length === 0) {
        return (
            <div className="text-center py-8">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No announcements have been sent yet.</p>
            </div>
        );
    }

    return (
        <>
            <ScrollArea className="h-[500px] w-full rounded-md border p-0">
                <div className="space-y-4 p-4">
                {announcements.map((ann) => (
                    <Card key={ann._id} className="shadow-sm hover:shadow-md">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{ann.title}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openDeleteDialog(ann)}
                                        disabled={isDeleting === ann._id}
                                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                    >
                                        {isDeleting === ann._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <CardDescription className="text-xs">
                                Sent by: Admin ({ann.createdBy.slice(-6)})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-foreground/90 whitespace-pre-line">{ann.message}</p>
                             <p className="text-xs text-muted-foreground mt-2">
                                Read by: {(ann.isReadByUserIds || []).length} user(s)
                            </p>
                        </CardContent>
                    </Card>
                ))}
                </div>
            </ScrollArea>
            
            <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setAnnouncementToDelete(null); // Clear selection when dialog closes
                }
            }}>
                {announcementToDelete && (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                                Delete Announcement?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the announcement titled &quot;{announcementToDelete.title}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isDeleting === announcementToDelete._id}
                            >
                                {isDeleting === announcementToDelete._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
            </AlertDialog>
        </>
    );
}
