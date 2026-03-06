
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UpdateProfileSchema, type UpdateProfileInput } from "@/lib/schemas";
import { updateProfile } from "@/lib/actions/user";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, UserCog } from "lucide-react";
import type { LoggedInUser } from "@/lib/actions/auth";

interface UpdateProfileFormProps {
  user: LoggedInUser | null;
}

export function UpdateProfileForm({ user }: UpdateProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name });
    }
  }, [user, form.reset]);

  async function onSubmit(values: UpdateProfileInput) {
    setIsLoading(true);
    try {
      const result = await updateProfile(values);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        // The revalidatePath in the server action should handle refreshing the UI
        // Forcing a reload might be too disruptive: router.refresh();
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return <p>Loading user data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Email change is more complex and usually requires verification, so it's omitted for now
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} type="email" disabled />
              </FormControl>
              <FormDescription>Email address cannot be changed through this form.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        */}
        <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
          Update Profile
        </Button>
      </form>
    </Form>
  );
}
