
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
import { RegisterSchema, type RegisterInput } from "@/lib/schemas";
import { registerUser } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
    },
  });

  const passwordValue = form.watch("password");
  const passwordStrength = getPasswordStrength(passwordValue || "");

  async function onSubmit(values: RegisterInput) {
    setIsLoading(true);
    try {
      const result = await registerUser(values);
      if (result.success) {
        toast({
          title: "Registration Complete!",
          description: result.message,
        });
        router.push('/login');
      } else {
        toast({
          title: "Registration Failed",
          description: result.message,
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showPassword ? (
                      <EyeOff
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowPassword(false)}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowPassword(true)}
                      />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Must be 8+ characters and include uppercase, lowercase, number, and special character.
              </FormDescription>
              <FormMessage />
              {passwordValue && (
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
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showConfirmPassword ? (
                      <EyeOff
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowConfirmPassword(false)}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={() => setShowConfirmPassword(true)}
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
          name="referralCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referral Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter referral code" {...field} />
              </FormControl>
              <FormDescription>If you were referred by someone, enter their code here.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </Form>
  );
}
