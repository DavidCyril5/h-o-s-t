
"use server";

import type { LoginInput, RegisterInput, AdminLoginInput, VerifyAdminPasswordInput, VerificationCodeInput } from "@/lib/schemas";
import { getDb } from "@/lib/mongodb";
import bcrypt from 'bcryptjs';
import { cookies, headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User, BannedRegisterIp, Achievement } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { ObjectId } from 'mongodb';
import type { Db } from "mongodb";
import { logCoinTransaction } from "./transactions";
import { checkAndAwardAchievement } from './achievements';
import { sendEmail } from './email';
import { VerificationCodeEmail } from '@/components/email/VerificationCodeEmail';
import crypto from "crypto";

const ADMIN_EMAIL_FROM_ENV = process.env.ADMIN_EMAIL || 'ogdavidcyril@gmail.com';
const ADMIN_EXPECTED_PASSWORD_FROM_ENV = process.env.ADMIN_EXPECTED_PASSWORD || "8520055555";

if (!process.env.ADMIN_EMAIL) {
  console.warn(`WARNING: ADMIN_EMAIL environment variable is not set. Using default: ${ADMIN_EMAIL_FROM_ENV}`);
}
if (!process.env.ADMIN_EXPECTED_PASSWORD) {
  console.warn(`WARNING: ADMIN_EXPECTED_PASSWORD environment variable is not set. Using default for secondary verification.`);
}

const REFERRAL_COIN_BONUS_FOR_REFERRER = 10;
const REFERRAL_WELCOME_BONUS_FOR_NEW_USER = 5;
const ADMIN_INITIAL_COINS = 999999;
const MAX_ACCOUNTS_PER_IP = 1;
const COIN_BAN_THRESHOLD = 5000;

function getClientIp(): string | null {
  try {
    const headersList = nextHeaders();
    const xForwardedFor = headersList.get('x-forwarded-for');
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
    const xRealIp = headersList.get('x-real-ip');
    if (xRealIp) return xRealIp.trim();
    const herokuConnectingIp = headersList.get('x-heroku-connecting-ip');
    if (herokuConnectingIp) return herokuConnectingIp.trim();
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp.trim();
    return null;
  } catch (e) {
    console.warn("[Auth Action] Could not determine client IP from headers:", e);
    return null;
  }
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
      revalidatePath(`/dashboard/profile/${user._id}`);
    }
  } catch (error) {
    console.error(`Error in checkAndPotentiallyBanUser for ${userId}:`, error);
  }
}

export async function loginUser(data: LoginInput) {
  let db: Db;
  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Login - ${data.email}] Critical: Failed to connect to database:`, dbError);
    return { success: false, message: "Server database connection error. Please try again later." };
  }

  try {
    const usersCollection = db.collection<User>("users");
    const user = await usersCollection.findOne({ email: data.email });

    if (!user) {
      return { success: false, message: "Invalid email or password." };
    }
    if (user.isBanned) {
      return { success: false, message: "This account has been suspended." };
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, message: "Invalid email or password." };
    }

    const verificationCode = crypto.randomInt(1000, 9999).toString();
    const verificationCodeExpires = new Date(Date.now() + 600000); // 10 minutes
    const lastVerificationCodeSentAt = new Date();

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { verificationCode, verificationCodeExpires, lastVerificationCodeSentAt } }
    );

    await sendEmail({
      to: user.email,
      subject: "Your Verification Code",
      react: VerificationCodeEmail({ userName: user.name, verificationCode }),
    });
    
    redirect(`/verify?email=${user.email}`);

  } catch (error: any) {
    if (error && typeof error === 'object' && error.message && typeof error.message === 'string' && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(`[Auth Action - Login - ${data.email}] Login error:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
    return { success: false, message: `Login failed: ${errorMessage}` };
  }
}

