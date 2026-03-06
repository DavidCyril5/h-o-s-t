
"use server";

import { getDb } from "@/lib/mongodb";
import { getLoggedInUser, logoutUser } from "@/lib/actions/auth";
import bcrypt from 'bcryptjs';
import { differenceInHours } from 'date-fns';
import type { User, Deployment, BannedRegisterIp } from "@/lib/types";
import type { TransferCoinsInput, ChangePasswordInput, UpdateProfileInput, DeleteAccountInput } from "@/lib/schemas";
import { revalidatePath } from 'next/cache';
import type { Db } from "mongodb";
import { logCoinTransaction } from "./transactions"; // Added import

const COIN_BAN_THRESHOLD = 5000;

async function checkAndPotentiallyBanUser(userId: string, db: Db): Promise<void> {
  try {
    const usersCollection = db.collection<User>("users");
    const bannedIpsCollection = db.collection<BannedRegisterIp>("banned_register_ips");
    
    const user = await usersCollection.findOne({ _id: userId });

    if (!user || user.role === 'admin' || user.isBanned) {
      return; 
    }

    if (user.coins > COIN_BAN_THRESHOLD) {
      console.log(`User ${user.email} (ID: ${user._id}) exceeded coin threshold (${user.coins} > ${COIN_BAN_THRESHOLD}). Banning user.`);
      const updates: Partial<User> = { isBanned: true };
      await usersCollection.updateOne({ _id: user._id }, { $set: updates });

      if (user.registrationIp) {
        console.log(`Adding registration IP ${user.registrationIp} for banned user ${user.email} to banned IP list.`);
        await bannedIpsCollection.updateOne(
          { ip: user.registrationIp },
          { $setOnInsert: { ip: user.registrationIp, reason: `Auto-ban: User ${user.email} exceeded coin threshold.`, bannedAt: new Date() } },
          { upsert: true }
        );
      }
      revalidatePath("/admin/dashboard"); 
      revalidatePath("/dashboard/profile");
    }
  } catch (error) {
    console.error(`Error in checkAndPotentiallyBanUser for ${userId}:`, error);
  }
}


