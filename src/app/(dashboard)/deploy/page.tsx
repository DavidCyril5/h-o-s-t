import { DeploymentForm } from "@/components/deployment/DeploymentForm";
import AdBanner from "@/components/AdBanner"; // ✅ Add this import

export default function NewDeploymentPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Create a New Deployment</h1>
      <p className="text-muted-foreground">
        Fill out the form below to deploy your Anita-V4 bot to your preferred platform.
      </p>

      {/* ✅ AdSense Banner */}
      <AdBanner />

      {/* Deployment Form */}
      <DeploymentForm />
    </div>
  );
}
