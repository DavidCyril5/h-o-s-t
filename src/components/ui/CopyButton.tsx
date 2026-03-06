
"use client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
  buttonText?: string;
  toastMessage?: string;
  className?: string;
}

export function CopyButton({ textToCopy, buttonText = "Copy", toastMessage = "Copied to clipboard!", className }: CopyButtonProps) {
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: toastMessage }))
      .catch(() => toast({ title: "Failed to copy", variant: "destructive" }));
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className={className}>
      <Copy className="mr-2 h-4 w-4" /> {buttonText}
    </Button>
  );
}
