
"use server";

import crypto from "crypto";
import { getDb } from "../mongodb";
import type { User } from "../types";
import type { ForgotPasswordInput, ResetPasswordInput } from "../schemas";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { sendEmail } from "./email";
import { ResetPasswordEmail } from "@/components/email/ResetPasswordEmail";

export async function requestPasswordReset(
  data: ForgotPasswordInput
): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const user = await usersCollection.findOne({ email: data.email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: passwordResetToken,
            resetPasswordExpires: passwordResetExpires,
          },
        }
      );
      
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/reset-password/${passwordResetToken}`;

      await sendEmail({
        to: user.email,
        subject: "Reset Your Anita Deploy Password",
        react: ResetPasswordEmail({
          userName: user.name,
          resetLink: resetUrl,
        }),
      });
    }

    return {
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    return {
      success: false,
      message: "An error occurred while processing your request.",
    };
  }
}

export async function resetPassword(
  data: ResetPasswordInput
): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const user = await usersCollection.findOne({
      resetPasswordToken: data.token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return { success: false, message: "Password reset token is invalid or has expired." };
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
        },
        $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
        }
      }
    );
    
    revalidatePath(`/users/${user._id}`);

    return { success: true, message: "Your password has been successfully reset. You can now log in with your new password." };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return {
      success: false,
      message: "An error occurred while resetting your password.",
    };
  }
}
