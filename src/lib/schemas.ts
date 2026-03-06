import { z } from 'zod';

export const UserRoleSchema = z.enum(['user', 'admin']).default('user');
export type UserRole = z.infer<typeof UserRoleSchema>;

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters." })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, {
    message: "Password must be 8+ characters and include uppercase, lowercase, number, and special character.",
  });

export const BaseUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  // password: z.string().min(6, { message: "Password must be at least 6 characters." }), // Replaced by stricter passwordSchema
  role: UserRoleSchema.optional().default('user'),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerificationCodeSchema = z.object({
    code: z.string().length(4, { message: "Verification code must be 4 digits." }),
});
export type VerificationCodeInput = z.infer<typeof VerificationCodeSchema>;

export const AdminLoginSchema = LoginSchema;
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

export const VerifyAdminPasswordSchema = z.object({
  password: z.string().min(1, "Password is required."),
});
export type VerifyAdminPasswordInput = z.infer<typeof VerifyAdminPasswordSchema>;

export const RegisterSchema = BaseUserSchema.extend({
  password: passwordSchema, // Apply stricter password schema
  confirmPassword: z.string(),
  referralCode: z.string().optional().describe("Optional: Enter a referral code if you have one."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Invalid token." }),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match.",
  path: ["confirmNewPassword"],
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;


export const AnitaEnvBaseSchema = z.object({
  anitaVersion: z.enum(["V3", "V4", "V5"]).default("V5"),
  githubRepoUrl: z.string().url({ message: "Invalid GitHub repository URL." }).optional(),
  SESSION_ID: z.string().min(1, "Session ID is required."),
  OWNER_NUMBER: z.string().optional().default("2347043759577,2348123456789"),
  BOT_NAME: z.string().optional().default("QUEEN_ANITA-V4"),
  OWNER_NAME: z.string().optional().default("David Cyril"),
  PACK_NAME: z.string().optional().default("QUEEN_ANITA-V4"),
  AUTHOR: z.string().optional().default("DAVID CYRIL"),
  CHANNEL_NAME: z.string().optional().default("DAVID CYRIL"),
  CHANNEL_JID: z.string().optional().default("120363315231436175@newsletter"),
  AUTO_TYPING: z.boolean().optional().default(false),
  AUTO_RECORD: z.boolean().optional().default(false),
  AUTO_VIEW_STATUS: z.boolean().optional().default(true),
  AUTO_STATUS_REACT: z.boolean().optional().default(false),
  AUTO_LIKE_EMOJI: z.string().optional().default("💚"),
  LEVELUP: z.boolean().optional().default(false),
  ANTIVIEWONCE: z.boolean().optional().default(false),
  SUDO_USERS: z.string().optional().default("2349066528353,2348129988915"),
  PUBLIC: z.boolean().optional().default(true),
  ANTIDELETE: z.boolean().optional().default(false),
  ANTI_TAG: z.boolean().optional().default(false),
  ANTI_TEMU: z.boolean().optional().default(false),
  UNAVAILABLE: z.boolean().optional().default(true),
  AVAILABLE: z.boolean().optional().default(false),
  AUTO_READ_MESSAGES: z.boolean().optional().default(false),
  CHATBOT: z.boolean().optional().default(false),
  AUTO_REACT: z.boolean().optional().default(false),
  WELCOME: z.boolean().optional().default(false),
  PREFIX: z.string().optional().default("."),
  PLATFORM_APP_NAME: z.string().optional().describe("Optional: Specify an app name for the platform, or one will be generated."),
});

export type AnitaEnvInput = z.infer<typeof AnitaEnvBaseSchema>;

export const DeploymentFormInputSchema = AnitaEnvBaseSchema;
export type DeploymentFormInput = z.infer<typeof DeploymentFormInputSchema>;

export const DeploymentSchema = AnitaEnvBaseSchema.extend({
  id: z.string(),
  userId: z.string(),
  appName: z.string(),
  status: z.enum(["pending", "deploying", "succeeded", "failed", "stopped"]),
  createdAt: z.string().datetime(),
  lastDeployedAt: z.string().datetime().optional(),
  region: z.string().optional(),
  url: z.string().url().optional(),
  logs: z.array(z.string()).optional(),
  githubRepoUrl: z.string().url().optional(),
});
export type DeploymentInput = z.infer<typeof DeploymentSchema>;

export const PlatformApiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key cannot be empty."),
});
export type PlatformApiKeyInput = z.infer<typeof PlatformApiKeySchema>;

export const UpdateUserRoleAdminSchema = z.object({
  userId: z.string(),
  newRole: UserRoleSchema,
});
export type UpdateUserRoleAdminInput = z.infer<typeof UpdateUserRoleAdminSchema>;

export const UpdateUserCoinsAdminSchema = z.object({
  userId: z.string(),
  coinAdjustment: z.number().int({ message: "Coin adjustment must be a whole number." }),
});
export type UpdateUserCoinsAdminInput = z.infer<typeof UpdateUserCoinsAdminSchema>;

export const TransferCoinsSchema = z.object({
  recipientEmail: z.string().email({ message: "Invalid recipient email address." }),
  amount: z.number().positive({ message: "Transfer amount must be positive." }).int({ message: "Amount must be a whole number." }),
});
export type TransferCoinsInput = z.infer<typeof TransferCoinsSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: passwordSchema, // Apply stricter password schema
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from the current password.",
  path: ["newPassword"],
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

export const DeleteAccountSchema = z.object({
  currentPassword: z.string().min(1, { message: "Password is required to delete your account." }),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

export const CoinPurchasePackageEnum = z.enum(["small_50", "medium_150", "large_300"]);
export type CoinPurchasePackage = z.infer<typeof CoinPurchasePackageEnum>;

export const PaymentGatewayEnum = z.enum(["paystack", "flutterwave", "minipay"]);
export type PaymentGateway = z.infer<typeof PaymentGatewayEnum>;

export const SupportedCurrencyEnum = z.enum([
  'NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF', 'CAD', 'EGP', 'GNF', 'MAD', 'MWK', 'SLL', 'STD', 'ZMW', 'CLP', 'COP'
]);
export type SupportedCurrency = z.infer<typeof SupportedCurrencyEnum>;

export const CoinPurchaseSchema = z.object({
  package: CoinPurchasePackageEnum,
  currency: SupportedCurrencyEnum.default('NGN'),
  paymentGateway: PaymentGatewayEnum,
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  amountInSelectedCurrency: z.number().positive(),
  amountInNGN: z.number().positive(),
  coinsToCredit: z.number().positive().int(),
});
export type CoinPurchaseInput = z.infer<typeof CoinPurchaseSchema>;

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters."}),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }).max(1000, { message: "Message cannot exceed 1000 characters."}),
});
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;

export const CreateShoutSchema = z.object({
  message: z.string()
    .min(1, { message: "Shout cannot be empty." })
    .max(280, { message: "Shout cannot exceed 280 characters." }),
});
export type CreateShoutInput = z.infer<typeof CreateShoutSchema>;

export const EditShoutSchema = z.object({
  message: z.string()
    .min(1, { message: "Message cannot be empty." })
    .max(280, { message: "Message cannot exceed 280 characters." }),
});
export type EditShoutInput = z.infer<typeof EditShoutSchema>;

export const MiniPayPaymentVerificationSchema = z.object({
  transactionId: z.string().min(1, { message: "Transaction ID is required." }),
  screenshotUrl: z.string().url({ message: "Invalid screenshot URL." }),
  coinPurchase: CoinPurchaseSchema,
});
export type MiniPayPaymentVerificationInput = z.infer<typeof MiniPayPaymentVerificationSchema>;

export const CatboxImageUploadSchema = z.object({
  url: z.string().url(),
});
export type CatboxImageUploadInput = z.infer<typeof CatboxImageUploadSchema>;
