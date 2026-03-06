
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Bell, MailCheck, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAnnouncementsForUser, markAnnouncementAsRead, markAllAnnouncementsAsRead } from '@/lib/actions/announcements';
import type { LoggedInUser } from '@/lib/actions/auth';
import type { Announcement } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface NotificationBellProps {
  user: LoggedInUser | null;
}

interface AnnouncementWithReadStatus extends Announcement {
  isRead: boolean;
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithReadStatus[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getAnnouncementsForUser(user._id);
      if (result.success && result.announcements) {
        setAnnouncements(result.announcements as AnnouncementWithReadStatus[]);
        setUnreadCount(result.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, user]);

  const handleMarkAsRead = async (announcementId: string) => {
    if (!user) return;
    const optimisticAnnouncements = announcements.map(ann =>
      ann._id === announcementId ? { ...ann, isRead: true } : ann
    );
    setAnnouncements(optimisticAnnouncements);
    setUnreadCount(prev => Math.max(0, prev - 1));

    const result = await markAnnouncementAsRead(announcementId, user._id);
    if (!result.success) {
      toast({ title: "Error", description: "Failed to mark as read.", variant: "destructive" });
      fetchNotifications(); // Revert optimistic update on error
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    const optimisticAnnouncements = announcements.map(ann => ({ ...ann, isRead: true }));
    setAnnouncements(optimisticAnnouncements);
    setUnreadCount(0);

    const result = await markAllAnnouncementsAsRead(user._id);
    if (!result.success) {
      toast({ title: "Error", description: "Failed to mark all as read.", variant: "destructive" });
      fetchNotifications(); // Revert
    }
  };
  
  if (!user) return null;

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px] md:h-[400px]">
          {announcements.length === 0 && !isLoading && (
            <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
              No new notifications.
            </DropdownMenuItem>
          )}
          {announcements.map((ann) => (
            <DropdownMenuItem
              key={ann._id}
              className={`flex flex-col items-start p-3 hover:bg-muted/50 data-[highlighted]:bg-muted/80 ${!ann.isRead ? 'bg-primary/5 font-medium' : ''}`}
              onClick={() => {
                if (!ann.isRead) {
                  handleMarkAsRead(ann._id);
                }
                // Could open a modal with full message here if needed
              }}
            >
              <div className="w-full flex justify-between items-center">
                <span className={`text-sm ${!ann.isRead ? 'text-primary font-semibold' : 'text-foreground'}`}>
                  {ann.title}
                </span>
                {!ann.isRead && (
                    <Badge variant="default" className="h-2 w-2 p-0 rounded-full"></Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate w-full mt-0.5">{ann.message}</p>
              <p className="text-xs text-muted-foreground/70 mt-1 self-end">
                {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
              </p>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
        {announcements.length > 0 && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                     <DropdownMenuItem onClick={handleMarkAllAsRead} disabled={unreadCount === 0 || isLoading}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        <span>Mark all as read</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
