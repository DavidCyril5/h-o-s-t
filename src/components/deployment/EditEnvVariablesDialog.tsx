
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DeploymentFormInputSchema, type DeploymentFormInput } from "@/lib/schemas";
import { updateDeploymentEnvVariables } from "@/lib/actions/deployment";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Settings2, Save, ExternalLink } from "lucide-react";
import type { Deployment } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

interface EditEnvVariablesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deployment: Deployment;
  onSuccess: () => void;
}

interface EnvVarField {
  name: keyof Omit<DeploymentFormInput, "PLATFORM_APP_NAME">; // Exclude PLATFORM_APP_NAME
  label: string;
  description: string;
  type: "text" | "boolean" | "textarea" | "password";
  placeholder?: string;
  required?: boolean;
}

// Re-using a similar structure as DeploymentForm, adapted for editing
const envVarFieldsList: Omit<EnvVarField, 'name'> & { name: string }[] = [
  { name: "SESSION_ID", label: "Session ID", description: "Your WhatsApp session ID. This is mandatory.", type: "textarea", placeholder: "Enter your full session ID here", required: true },
  { name: "BOT_NAME", label: "Bot Name", description: "The name of your bot.", type: "text", placeholder: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟒" },
  { name: "OWNER_NUMBER", label: "Owner Numbers", description: "Comma-separated list of owner WhatsApp numbers (e.g., 234...).", type: "text", placeholder: "2347043759577,2348123456789" },
  { name: "OWNER_NAME", label: "Owner Name", description: "The name of the bot owner.", type: "text", placeholder: "David Cyril" },
  { name: "PACK_NAME", label: "Sticker Pack Name", description: "Default name for sticker packs.", type: "text", placeholder: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟒 Pack" },
  { name: "AUTHOR", label: "Sticker Author Name", description: "Default author for sticker packs.", type: "text", placeholder: "𝐃𝐀𝐕𝐈𝐃 𝐂𝐘𝐑𝐈𝐋" },
  { name: "CHANNEL_NAME", label: "Channel Name", description: "Name of your WhatsApp channel.", type: "text", placeholder: "𝐃𝐀𝐕𝐈𝐃 𝐂𝐘𝐑𝐈𝐋 Updates" },
  { name: "CHANNEL_JID", label: "Channel JID", description: "JID of your WhatsApp channel.", type: "text", placeholder: "120363315231436175@newsletter" },
  { name: "AUTO_TYPING", label: "Auto Typing", description: "Enable automatic typing indicator.", type: "boolean" },
  { name: "AUTO_RECORD", label: "Auto Recording", description: "Enable automatic recording indicator.", type: "boolean" },
  { name: "AUTO_VIEW_STATUS", label: "Auto View Status", description: "Automatically view contacts' statuses.", type: "boolean" },
  { name: "AUTO_STATUS_REACT", label: "Auto React to Status", description: "Automatically react to statuses.", type: "boolean" },
  { name: "LEVELUP", label: "Level Up System", description: "Enable the leveling system for users.", type: "boolean" },
  { name: "ANTIVIEWONCE", label: "Anti View Once", description: "Save view-once messages.", type: "boolean" },
  { name: "PUBLIC", label: "Public Mode", description: "Allow anyone to use the bot commands.", type: "boolean" },
  { name: "ANTIDELETE", label: "Anti Delete Messages", description: "Prevent users from deleting messages for the bot.", type: "boolean" },
  { name: "ANTI_TAG", label: "Anti Tag All", description: "Prevent tagging everyone in a group.", type: "boolean" },
  { name: "ANTI_TEMU", label: "Anti Temu Links", description: "Block Temu links.", type: "boolean" },
  { name: "UNAVAILABLE", label: "Bot Unavailable Mode", description: "Set bot to unavailable status.", type: "boolean" },
  { name: "AVAILABLE", label: "Bot Available Mode", description: "Set bot to available status (overrides unavailable).", type: "boolean" },
  { name: "AUTO_READ_MESSAGES", label: "Auto Read Messages", description: "Mark messages as read automatically.", type: "boolean" },
  { name: "CHATBOT", label: "Enable Chatbot", description: "Enable AI chatbot functionality.", type: "boolean" },
  { name: "AUTO_REACT", label: "Auto React to Messages", description: "Automatically react to incoming messages.", type: "boolean" },
  { name: "WELCOME", label: "Welcome Messages", description: "Send welcome messages to new group members.", type: "boolean" },
  { name: "AUTO_LIKE_EMOJI", label: "Auto Like Emoji", description: "Emoji used for auto-liking.", type: "text", placeholder: "💚" },
  { name: "SUDO_USERS", label: "Sudo Users", description: "Comma-separated list of sudo user WhatsApp numbers.", type: "text", placeholder: "2349066528353" },
  { name: "PREFIX", label: "Command Prefix", description: "The prefix for bot commands.", type: "text", placeholder: "." },
];

// Filter out PLATFORM_APP_NAME as it's not directly editable as an env var post-creation
const editableEnvVarFields = envVarFieldsList.filter(field => field.name !== "PLATFORM_APP_NAME") as EnvVarField[];

const groupFields = (fields: EnvVarField[]) => {
    const groups: Record<string, EnvVarField[]> = {
      "Core Configuration": [],
      "Bot Identity & Ownership": [],
      "Sticker Settings": [],
      "Channel Integration": [],
      "Automation Features": [],
      "Moderation & Utility": [],
      "Miscellaneous": [],
    };
    fields.forEach(field => {
      if (["SESSION_ID"].includes(field.name)) groups["Core Configuration"].push(field);
      else if (["BOT_NAME", "OWNER_NUMBER", "OWNER_NAME", "SUDO_USERS", "PUBLIC", "PREFIX"].includes(field.name)) groups["Bot Identity & Ownership"].push(field);
      else if (["PACK_NAME", "AUTHOR"].includes(field.name)) groups["Sticker Settings"].push(field);
      else if (["CHANNEL_NAME", "CHANNEL_JID"].includes(field.name)) groups["Channel Integration"].push(field);
      else if (field.type === "boolean" && field.name.startsWith("AUTO_") && field.name !== "AUTO_LIKE_EMOJI") groups["Automation Features"].push(field);
      else if (field.type === "boolean" && ["ANTIVIEWONCE", "ANTIDELETE", "ANTI_TAG", "ANTI_TEMU", "LEVELUP", "WELCOME", "UNAVAILABLE", "AVAILABLE", "CHATBOT"].includes(field.name)) groups["Moderation & Utility"].push(field);
      else groups["Miscellaneous"].push(field);
    });
    return groups;
  };

const groupedEditableFields = groupFields(editableEnvVarFields);


export function EditEnvVariablesDialog({ isOpen, onOpenChange, deployment, onSuccess }: EditEnvVariablesDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DeploymentFormInput>({
    resolver: zodResolver(DeploymentFormInputSchema),
    defaultValues: deployment.envVariables || {},
  });

  useEffect(() => {
    if (deployment.envVariables) {
      form.reset(deployment.envVariables);
    }
  }, [deployment, form.reset, isOpen]);

  async function onSubmit(values: DeploymentFormInput) {
    setIsLoading(true);
    try {
      const result = await updateDeploymentEnvVariables(deployment.id, values);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings2 className="mr-2 h-5 w-5 text-primary" />
            Edit Environment Variables for {deployment.appName}
          </DialogTitle>
          <DialogDescription>
            Modify the environment variables for this deployment. Changes will trigger an app restart.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <Accordion type="multiple" className="w-full" defaultValue={["Core Configuration", "Bot Identity & Ownership"]}>
                {Object.entries(groupedEditableFields).map(([groupName, fields]) => (
                  fields.length > 0 && (
                  <AccordionItem value={groupName} key={groupName}>
                    <AccordionTrigger className="text-md font-semibold hover:no-underline">{groupName}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6 pt-4">
                      {fields.map((envField) => (
                        <FormField
                          key={envField.name}
                          control={form.control}
                          name={envField.name as any} // Cast because PLATFORM_APP_NAME is omitted
                          render={({ field }) => (
                            <FormItem className={envField.type === "boolean" ? "flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" : ""}>
                              <div className={envField.type === "boolean" ? "space-y-0.5" : "space-y-1"}>
                                <FormLabel>{envField.label} {envField.required && <span className="text-destructive">*</span>}</FormLabel>
                                <FormDescription>{envField.description}</FormDescription>
                                {envField.name === "SESSION_ID" && (
                                  <Button variant="outline" size="xs" asChild className="mt-1">
                                    <Link href="https://pair.david-cyril.net.ng" target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                      Get Session ID
                                    </Link>
                                  </Button>
                                )}
                              </div>
                              <FormControl>
                                {envField.type === "boolean" ? (
                                  <Switch
                                    checked={field.value as boolean}
                                    onCheckedChange={field.onChange}
                                  />
                                ) : envField.type === "textarea" ? (
                                  <Textarea placeholder={envField.placeholder} {...field} rows={3} />
                                ) : envField.type === "password" ? (
                                  <Input type="password" placeholder={envField.placeholder} {...field} />
                                ) : (
                                  <Input placeholder={envField.placeholder} {...field} />
                                )}
                              </FormControl>
                              {envField.type !== "boolean" && <FormMessage />}
                            </FormItem>
                          )}
                        />
                      ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )
                ))}
              </Accordion>
              
              <DialogFooter className="sticky bottom-0 bg-background py-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
