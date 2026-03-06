
"use server";

import { getDb } from "../mongodb";
import { getLoggedInUser } from "./auth";
import type { PlatformApiKeyInput, UpdateUserCoinsAdminInput, UpdateUserRoleAdminInput } from "../schemas";
import type { User, Deployment, PlatformApiKey, BannedRegisterIp, PaymentTransaction, PlatformStats, MaintenanceSettings } from "../types";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import type { Db } from "mongodb"; 
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { logCoinTransaction } from "./transactions"; // Added import
import { sendEmail } from "./email";
import { AccountSuspendedEmail } from "@/components/email/AccountSuspendedEmail";
import { AccountReinstatedEmail } from "@/components/email/AccountReinstatedEmail";

const DEPLOYMENT_COST = 50; // Cost per deployment for non-admin users
const COIN_BAN_THRESHOLD = 5000; 
const MAINTENANCE_MODE_SETTINGS_ID = "maintenanceModeSettings";

async function isAdmin(): Promise<boolean> {
  const user = await getLoggedInUser();
  return !!user && user.role === 'admin';
}

async function checkAndPotentiallyBanUser(userId: string, db: Db): Promise<void> {
  try {
    const usersCollection = db.collection<User>("users");
    const bannedIpsCollection = db.collection<BannedRegisterIp>("banned_register_ips");
    
    const user = await usersCollection.findOne({ _id: userId });

    if (!user || user.role === 'admin' || user.isBanned) {
      return; 
    }

    if (user.coins > COIN_BAN_THRESHOLD) {
      console.log(`User ${user.email} (ID: ${user._id}) exceeded coin threshold (${user.coins} > ${COIN_BAN_THRESHOLD}) via admin adjustment. Banning user.`);
      const updates: Partial<User> = { isBanned: true };
      await usersCollection.updateOne({ _id: user._id }, { $set: updates });

      if (user.registrationIp) {
        console.log(`Adding registration IP ${user.registrationIp} for banned user ${user.email} to banned IP list.`);
        await bannedIpsCollection.updateOne(
          { ip: user.registrationIp },
          { $setOnInsert: { ip: user.registrationIp, reason: `Auto-ban: User ${user.email} exceeded coin threshold via admin.`, bannedAt: new Date() } },
          { upsert: true }
        );
      }
      revalidatePath("/admin/dashboard");
      revalidatePath(`/dashboard/profile/${user._id}`); 
    }
  } catch (error) {
    console.error(`Error in checkAndPotentiallyBanUser (admin context) for ${userId}:`, error);
  }
}

export async function getActivePlatformApiKey(): Promise<PlatformApiKey | null> {
  try {
    const db = await getDb();
    const apiKeysCollection = db.collection<PlatformApiKey>("apiKeys");
    const activeKeys = await apiKeysCollection.find({ isActive: true }).sort({ createdAt: -1 }).limit(1).toArray();

    if (activeKeys.length > 0) {
      const keyDoc = activeKeys[0];
      return { ...keyDoc, _id: keyDoc._id.toString() };
    }
    return null; 
  } catch (error) {
    console.error("Error fetching active platform API key:", error);
    throw new Error("Failed to retrieve active API key from database.");
  }
}

export async function getAllPlatformApiKeys(): Promise<PlatformApiKey[]> {
    if (!(await isAdmin())) {
        throw new Error("Unauthorized access to fetch all API keys.");
    }
    try {
        const db = await getDb();
        const apiKeysCollection = db.collection<PlatformApiKey>("apiKeys");
        const keys = await apiKeysCollection.find().sort({ createdAt: -1 }).toArray();
        return keys.map(key => ({ ...key, _id: key._id.toString() }));
    } catch (error) {
        console.error("Error fetching all platform API keys:", error);
        throw new Error("Failed to retrieve API keys from database.");
    }
}


