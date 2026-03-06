import { CreateAnnouncementForm } from "@/components/admin/CreateAnnouncementForm";
import { AdminAnnouncementsList } from "@/components/admin/AdminAnnouncementsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import AdBanner from "@/components/AdBanner"; // ✅ AdSense banner component

export const dynamic = 'force-dynamic';

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <Megaphone className="mr-3 h-8 w-8 text-primary" /> Manage Announcements
        </h1>
        <p className="text-muted-foreground">Create and view platform-wide announcements.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Create New Announcement</CardTitle>
          <CardDescription>This announcement will be visible to all users via the notification bell.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAnnouncementForm />
        </CardContent>
      </Card>

      {/* ✅ Ad Banner inserted here */}
      <AdBanner />

      <Separator />

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Existing Announcements</CardTitle>
          <CardDescription>A list of all announcements sent out.</CardDescription>
        </CardHeader>
        <CardContent>
            <AdminAnnouncementsList />
        </CardContent>
      </Card>
    </div>
  );
}
