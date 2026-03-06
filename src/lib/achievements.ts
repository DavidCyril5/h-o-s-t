
import { Rocket, Users, MessageSquare, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AchievementDetails {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const ACHIEVEMENTS: Record<string, AchievementDetails> = {
  PIONEER_DEPLOYER: {
    id: 'PIONEER_DEPLOYER',
    name: 'Pioneer Deployer',
    description: 'Successfully completed your first deployment.',
    icon: Rocket,
  },
  RECRUITER: {
    id: 'RECRUITER',
    name: 'Recruiter',
    description: 'Successfully referred another user to the platform.',
    icon: Users,
  },
  COMMUNITY_VOICE: {
    id: 'COMMUNITY_VOICE',
    name: 'Community Voice',
    description: 'Posted your first message in the Community Feed.',
    icon: MessageSquare,
  },
};
