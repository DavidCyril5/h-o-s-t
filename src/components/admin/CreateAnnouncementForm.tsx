
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreateAnnouncementSchema, type CreateAnnouncementInput } from "@/lib/schemas";
import { createAnnouncement } from "@/lib/actions/announcements";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export function CreateAnnouncementForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateAnnouncementInput>({
    resolver: zodResolver(CreateAnnouncementSchema),
    defaultValues: {
      title: "",
      message: "",
    },
  });

  async function onSubmit(values: CreateAnnouncementInput) {
    setIsLoading(true);
    try {
      const result = await createAnnouncement(values);
      toast({
        title: result.success ? "Success!" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        form.reset();
        // Optionally, trigger a re-fetch of announcements list if displayed on the same page
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Announcement Title</FormLabel>
              <FormControl>
                <Input placeholder="E.g., System Maintenance Alert" {...field} />
              </FormControl>
              <FormDescription>
                A brief and clear title for your announcement.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Announcement Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the full announcement message here..."
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The main content of your announcement. Max 1000 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Announcement
        </Button>
      </form>
    </Form>
  );
}
