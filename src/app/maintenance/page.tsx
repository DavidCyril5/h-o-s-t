
import { getMaintenanceModeSettings } from "@/lib/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer } from "lucide-react"; // Or another appropriate icon

export const dynamic = 'force-dynamic'; // Ensure it fetches the latest settings

export default async function MaintenancePage() {
  const settings = await getMaintenanceModeSettings();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-lg shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-6">
            <Hammer className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            Under Maintenance
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            We are currently performing scheduled maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-md text-foreground/90 whitespace-pre-line">
            {settings.message || "We'll be back online shortly. Thank you for your patience!"}
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            &copy; {new Date().getFullYear()} Anita Deploy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
