
"use server";

import { Resend } from "resend";
import React from 'react';
import { MiniPayConfirmationEmail } from '../../components/email/MiniPayConfirmationEmail';
import type { CoinPurchaseInput } from "@/lib/schemas";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = `Anita Deploy <noreply@${process.env.EMAIL_FROM_DOMAIN || 'anitadeploy.com'}>`;

interface EmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string; }> {
  try {
    const { to, subject, react } = options;

    if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key is not configured.");
      return { success: false, message: "Email service is not configured." };
    }
    
    if (!process.env.EMAIL_FROM_DOMAIN) {
      console.error("EMAIL_FROM_DOMAIN is not configured in environment variables.");
      return { success: false, message: "Email sending domain is not configured." };
    }

    console.log(`Attempting to send email from: ${fromEmail} to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("Error sending email via Resend:", JSON.stringify(error, null, 2));
      return { success: false, message: `Failed to send email: ${error.message}` };
    }

    console.log("Email sent successfully via Resend. ID:", data?.id);
    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    console.error("Unexpected error in sendEmail function:", error);
    return { success: false, message: "An unexpected error occurred while trying to send the email." };
  }
}

export async function sendMiniPayConfirmationEmail(
  transactionId: string,
  screenshotUrl: string,
  coinPurchase: CoinPurchaseInput
): Promise<{ success: boolean; message: string; }> {
  const adminEmail = "davidcyril209@gmail.com";
  const subject = "New MiniPay Payment for Approval";

  return sendEmail({
    to: adminEmail,
    subject,
    react: React.createElement(MiniPayConfirmationEmail, {
      transactionId,
      screenshotUrl,
      coinPurchase,
    }),
  });
}
