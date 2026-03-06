
"use server";

import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/types";
import { sendEmail } from "@/lib/actions/email";
import { VerificationCodeEmail } from "@/components/email/VerificationCodeEmail";
import crypto from "crypto";

const RESEND_COOLDOWN_SECONDS = 60;

export async function resendVerificationCode(email: string): Promise<{ success: boolean; message: string; remainingCooldown?: number }> {
  let db;
  try {
    db = await getDb();
  } catch (dbError: any) {
    console.error(`[Auth Action - Resend Code - ${email}] Critical: Failed to connect to database:`, dbError);
    return { success: false, message: "Server database connection error. Please try again later." };
  }

  try {
    const usersCollection = db.collection<User>("users");
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (user.lastVerificationCodeSentAt) {
      const now = new Date();
      const diffSeconds = (now.getTime() - new Date(user.lastVerificationCodeSentAt).getTime()) / 1000;
      if (diffSeconds < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - diffSeconds);
        return {
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new code.`,
          remainingCooldown: remaining,
        };
      }
    }

    let verificationCode = user.verificationCode;
    const now = new Date();

    if (!verificationCode || !user.verificationCodeExpires || new Date(user.verificationCodeExpires) < now) {
      verificationCode = crypto.randomInt(1000, 9999).toString();
      const verificationCodeExpires = new Date(Date.now() + 600000); // 10 minutes
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { verificationCode, verificationCodeExpires } }
      );
    }

    const lastVerificationCodeSentAt = new Date();
    await usersCollection.updateOne(
        { _id: user._id },
        { $set: { lastVerificationCodeSentAt } }
    );


    await sendEmail({
      to: user.email,
      subject: "Your Verification Code",
      react: VerificationCodeEmail({ userName: user.name, verificationCode }),
    });

    return { success: true, message: "A verification code has been sent." };

  } catch (error: any) {
    console.error(`[Auth Action - Resend Code - ${email}] Error:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    return { success: false, message: `Failed to resend code: ${errorMessage}` };
  }
}