export async function verifyCodeAndLogin(data: VerificationCodeInput & { email: string }) {
    let db: Db;
    try {
        db = await getDb();
    } catch (dbError: any) {
        console.error(`[Auth Action - Verify - ${data.email}] Critical: Failed to connect to database:`, dbError);
        return { success: false, message: "Server database connection error. Please try again later." };
    }

    try {
        const usersCollection = db.collection<User>("users");
        const user = await usersCollection.findOne({
            email: data.email,
            verificationCode: data.code,
            verificationCodeExpires: { $gt: new Date() },
        });

        if (!user) {
            return { success: false, message: "Invalid or expired verification code." };
        }

        await usersCollection.updateOne(
            { _id: user._id },
            { $unset: { verificationCode: "", verificationCodeExpires: "" } }
        );

        const clientIp = getClientIp();
        const now = new Date();
        await usersCollection.updateOne({ _id: user._id }, { $set: { lastKnownIp: clientIp, lastLoginAt: now } });

        cookies().set('loggedInUserId', user._id.toString(), {
            path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, sameSite: 'lax',
        });

        redirect('/dashboard');

    } catch (error: any) {
        if (error && typeof error === 'object' && error.message && typeof error.message === 'string' && error.message.includes('NEXT_REDIRECT')) {
            throw error;
        }
        console.error(`[Auth Action - Verify - ${data.email}] Verification error:`, error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'string') errorMessage = error;
        else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
        return { success: false, message: `Verification failed: ${errorMessage}` };
    }
}


export async function registerUser(data: RegisterInput) {
  let db: Db;
  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Register - ${data.email}] Critical: Failed to connect to database:`, dbError);
    return { success: false, message: "Server database connection error. Please try again later." };
  }

  try {
    const usersCollection = db.collection<User>("users");
    const bannedIpsCollection = db.collection<BannedRegisterIp>("banned_register_ips");

    const existingUser = await usersCollection.findOne({ email: data.email });
    if (existingUser) {
      return { success: false, message: "This email is already registered." };
    }

    const clientIp = getClientIp();
    if (clientIp) {
      const isIpBanned = await bannedIpsCollection.findOne({ ip: clientIp });
      if (isIpBanned) {
        return { success: false, message: "Registration from this IP address is currently restricted." };
      }
      const existingAccountsWithIp = await usersCollection.countDocuments({ registrationIp: clientIp });
      if (existingAccountsWithIp >= MAX_ACCOUNTS_PER_IP) {
        return { success: false, message: "Registration limit reached for this network. Please try again later or contact support if you believe this is an error." };
      }
    } else {
      console.warn(`[Auth Action - Register - ${data.email}] Could not determine client IP address for registration.`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    let roleToAssign: 'user' | 'admin' = 'user';
    let initialCoins = 0; 

    if (data.email.toLowerCase() === ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
      roleToAssign = 'admin';
      initialCoins = ADMIN_INITIAL_COINS;
    }

    const newUserObjectIdString = new ObjectId().toString();
    const now = new Date();
    const namePart = data.name.substring(0, 5).toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomPart = newUserObjectIdString.slice(-6);
    const referralCode = `${namePart}${randomPart}`;

    const newUserDocument: User = {
      _id: newUserObjectIdString, name: data.name, email: data.email, passwordHash,
      role: roleToAssign, coins: initialCoins, referralCode: referralCode,
      referredBy: null, createdAt: now, registrationIp: clientIp || undefined,
      lastKnownIp: clientIp || undefined, isBanned: false, lastLoginAt: now,
      shoutboxInfractions: 0, isBannedFromShoutbox: false, achievements: [],
    };

    if (data.referralCode) {
      const referrer = await usersCollection.findOne({ referralCode: data.referralCode });
      if (referrer && referrer._id.toString() !== newUserObjectIdString) { 
        const referrerUpdate = await usersCollection.findOneAndUpdate(
          { _id: referrer._id }, { $inc: { coins: REFERRAL_COIN_BONUS_FOR_REFERRER } },
          { returnDocument: "after" }
        );
        if (referrerUpdate) {
           await logCoinTransaction({
            userId: referrer._id.toString(), type: 'referral_bonus', amount: REFERRAL_COIN_BONUS_FOR_REFERRER,
            description: `Referral bonus for ${newUserDocument.email}`, balanceAfter: referrerUpdate.coins, relatedUserId: newUserDocument._id,
          });
          await checkAndAwardAchievement(referrer._id.toString(), 'RECRUITER');
        }
        newUserDocument.referredBy = referrer._id.toString();
        if (data.email.toLowerCase() !== ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
            newUserDocument.coins += REFERRAL_WELCOME_BONUS_FOR_NEW_USER;
            await logCoinTransaction({
              userId: newUserDocument._id, type: 'referral_bonus', amount: REFERRAL_WELCOME_BONUS_FOR_NEW_USER,
              description: `Welcome bonus - referred by ${referrer.email}`, balanceAfter: newUserDocument.coins, relatedUserId: referrer._id.toString(),
            });
        }
      } else {
        console.log(`[Auth Action - Register - ${data.email}] Referral code ${data.referralCode} not found, invalid, or self-referral.`);
      }
    }
    
    if (data.email.toLowerCase() === ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
        if (data.password !== ADMIN_EXPECTED_PASSWORD_FROM_ENV) {
            console.error(`[Auth Action - Register - ${data.email}] Critical: Attempt to register main admin email with a password different from ADMIN_EXPECTED_PASSWORD_FROM_ENV.`);
            return { success: false, message: "Admin account registration error. Password must match the expected admin password set in environment variables."};
        }
        if (ADMIN_INITIAL_COINS > 0) {
            await logCoinTransaction({
                userId: newUserDocument._id, type: 'initial_admin_grant', amount: ADMIN_INITIAL_COINS,
                description: "Initial coin grant for admin account.", balanceAfter: ADMIN_INITIAL_COINS,
            });
        }
    }

    const result = await usersCollection.insertOne(newUserDocument);
    if (!result.insertedId) {
        return { success: false, message: "Failed to register user." };
    }
    return { success: true, message: "Registration successful! You can now log in." };

  } catch (error: any) {
    console.error(`[Auth Action - Register - ${data.email}] Registration error:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
    return { success: false, message: `Registration failed: ${errorMessage}` };
  }
}


