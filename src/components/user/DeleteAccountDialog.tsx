
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeleteAccountSchema } from "@/lib/schemas"; // Changed import
import type { DeleteAccountInput } from "@/lib/schemas"; // Changed import
import { deleteUserAccount } from "@/lib/actions/user";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteAccountDialogProps {
  children: React.ReactNode; // For the trigger button
}

export function DeleteAccountDialog({ children }: DeleteAccountDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(DeleteAccountSchema),
    defaultValues: {
      currentPassword: "",
    },
  });

  async function onSubmit(values: DeleteAccountInput) {
    setIsLoading(true);
    try {
      const result = await deleteUserAccount(values);
      // If successful, the server action redirects, so a success toast might not be seen here.
      // The page will change.
      if (!result.success) {
        toast({
          title: "Deletion Failed",
          description: result.message,
          variant: "destructive",
        });
      } else {
        // On successful deletion and redirect by server action, this dialog will unmount.
        // A toast for successful deletion could be triggered on the destination page if needed.
        setIsOpen(false); 
      }
    } catch (error: any) {
      if (error.message?.includes('NEXT_REDIRECT')) {
        // This is an expected error during redirect handled by Next.js.
      } else {
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account,
            all your deployments, and remove your data from our servers.
            <br />
            <br />
            To confirm, please enter your current password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading || !form.formState.isValid}
                formAction="" // Prevents form submission if AlertDialogAction is used as button
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                )}
                Delete Account
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
