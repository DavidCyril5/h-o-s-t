
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { createNewDeployment } from "@/lib/actions/deployment";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Loader2, Rocket, Github, Coins, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const DEPLOYMENT_COST = 50; 

interface EnvVarField {
  name: keyof Omit<DeploymentFormInput, "githubRepoUrl" | "anitaVersion">;
  label: string;
  description: string;
  type: "text" | "boolean" | "textarea" | "password";
  placeholder?: string;
  required?: boolean;
}

const envVarFields: EnvVarField[] = [
  { name: "SESSION_ID", label: "Session ID", description: "Your WhatsApp session ID. This is mandatory.", type: "textarea", placeholder: "Enter your full session ID here", required: true },
  { name: "PLATFORM_APP_NAME", label: "App Name (Optional)", description: "Custom name for your app on the platform. If blank, one will be generated.", type: "text", placeholder: "my-anita-bot" },
  { name: "BOT_NAME", label: "Bot Name", description: "The name of your bot.", type: "text", placeholder: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟓" },
  { name: "OWNER_NUMBER", label: "Owner Numbers", description: "Comma-separated list of owner WhatsApp numbers (e.g., 234...).", type: "text", placeholder: "2347043759577,2348123456789" },
  { name: "OWNER_NAME", label: "Owner Name", description: "The name of the bot owner.", type: "text", placeholder: "David Cyril" },
  { name: "PACK_NAME", label: "Sticker Pack Name", description: "Default name for sticker packs.", type: "text", placeholder: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟓 Pack" },
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

export function DeploymentForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DeploymentFormInput>({
    resolver: zodResolver(DeploymentFormInputSchema),
    defaultValues: {
      anitaVersion: "V5",
      SESSION_ID: "",
      PLATFORM_APP_NAME: "",
      OWNER_NUMBER: "2347043759577,2348123456789",
      BOT_NAME: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟓",
      OWNER_NAME: "David Cyril",
      PACK_NAME: "𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-𝐕𝟓",
      AUTHOR: "𝐃𝐀𝐕𝐈𝐃 𝐂𝐘𝐑𝐈𝐋",
      CHANNEL_NAME: "𝐃𝐀𝐕𝐈𝐃 𝐂𝐘𝐑𝐈𝐋",
      CHANNEL_JID: "120363315231436175@newsletter",
      AUTO_TYPING: false,
      AUTO_RECORD: false,
      AUTO_VIEW_STATUS: true,
      AUTO_STATUS_REACT: false,
      AUTO_LIKE_EMOJI: "💚",
      LEVELUP: false,
      ANTIVIEWONCE: false,
      SUDO_USERS: "2349066528353,2348129988915",
      PUBLIC: true,
      ANTIDELETE: false,
      ANTI_TAG: false,
      ANTI_TEMU: false,
      UNAVAILABLE: true,
      AVAILABLE: false,
      AUTO_READ_MESSAGES: false,
      CHATBOT: false,
      AUTO_REACT: false,
      WELCOME: false,
      PREFIX: ".",
    },
  });

  const selectedVersion = form.watch("anitaVersion");

  useEffect(() => {
    const version = selectedVersion.slice(1); // Remove "V"
    form.setValue("BOT_NAME", `𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-${selectedVersion}`);
    form.setValue("PACK_NAME", `𝐐𝐔𝐄𝐄𝐍_𝐀𝐍𝐈𝐓𝐀-${selectedVersion} Pack`);
  }, [selectedVersion, form]);

  async function onSubmit(values: DeploymentFormInput) {
    setIsLoading(true);
    try {
      const result = await createNewDeployment(values);
      if (result.success && result.deployment) {
        toast({
          title: "Deployment Initiated",
          description: result.message,
        });
        router.push(`/dashboard/deployments/${result.deployment.id}`);
      } else {
        toast({
          title: "Deployment Failed",
          description: result.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
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
      if (["SESSION_ID", "PLATFORM_APP_NAME"].includes(field.name)) groups["Core Configuration"].push(field);
      else if (["BOT_NAME", "OWNER_NUMBER", "OWNER_NAME", "SUDO_USERS", "PUBLIC", "PREFIX"].includes(field.name)) groups["Bot Identity & Ownership"].push(field);
      else if (["PACK_NAME", "AUTHOR"].includes(field.name)) groups["Sticker Settings"].push(field);
      else if (["CHANNEL_NAME", "CHANNEL_JID"].includes(field.name)) groups["Channel Integration"].push(field);
      else if (field.type === "boolean" && field.name.startsWith("AUTO_")) groups["Automation Features"].push(field);
      else if (field.type === "boolean" && ["ANTIVIEWONCE", "ANTIDELETE", "ANTI_TAG", "ANTI_TEMU", "LEVELUP", "WELCOME", "UNAVAILABLE", "AVAILABLE", "CHATBOT"].includes(field.name)) groups["Moderation & Utility"].push(field);
      else groups["Miscellaneous"].push(field);
    });
    return groups;
  };

  const groupedFields = groupFields(envVarFields);
  const githubRepoUrl = `https://github.com/DavidCyrilTech/Anita-${selectedVersion}`;

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
            <Rocket className="mr-2 h-6 w-6 text-primary"/> Configure Your Anita-{selectedVersion} Deployment
        </CardTitle>
        <CardDescription>
          Fill in the details below to deploy your Anita-{selectedVersion} bot.
          The deployment platform API key is pre-configured on the server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
              control={form.control}
              name="anitaVersion"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Select Anita Version</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="V5" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Anita V5 (Recommended)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="V4" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Anita V4
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="V3" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Anita V3
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">GitHub Repository</label>
              <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                <Github className="h-5 w-5 text-foreground/70" />
                <p className="text-sm text-foreground">
                  {githubRepoUrl}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This deployment will use the official Anita-{selectedVersion} repository.
              </p>
            </div>

            <Alert variant="default" className="bg-primary/10 border-primary/30">
              <AlertCircle className="h-4 w-4 !text-primary" />
              <AlertTitle className="text-primary">Important</AlertTitle>
              <AlertDescription>
                Ensure your Session ID is correct. An incorrect Session ID will lead to deployment failure.
                 Need help getting your Session ID? 
                 <Button variant="link" asChild className="p-0 h-auto ml-1 text-base">
                    <Link href="https://pair.david-cyril.net.ng" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline font-medium">
                        Click here
                        <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                 </Button>
              </AlertDescription>
            </Alert>

            <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/30">
                <Coins className="h-4 w-4 !text-yellow-600" />
                <AlertTitle className="text-yellow-700">Deployment Cost</AlertTitle>
                <AlertDescription className="text-yellow-600">
                    Deploying a new bot costs {DEPLOYMENT_COST} coins. Admins deploy for free.
                </AlertDescription>
            </Alert>
            
            <Accordion type="multiple" className="w-full" defaultValue={["Core Configuration", "Bot Identity & Ownership"]}>
              {Object.entries(groupedFields).map(([groupName, fields]) => (
                fields.length > 0 && (
                <AccordionItem value={groupName} key={groupName}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">{groupName}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                    {fields.map((envField) => (
                      <FormField
                        key={envField.name}
                        control={form.control}
                        name={envField.name}
                        render={({ field }) => (
                          <FormItem className={envField.type === "boolean" ? "flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm" : ""}>
                            <div className={envField.type === "boolean" ? "space-y-0.5" : "space-y-1"}>
                              <FormLabel>{envField.label} {envField.required && <span className="text-destructive">*</span>}</FormLabel>
                              <FormDescription>{envField.description}</FormDescription>
                              {envField.name === "SESSION_ID" && (
                                <Button variant="outline" size="sm" asChild className="mt-2">
                                  <Link href="https://pair.david-cyril.net.ng" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
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
                                <Textarea placeholder={envField.placeholder} {...field as any} rows={3} />
                              ) : envField.type === "password" ? (
                                <Input type="password" placeholder={envField.placeholder} {...field as any} />
                              ) : (
                                <Input placeholder={envField.placeholder} {...field as any} />
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

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" /> Deploy Application
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