export async function adminLoginUser(data: AdminLoginInput) {
  let db: Db;
  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Admin Login - ${data.email}] Critical: Failed to connect to database:`, dbError);
    return { success: false, message: "Server database connection error. Please try again later." };
  }

  try {
    const usersCollection = db.collection<User>("users");
    const user = await usersCollection.findOne({ email: data.email });

    if (!user) { return { success: false, message: "Invalid email or password." }; }
    if (user.isBanned) { return { success: false, message: "This account has been suspended." }; }
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) { return { success: false, message: "Invalid email or password." }; }

    if (user.email.toLowerCase() === ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
      if (user.role !== 'admin') { await usersCollection.updateOne({ _id: user._id }, { $set: { role: 'admin' } }); user.role = 'admin'; }
      if (data.password !== ADMIN_EXPECTED_PASSWORD_FROM_ENV) {
         return { success: false, message: "Incorrect admin password. Initial login password must match the expected admin password." };
      }
    } else if (user.role !== 'admin') { 
        return { success: false, message: "Access denied. Not an admin account." };
    }
    
    const clientIp = getClientIp();
    const now = new Date();
    await usersCollection.updateOne({ _id: user._id }, { $set: { lastKnownIp: clientIp, lastLoginAt: now } });

    cookies().set('loggedInUserId', user._id.toString(), {
      path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, sameSite: 'lax',
    });
    revalidatePath('/admin/dashboard');
    redirect('/admin/dashboard');

  } catch (error: any) {
     if (error && typeof error === 'object' && error.message && typeof error.message === 'string' && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(`[Auth Action - Admin Login - ${data.email}] Admin login error:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
    return { success: false, message: `Admin login failed: ${errorMessage}` };
  }
}