export async function transferCoins(data: TransferCoinsInput): Promise<{ success: boolean; message: string; newSenderBalance?: number }> {
  const sender = await getLoggedInUser();
  if (!sender) {
    return { success: false, message: "You must be logged in to transfer coins." };
  }
  if (sender.isBanned) {
    return { success: false, message: "This account is suspended and cannot transfer coins." };
  }

  if (data.amount <= 0) {
    return { success: false, message: "Transfer amount must be positive." };
  }
  if (sender.coins < data.amount) { 
    return { success: false, message: "Insufficient coin balance." };
  }
  if (sender.email === data.recipientEmail) {
    return { success: false, message: "You cannot transfer coins to yourself." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const recipient = await usersCollection.findOne({ email: data.recipientEmail });
    if (!recipient) {
      return { success: false, message: "Recipient user not found." };
    }
    if (recipient.isBanned) {
        return { success: false, message: "Cannot transfer coins to a suspended account." };
    }

    const freshSenderData = await usersCollection.findOneAndUpdate(
      { _id: sender._id, coins: { $gte: data.amount } }, // Ensure sender still has enough coins
      { $inc: { coins: -data.amount } },
      { returnDocument: "after" }
    );

    if (!freshSenderData) {
      return { success: false, message: "Insufficient coin balance or sender not found. Please refresh and try again." };
    }
    
    await logCoinTransaction({
      userId: sender._id,
      type: 'transfer_sent',
      amount: -data.amount,
      description: `Transferred ${data.amount} coins to ${recipient.email}.`,
      balanceAfter: freshSenderData.coins,
      relatedUserId: recipient._id.toString(),
    });


    const recipientUpdateResult = await usersCollection.findOneAndUpdate(
      { _id: recipient._id }, 
      { $inc: { coins: data.amount } },
      { returnDocument: "after"}
    );

    if (!recipientUpdateResult) {
      // Rollback sender's coins if recipient update failed
      await usersCollection.updateOne(
        { _id: sender._id }, 
        { $inc: { coins: data.amount } }
      );
      // TODO: Log rollback or failed transaction for sender
      return { success: false, message: "Failed to transfer coins to recipient. Your balance has been restored." };
    }

    await logCoinTransaction({
      userId: recipient._id.toString(),
      type: 'transfer_received',
      amount: data.amount,
      description: `Received ${data.amount} coins from ${sender.email}.`,
      balanceAfter: recipientUpdateResult.coins,
      relatedUserId: sender._id,
    });

    await checkAndPotentiallyBanUser(recipient._id.toString(), db); 

    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Successfully transferred ${data.amount} coins to ${recipient.name}.`,
      newSenderBalance: freshSenderData.coins,
    };

  } catch (error) {
    console.error("Error transferring coins:", error);
    return { success: false, message: "An unexpected error occurred during the transfer." };
  }
}

export async function updateProfile(data: UpdateProfileInput): Promise<{ success: boolean; message: string }> {
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    return { success: false, message: "You must be logged in to update your profile." };
  }
   if (loggedInUser.isBanned) {
    return { success: false, message: "This account is suspended and cannot update profile." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const result = await usersCollection.updateOne(
      { _id: loggedInUser._id }, 
      { $set: { name: data.name } }
    );

    if (result.modifiedCount === 0 && result.matchedCount > 0) {
      return { success: true, message: "No changes detected in profile information." };
    }
    if (result.modifiedCount === 0) { 
      return { success: false, message: "Failed to update profile. User not found." };
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard');
    return { success: true, message: "Profile updated successfully." };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, message: "An unexpected error occurred while updating profile." };
  }
}

export async function changePassword(data: ChangePasswordInput): Promise<{ success: boolean; message: string }> {
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    return { success: false, message: "You must be logged in to change your password." };
  }
  if (loggedInUser.isBanned) {
    return { success: false, message: "This account is suspended and cannot change password." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const userFromDb = await usersCollection.findOne({ _id: loggedInUser._id }); 
    if (!userFromDb) {
      return { success: false, message: "User not found." };
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, userFromDb.passwordHash);
    if (!isCurrentPasswordValid) {
      return { success: false, message: "Incorrect current password." };
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
    await usersCollection.updateOne(
      { _id: loggedInUser._id }, 
      { $set: { passwordHash: newPasswordHash } }
    );

    return { success: true, message: "Password changed successfully." };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, message: "An unexpected error occurred while changing password." };
  }
}

export async function deleteUserAccount(data: DeleteAccountInput): Promise<{ success: boolean; message: string }> {
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    return { success: false, message: "You must be logged in to delete your account." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");
    const deploymentsCollection = db.collection<Deployment>("deployments");

    const userFromDb = await usersCollection.findOne({ _id: loggedInUser._id }); 
    if (!userFromDb) {
      return { success: false, message: "User not found." };
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, userFromDb.passwordHash);
    if (!isCurrentPasswordValid) {
      return { success: false, message: "Incorrect password. Account deletion failed." };
    }

    if (userFromDb.role === 'admin') {
      const adminCount = await usersCollection.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return { success: false, message: "Cannot delete the last admin account. Promote another user to admin first." };
      }
    }

    await deploymentsCollection.deleteMany({ userId: loggedInUser._id }); 
    // TODO: Also delete associated coin transactions if desired

    const deleteResult = await usersCollection.deleteOne({ _id: loggedInUser._id }); 
    if (deleteResult.deletedCount === 0) {
      return { success: false, message: "Failed to delete user account from the database." };
    }

    await logoutUser(); 

    return { success: true, message: "Account and associated deployments deleted successfully. You have been logged out." };

  } catch (error) {
    console.error("Error deleting account:", error);
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error; 
    }
    return { success: false, message: "An unexpected error occurred while deleting your account." };
  }
}