export async function getApiKeyById(keyId: string): Promise<PlatformApiKey | null> {
  if (!ObjectId.isValid(keyId)) {
    console.error("Invalid API Key ID format:", keyId);
    return null; 
  }
  try {
    const db = await getDb();
    const apiKeysCollection = db.collection<PlatformApiKey>("apiKeys");
    const apiKeyDoc = await apiKeysCollection.findOne({ _id: new ObjectId(keyId) });

    if (apiKeyDoc) {
      return { ...apiKeyDoc, _id: apiKeyDoc._id.toString() };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching API key by ID ${keyId}:`, error);
    throw new Error(`Failed to retrieve API key by ID ${keyId} from database.`);
  }
}

export async function updatePlatformApiKey(data: PlatformApiKeyInput): Promise<{ success: boolean; message: string; apiKeyId?: string }> {
  if (!(await isAdmin())) {
    return { success: false, message: "Unauthorized access." };
  }

  try {
    const db = await getDb();
    const apiKeysCollection = db.collection<PlatformApiKey>("apiKeys");

    await apiKeysCollection.updateMany({ isActive: true }, { $set: { isActive: false } });

    const newKeyName = `Heroku API Key - ${new Date().toLocaleDateString()}`;
    const newKeyDocument: Omit<PlatformApiKey, '_id'> = {
      key: data.apiKey,
      name: newKeyName,
      isActive: true,
      createdAt: new Date(),
    };
    const result = await apiKeysCollection.insertOne(newKeyDocument);

    if (!result.insertedId) {
      return { success: false, message: "Failed to insert new API key." };
    }
    
    revalidatePath("/admin/dashboard");
    return { success: true, message: "Platform API Key updated successfully. The new key is now active.", apiKeyId: result.insertedId.toString() };
  } catch (error) {
    console.error("Error updating platform API key:", error);
    return { success: false, message: "Failed to update API key." };
  }
}

export async function getAllUsersForAdmin(): Promise<{ success: boolean; users?: User[]; message?: string }> {
  if (!(await isAdmin())) {
    return { success: false, message: "Unauthorized access." };
  }
  try {
    const db = await getDb();
    const usersArray = await db.collection<User>("users").find({}, { projection: { passwordHash: 0 } }).sort({createdAt: -1}).toArray();

    const users: User[] = usersArray.map(u => ({
        ...u,
        _id: u._id.toString(),
        lastCoinClaim: u.lastCoinClaim ? new Date(u.lastCoinClaim) : null,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(0),
        isBanned: u.isBanned || false, 
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : undefined,
    }));
    return { success: true, users };
  } catch (error) {
    console.error("Error fetching all users:", error);
    return { success: false, message: "Failed to fetch users." };
  }
}

export async function updateUserRoleAdmin(data: UpdateUserRoleAdminInput): Promise<{ success: boolean; message: string }> {
    const adminUser = await getLoggedInUser();
    if (!adminUser || adminUser.role !== 'admin') {
        return { success: false, message: "Unauthorized access." };
    }

    if (adminUser._id === data.userId && data.newRole === 'user') {
         const dbCheck = await getDb();
         const adminCount = await dbCheck.collection<User>("users").countDocuments({ role: 'admin' });
         if (adminCount <= 1) {
            return { success: false, message: "Cannot change the role of the only admin." };
         }
    }

    try {
        const db = await getDb();
        const usersCollection = db.collection<User>("users");
        const result = await usersCollection.updateOne(
            { _id: data.userId },
            { $set: { role: data.newRole } }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: "User not found or role already set to this value." };
        }
        revalidatePath("/admin/dashboard");
        revalidatePath("/admin/stats");
        return { success: true, message: "User role updated successfully." };
    } catch (error) {
        console.error("Error updating user role:", error);
        return { success: false, message: "Failed to update user role." };
    }
}

export async function updateUserCoinsAdmin(data: UpdateUserCoinsAdminInput): Promise<{ success: boolean; message: string }> {
    if (!(await isAdmin())) {
        return { success: false, message: "Unauthorized access." };
    }
    try {
        const db = await getDb();
        const usersCollection = db.collection<User>("users");

        const updatedUser = await usersCollection.findOneAndUpdate(
            { _id: data.userId },
            { $inc: { coins: data.coinAdjustment } },
            { returnDocument: "after" }
        );

        if (!updatedUser) {
             return { success: false, message: "User not found." };
        }

        await logCoinTransaction({
            userId: data.userId,
            type: 'admin_adjustment',
            amount: data.coinAdjustment,
            description: `Admin adjusted coins by ${data.coinAdjustment}.`,
            balanceAfter: updatedUser.coins,
        });
        
        await checkAndPotentiallyBanUser(data.userId, db);

        revalidatePath("/admin/dashboard");
        revalidatePath("/admin/stats");
        revalidatePath("/dashboard"); // UserNav shows coins
        revalidatePath(`/dashboard/profile`); // User's profile shows coins
        return { success: true, message: `User coins adjusted by ${data.coinAdjustment}. New balance: ${updatedUser.coins}` };
    } catch (error) {
        console.error("Error adjusting user coins:", error);
        return { success: false, message: "Failed to adjust user coins." };
    }
}

export async function banUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const adminUser = await getLoggedInUser();
  if (!adminUser || adminUser.role !== 'admin') {
    return { success: false, message: "Unauthorized access." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");
    const bannedIpsCollection = db.collection<BannedRegisterIp>("banned_register_ips");

    const userToBan = await usersCollection.findOne({ _id: userId });

    if (!userToBan) {
      return { success: false, message: "User not found." };
    }

    if (userToBan.role === 'admin') {
      return { success: false, message: "Admins cannot be banned." };
    }

    await usersCollection.updateOne({ _id: userId }, { $set: { isBanned: true } });

    const ipsToBan: { ip: string; reason: string }[] = [];
    if (userToBan.registrationIp) {
      ipsToBan.push({ ip: userToBan.registrationIp, reason });
    }
    if (userToBan.lastKnownIp && userToBan.lastKnownIp !== userToBan.registrationIp) {
      ipsToBan.push({ ip: userToBan.lastKnownIp, reason });
    }

    if (ipsToBan.length > 0) {
      await Promise.all(
        ipsToBan.map(({ ip, reason }) =>
          bannedIpsCollection.updateOne(
            { ip },
            { $setOnInsert: { ip, reason, bannedAt: new Date() } },
            { upsert: true }
          )
        )
      );
    }

    await sendEmail({
      to: userToBan.email,
      subject: "Your Account Has Been Suspended",
      react: AccountSuspendedEmail({ userName: userToBan.name, reason }),
    });

    revalidatePath("/admin/dashboard");
    return { success: true, message: `User ${userToBan.email} has been banned.` };
  } catch (error) {
    console.error(`Error banning user ${userId}:`, error);
    return { success: false, message: "An error occurred while banning the user." };
  }
}

export async function unbanUser(userId: string): Promise<{ success: boolean; message: string }> {
  const adminUser = await getLoggedInUser();
  if (!adminUser || adminUser.role !== 'admin') {
    return { success: false, message: "Unauthorized access." };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const userToUnban = await usersCollection.findOne({ _id: userId });

    if (!userToUnban) {
      return { success: false, message: "User not found." };
    }

    const result = await usersCollection.updateOne({ _id: userId }, { $set: { isBanned: false } });

    if (result.modifiedCount === 0) {
      return { success: false, message: "User not found or already unbanned." };
    }

    await sendEmail({
      to: userToUnban.email,
      subject: "Your Account Has Been Reinstated",
      react: AccountReinstatedEmail({ userName: userToUnban.name }),
    });

    revalidatePath("/admin/dashboard");
    return { success: true, message: "User has been unbanned." };
  } catch (error) {
    console.error(`Error unbanning user ${userId}:`, error);
    return { success: false, message: "An error occurred while unbanning the user." };
  }
}


export async function deleteUserAdmin(userId: string): Promise<{ success: boolean; message: string }> {
   if (!(await isAdmin())) {
    return { success: false, message: "Unauthorized access." };
  }
  console.log(`Admin trying to delete user ${userId}`);
  return { success: false, message: "User deletion from admin panel not yet fully implemented for safety." };
}

export async function getPlatformStats(): Promise<{
  success: boolean;
  stats?: PlatformStats;
  message?: string;
}> {
  const adminMakingRequest = await getLoggedInUser();
  if (!adminMakingRequest || adminMakingRequest.role !== 'admin') {
    return { success: false, message: "Unauthorized access." };
  }
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");
    const deploymentsCollection = db.collection<Deployment>("deployments");
    const paymentsCollection = db.collection<PaymentTransaction>("payment_transactions");

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const twentyFourHoursAgo = subDays(new Date(), 1);

    const totalUsers = await usersCollection.countDocuments();
    const totalDeployments = await deploymentsCollection.countDocuments();
    const totalBannedUsers = await usersCollection.countDocuments({ isBanned: true });
    const dailyActiveUsers = await usersCollection.countDocuments({ lastLoginAt: { $gte: twentyFourHoursAgo }});

    const totalSucceededDeployments = await deploymentsCollection.countDocuments({ status: 'succeeded' });
    const totalFailedDeployments = await deploymentsCollection.countDocuments({ status: 'failed' });
    const totalStoppedDeployments = await deploymentsCollection.countDocuments({ status: 'stopped' });
    
    const successfulPlusFailed = totalSucceededDeployments + totalFailedDeployments;
    const deploymentSuccessRate = successfulPlusFailed > 0 ? (totalSucceededDeployments / successfulPlusFailed) * 100 : 0;

    const coinAggregation = await usersCollection.aggregate([
      { $group: { _id: null, totalCoins: { $sum: "$coins" } } }
    ]).toArray();
    const totalCoinsInSystem = coinAggregation[0]?.totalCoins || 0;

    const coinsPurchasedTodayAggregation = await paymentsCollection.aggregate([
        { $match: { status: 'successful', updatedAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$coinsPurchased" } } }
    ]).toArray();
    const coinsPurchasedToday = coinsPurchasedTodayAggregation[0]?.total || 0;

    const adminUser = await usersCollection.findOne({ email: process.env.ADMIN_EMAIL || 'ogdavidcyril@gmail.com' });
    const adminUserId = adminUser?._id.toString();

    const deploymentsToday = await deploymentsCollection.find({ 
        createdAt: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() } ,
        userId: { $ne: adminUserId } // Exclude admin deployments from cost calculation
    }).toArray();
    const coinsSpentOnDeploymentsToday = deploymentsToday.length * DEPLOYMENT_COST;


    return {
      success: true,
      stats: { 
        totalUsers, 
        totalDeployments, 
        totalCoinsInSystem, 
        totalBannedUsers,
        dailyActiveUsers,
        totalSucceededDeployments,
        totalFailedDeployments,
        totalStoppedDeployments,
        deploymentSuccessRate,
        coinsPurchasedToday,
        coinsSpentOnDeploymentsToday,
      },
    };
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return { success: false, message: "Failed to fetch platform statistics." };
  }
}

export async function getMaintenanceModeSettings(): Promise<MaintenanceSettings> {
    try {
        const db = await getDb();
        const settingsCollection = db.collection("settings");
        const settingsDoc = await settingsCollection.findOne({ _id: MAINTENANCE_MODE_SETTINGS_ID });

        if (settingsDoc && settingsDoc.value) {
            return settingsDoc.value as MaintenanceSettings;
        }
        return { 
            isActive: false, 
            message: "Our site is currently undergoing scheduled maintenance. Please check back soon." 
        };
    } catch (error) {
        console.error("Error fetching maintenance mode settings:", error);
        return { 
            isActive: false, 
            message: "Error fetching maintenance status. Assuming site is operational." 
        };
    }
}

export async function updateMaintenanceModeSettings(settings: MaintenanceSettings): Promise<{ success: boolean; message: string }> {
    if (!(await isAdmin())) {
        return { success: false, message: "Unauthorized access." };
    }

    try {
        const db = await getDb();
        const settingsCollection = db.collection("settings");
        await settingsCollection.updateOne(
            { _id: MAINTENANCE_MODE_SETTINGS_ID },
            { $set: { value: settings } },
            { upsert: true }
        );
        revalidatePath("/admin/dashboard");
        revalidatePath("/"); // Revalidate root if maintenance mode affects all users
        return { success: true, message: "Maintenance mode settings updated successfully." };
    } catch (error) {
        console.error("Error updating maintenance mode settings:", error);
        return { success: false, message: "Failed to update maintenance mode settings." };
    }
}

    