export async function verifyAdminPasswordAgain(data: VerifyAdminPasswordInput): Promise<{ success: boolean; message: string }> {
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    return { success: false, message: "Session expired or invalid. Please log in again." };
  }

  if (loggedInUser.email.toLowerCase() !== ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
    return { success: true, message: "Verification not required for this admin account." };
  }
  
  let db: Db;
  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Verify Admin - ${loggedInUser.email}] Critical: Failed to connect to database:`, dbError);
    return { success: false, message: "Server database connection error. Please try again later." };
  }

  try {
    const usersCollection = db.collection<User>("users");
    const adminUserDoc = await usersCollection.findOne({ _id: loggedInUser._id });

    if (!adminUserDoc) { return { success: false, message: "Admin user record not found." }; }
    const isPasswordValid = await bcrypt.compare(data.password, adminUserDoc.passwordHash);
    if (!isPasswordValid) { return { success: false, message: "Incorrect password. Please enter your current account password." }; }
    if (data.password !== ADMIN_EXPECTED_PASSWORD_FROM_ENV) {
        return { success: false, message: "Secondary verification failed. The entered password, while matching your account, does not match the specific admin verification password set in environment variables. Please ensure consistency."};
    }
    return { success: true, message: "Admin session re-verified." };

  } catch (error: any) {
    console.error(`[Auth Action - Verify Admin - ${loggedInUser.email}] Error during admin second password verification:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
    return { success: false, message: `Verification failed: ${errorMessage}` };
  }
}


export async function logoutUser() {
  try {
    cookies().delete('loggedInUserId');
    revalidatePath('/');
    redirect('/login');
  } catch (error: any) {
    if (error && typeof error === 'object' && error.message && typeof error.message === 'string' && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("[Auth Action - Logout] Logout error:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && error.toString) errorMessage = error.toString();
    return { success: false, message: `Logout failed: ${errorMessage}` };
  }
}

export interface LoggedInUser {
  _id: string; name: string; email: string; role: 'user' | 'admin'; coins: number;
  lastCoinClaim: Date | null; referralCode: string; createdAt: Date;
  referredUsersCount: number; referralCoinsEarned: number; isBanned?: boolean;
  lastLoginAt?: Date; shoutboxInfractions: number; isBannedFromShoutbox: boolean;
  achievements: Achievement[];
  lastVerificationCodeSentAt?: Date;
}

export async function getLoggedInUser(): Promise<LoggedInUser | null> {
  let db: Db;
  const userIdCookie = cookies().get('loggedInUserId');
  const userIdString = userIdCookie?.value;

  if (!userIdString) return null;

  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Get User - ${userIdString}] Critical: Failed to connect to database:`, dbError);
    return null; 
  }
  
  try {
    const usersCollection = db.collection<User>('users');
    const user = await usersCollection.findOne({ _id: userIdString });

    if (user) {
      if (user.isBanned) {
        console.log(`[Auth Action - Get User - ${userIdString}] User is banned. Deleting session cookie and logging out.`);
        cookies().delete('loggedInUserId');
        return null;
      }

      if (user.email.toLowerCase() === ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
        let adminNeedsUpdate = false;
        const adminUpdates: Partial<Pick<User, 'role' | 'coins'>> = {};
        if (user.role !== 'admin') { adminUpdates.role = 'admin'; adminNeedsUpdate = true; }
        if (user.coins !== ADMIN_INITIAL_COINS) { adminUpdates.coins = ADMIN_INITIAL_COINS; adminNeedsUpdate = true; }
        if (adminNeedsUpdate) {
          await usersCollection.updateOne({ _id: user._id }, { $set: adminUpdates });
          if(adminUpdates.role) user.role = adminUpdates.role;
          if(adminUpdates.coins !== undefined ) user.coins = adminUpdates.coins;
        }
      }
      const referredUsersCount = await usersCollection.countDocuments({ referredBy: user._id });
      const referralCoinsEarned = referredUsersCount * REFERRAL_COIN_BONUS_FOR_REFERRER;
      return {
        _id: user._id, name: user.name, email: user.email, role: user.role || 'user',
        coins: user.coins || 0, 
        lastCoinClaim: user.lastCoinClaim ? new Date(user.lastCoinClaim) : null,
        referralCode: user.referralCode || 'N/A', createdAt: user.createdAt ? new Date(user.createdAt) : new Date(0),
        referredUsersCount: referredUsersCount, referralCoinsEarned: referralCoinsEarned,
        isBanned: user.isBanned || false, lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
        shoutboxInfractions: user.shoutboxInfractions || 0, isBannedFromShoutbox: user.isBannedFromShoutbox || false,
        achievements: user.achievements || [],
        lastVerificationCodeSentAt: user.lastVerificationCodeSentAt,
      };
    }
    return null;
  } catch (error) {
    console.error(`[Auth Action - Get User - ${userIdString}] Error fetching logged in user:`, error);
    return null;
  }
}
