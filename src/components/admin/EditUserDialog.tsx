
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"; // Added missing import
import { UpdateUserRoleAdminSchema, UpdateUserCoinsAdminSchema, type UserRole } from "@/lib/schemas";
import { updateUserRoleAdmin, updateUserCoinsAdmin } from "@/lib/actions/admin";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react"; // useEffect was imported but not used, keeping it for now in case.
import { Loader2 } from "lucide-react";
import type { User } from "@/lib/types";

interface EditUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void; // Callback after successful update
}

type EditUserFormData = {
  newRole: UserRole;
  coinAdjustment: number;
};

export function EditUserDialog({ user, isOpen, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [isSubmittingCoins, setIsSubmittingCoins] = useState(false);

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(
        z.object({ // This is where 'z' was needed
          newRole: UpdateUserRoleAdminSchema.shape.newRole,
          coinAdjustment: UpdateUserCoinsAdminSchema.shape.coinAdjustment,
        })
    ),
    defaultValues: {
      newRole: user?.role || "user",
      coinAdjustment: 0,
    },
  });

  // Update form defaults when user prop changes
  // Using useEffect to reset form when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        newRole: user.role || "user",
        coinAdjustment: 0,
      });
    }
  }, [user, form.reset]);


  if (!user) return null;

  const handleRoleSubmit = async (values: { newRole: UserRole }) => {
    setIsSubmittingRole(true);
    try {
      const result = await updateUserRoleAdmin({ userId: user._id, newRole: values.newRole });
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleCoinsSubmit = async (values: { coinAdjustment: number }) => {
    setIsSubmittingCoins(true);
    try {
      const result = await updateUserCoinsAdmin({ userId: user._id, coinAdjustment: values.coinAdjustment });
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        form.setValue("coinAdjustment", 0); // Reset coin adjustment field
        onSuccess();
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmittingCoins(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.name}</DialogTitle>
          <DialogDescription>
            Modify user role and coin balance. Current email: {user.email} (cannot be changed).
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <div className="space-y-6 py-4">
            {/* Role Management Form */}
            <form onSubmit={form.handleSubmit(data => handleRoleSubmit({ newRole: data.newRole }))} className="space-y-4 p-4 border rounded-md">
              <FormField
                control={form.control}
                name="newRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmittingRole || user.role === form.getValues("newRole")}>
                {isSubmittingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Role
              </Button>
            </form>

            {/* Coin Management Form */}
            <form onSubmit={form.handleSubmit(data => handleCoinsSubmit({ coinAdjustment: data.coinAdjustment }))} className="space-y-4 p-4 border rounded-md">
               <FormField
                control={form.control}
                name="coinAdjustment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjust Coins (Current: {user.coins.toLocaleString()})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 50 or -20" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmittingCoins || form.getValues("coinAdjustment") === 0}>
                {isSubmittingCoins && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adjust Coins
              </Button>
            </form>
          </div>
        </Form>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
