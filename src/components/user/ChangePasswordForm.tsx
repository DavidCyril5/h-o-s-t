
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
import { ChangePasswordSchema, type ChangePasswordInput } from "@/lib/schemas";
import { changePassword } from "@/lib/actions/user";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  text: string;
  meetsMinLength: boolean;
  hasLowerCase: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const getPasswordStrength = (password: string): PasswordStrengthResult => {
  const result: PasswordStrengthResult = {
    score: 0,
    text: "Too short",
    meetsMinLength: false,
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  };

  if (!password) {
     result.text = "Enter a password";
     return result;
  }
  
  if (password.length >= 8) {
    result.meetsMinLength = true;
  } else {
    result.text = "Too short (min 8 chars)";
    return result; // Early exit if too short
  }

  let score = 1; // Base score for meeting min length

  if (/[a-z]/.test(password)) {
    result.hasLowerCase = true;
    score++;
  }
  if (/[A-Z]/.test(password)) {
    result.hasUpperCase = true;
    score++;
  }
  if (/[0-9]/.test(password)) {
    result.hasNumber = true;
    score++;
  }
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.hasSpecialChar = true;
    score++;
  }

  // Determine display score based on criteria met, capped at 4
  let criteriaCount = (result.hasLowerCase ? 1:0) + (result.hasUpperCase ? 1:0) + (result.hasNumber ? 1:0) + (result.hasSpecialChar ? 1:0);
  
  if (criteriaCount === 0) result.score = 1; // Only length met
  else if (criteriaCount === 1) result.score = 2; // Length + 1 criterion
  else if (criteriaCount === 2) result.score = 3; // Length + 2 criteria
  else if (criteriaCount >= 3) result.score = 4; // Length + 3 or 4 criteria

  if (result.score <= 1) result.text = "Weak";
  else if (result.score === 2) result.text = "Medium";
  else if (result.score === 3) result.text = "Good";
  else if (result.score >= 4) result.text = "Strong";
  
  return result;
};

const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const newPasswordValue = form.watch("newPassword");
  const passwordStrength = getPasswordStrength(newPasswordValue || "");

  async function onSubmit(values: ChangePasswordInput) {
    setIsLoading(true);
    try {
      const result = await changePassword(values);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        form.reset();
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showCurrentPassword ? (
                      <EyeOff
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowCurrentPassword(false)}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowCurrentPassword(true)}
                      />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showNewPassword ? (
                      <EyeOff
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowNewPassword(false)}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowNewPassword(true)}
                      />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Must be 8+ characters and include uppercase, lowercase, number, and special character.
              </FormDescription>
              <FormMessage />
              {newPasswordValue && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Strength: {passwordStrength.text}</span>
                  </div>
                  <div className="flex h-2 w-full rounded-full bg-muted overflow-hidden">
                     {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-full transition-all duration-300",
                          i < passwordStrength.score ? strengthColors[passwordStrength.score -1] : 'bg-muted',
                           "w-1/4" 
                        )}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    ))}
                  </div>
                  {passwordStrength.score > 0 && passwordStrength.score < 4 && (
                     <ul className="list-disc list-inside text-xs mt-1 text-muted-foreground">
                        {!passwordStrength.meetsMinLength && <li>At least 8 characters</li>}
                        {!passwordStrength.hasUpperCase && <li>An uppercase letter</li>}
                        {!passwordStrength.hasLowerCase && <li>A lowercase letter</li>}
                        {!passwordStrength.hasNumber && <li>A number</li>}
                        {!passwordStrength.hasSpecialChar && <li>A special character (!@#$...)</li>}
                     </ul>
                   )}
                </div>
              )}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showConfirmNewPassword ? (
                      <EyeOff
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowConfirmNewPassword(false)}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowConfirmNewPassword(true)}
                      />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Change Password
        </Button>
      </form>
    </Form>
  );
}
