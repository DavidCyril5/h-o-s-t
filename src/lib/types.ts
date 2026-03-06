
export type DeploymentStatus = "pending" | "deploying" | "succeeded" | "failed" | "stopped" | "expired";

export interface Deployment {
  _id?: string; 
  id: string; 
  appName: string;
  status: DeploymentStatus;
  createdAt: string; 
  lastDeployedAt?: string; 
  region?: string;
  url?: string;
  logs?: string[];
  envVariables?: Record<string, any>;
  userId: string; 
  githubRepoUrl?: string;
  apiKeyId?: string;
}

export interface PlatformApiKey {
  _id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt: Date;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "stdout" | "stderr" | "system";
}

export interface Achievement {
  id: string; // The key from ACHIEVEMENTS record, e.g., 'PIONEER_DEPLOYER'
  name: string;
  description: string;
  earnedAt: Date;
}

export interface User {
  _id: string; 
  name: string;
  email: string;
  role: 'user' | 'admin';
  coins: number;
  referralCode: string;
  referredBy?: string | null; 
  createdAt: Date;
  passwordHash: string;
  registrationIp?: string; 
  lastKnownIp?: string; 
  isBanned?: boolean; 
  lastLoginAt?: Date;
  shoutboxInfractions: number; 
  isBannedFromShoutbox: boolean; 
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  achievements?: Achievement[];
  verificationCode?: string;
  verificationCodeExpires?: Date;
  lastVerificationCodeSentAt?: Date;
}

export interface GlobalSettings {
  _id: string; 
  value: any;
}

export interface CoinPackageDetails {
  id: 'small_50' | 'medium_150' | 'large_300';
  name: string;
  coins: number;
  priceNGN: number;
  description: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; 
  name: string;
}

export interface PaymentTransaction {
  _id?: string;
  userId: string;
  packageId: string;
  coinsPurchased: number;
  amountPaid: number;
  currency: string;
  paymentGateway: 'paystack' | 'flutterwave';
  transactionReference: string;
  status: 'pending' | 'successful' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  gatewayResponse?: any;
}

export interface Announcement {
  _id: string; 
  title: string;
  message: string;
  createdAt: Date;
  isReadByUserIds: string[]; 
  createdBy: string; 
}

export interface BannedRegisterIp {
  _id?: string;
  ip: string;
  reason: string;
  bannedAt: Date;
}

export interface PlatformStats {
  totalUsers: number;
  totalDeployments: number;
  totalCoinsInSystem: number;
  totalBannedUsers: number;
  dailyActiveUsers: number;
  totalSucceededDeployments: number;
  totalFailedDeployments: number;
  totalStoppedDeployments: number;
  deploymentSuccessRate: number; // Percentage
  coinsPurchasedToday: number;
  coinsSpentOnDeploymentsToday: number;
}

export interface MaintenanceSettings {
  isActive: boolean;
  message: string;
}

export type CoinTransactionType = 
  | 'purchase'
  | 'transfer_sent'
  | 'transfer_received'
  | 'deployment_cost'
  | 'admin_adjustment'
  | 'referral_bonus'
  | 'initial_admin_grant';

export interface CoinTransaction {
  _id: string;
  userId: string;
  type: CoinTransactionType;
  amount: number; // Positive for credits, negative for debits
  description: string;
  timestamp: Date;
  balanceAfter: number;
  relatedTransactionId?: string; // e.g., PaymentTransaction ID, Deployment ID
  relatedUserId?: string; // e.g., for transfers, the other party involved
}

export interface Shout {
  _id: string;
  userId: string;
  userName: string;
  userAvatarFallback: string;
  userRole?: 'admin' | 'user';
  message: string;
  createdAt: Date;
  updatedAt?: Date; 
  isEdited?: boolean; 
}
