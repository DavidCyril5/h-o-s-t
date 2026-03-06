
'use server';

import { getDb } from '../mongodb';
import type { User, Achievement } from '../types';
import { ACHIEVEMENTS } from '../achievements';
import { revalidatePath } from 'next/cache';

export async function checkAndAwardAchievement(userId: string, achievementId: keyof typeof ACHIEVEMENTS) {
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      console.log(`[Achievements] User not found: ${userId}`);
      return;
    }

    // Check if the user already has this specific achievement
    const hasAchievement = user.achievements?.some(a => a.id === achievementId);

    if (hasAchievement) {
      return; // User already has this achievement, no action needed
    }

    const achievementDetails = ACHIEVEMENTS[achievementId];
    if (!achievementDetails) {
      console.warn(`[Achievements] Attempted to award invalid achievement: ${achievementId}`);
      return;
    }

    const newAchievement: Achievement = {
      id: achievementDetails.id,
      name: achievementDetails.name,
      description: achievementDetails.description,
      earnedAt: new Date(),
    };

    // Add the new achievement to the user's achievements array
    await usersCollection.updateOne(
      { _id: userId },
      { $push: { achievements: newAchievement } }
    );
    
    console.log(`[Achievements] Awarded '${achievementDetails.name}' to user ${userId}`);
    // Revalidate the profile page so the new achievement appears immediately
    revalidatePath(`/dashboard/profile`);

  } catch (error) {
    console.error(`[Achievements] Error awarding achievement ${achievementId} to user ${userId}:`, error);
  }
}
