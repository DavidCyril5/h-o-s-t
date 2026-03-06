
"use server";

import { getDb } from "../mongodb";
import { getLoggedInUser, type LoggedInUser } from "./auth";
import type { Shout, User } from "../types";
import type { CreateShoutInput, EditShoutInput } from "../schemas";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { subHours } from 'date-fns';
import { checkAndAwardAchievement } from './achievements';

const SHOUTBOX_BAN_THRESHOLD = 3;
const TOXIC_WORDS = ['fuck', 'shit', 'asshole', 'bitch', 'cunt', 'nigger', 'faggot']; // Add more as needed, be mindful of context

const getAvatarFallbackFromName = (name?: string): string => {
    if (name) {
      const nameParts = name.split(" ");
      if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
        return nameParts[0][0].toUpperCase() + nameParts[1][0].toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return "??"; 
};

// New function to parse mentions
async function parseMentions(message: string): Promise<ObjectId[]> {
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = message.match(mentionRegex)?.map(m => m.substring(1)) || [];
    
    if (mentionedUsernames.length === 0) return [];

    const db = await getDb();
    const usersCollection = db.collection<User>("users");
    
    const mentionedUsers = await usersCollection.find({
        name: { $in: mentionedUsernames }
    }).project({ _id: 1 }).toArray();

    return mentionedUsers.map(user => user._id);
}

export async function createShout(
  data: CreateShoutInput
): Promise<{ success: boolean; message: string; shout?: Shout }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "You must be logged in to shout." };
  }
  if (user.isBanned) {
    return { success: false, message: "Your account is suspended and cannot post." };
  }
  if (user.isBannedFromShoutbox) {
    return { success: false, message: "You are currently banned from posting in the Community Feed." };
  }

  try {
    const db = await getDb();
    const shoutsCollection = db.collection<Omit<Shout, '_id'>>("shouts");
    const usersCollection = db.collection<User>("users");

    // Toxicity Check
    const lowerCaseMessage = data.message.toLowerCase();
    const containsToxicWord = TOXIC_WORDS.some(word => lowerCaseMessage.includes(word));

    if (containsToxicWord && user.role !== 'admin') { // Admins bypass toxicity check for their own posts
      const userDoc = await usersCollection.findOne({ _id: user._id });
      let currentInfractions = userDoc?.shoutboxInfractions || 0;
      currentInfractions++;

      let messageToUser = `Your message contains potentially inappropriate language. Infraction ${currentInfractions}/${SHOUTBOX_BAN_THRESHOLD}. Please be respectful.`;
      
      if (currentInfractions >= SHOUTBOX_BAN_THRESHOLD) {
        await usersCollection.updateOne({ _id: user._id }, { $set: { isBannedFromShoutbox: true, shoutboxInfractions: currentInfractions } });
        messageToUser = `Your message contains inappropriate language. You have reached the infraction limit and are now banned from the Community Feed.`;
        revalidatePath("/dashboard"); // To update UI with ban status
        return { success: false, message: messageToUser };
      } else {
        await usersCollection.updateOne({ _id: user._id }, { $set: { shoutboxInfractions: currentInfractions } });
        revalidatePath("/dashboard"); 
        return { success: false, message: messageToUser };
      }
    }

    const userAvatarFallback = getAvatarFallbackFromName(user.name);
    const mentionedUserIds = await parseMentions(data.message);

    const newShout: Omit<Shout, '_id'> = {
      userId: user._id,
      userName: user.name,
      userAvatarFallback,
      userRole: user.role,
      message: data.message,
      createdAt: new Date(),
      isEdited: false,
      mentionedUserIds: mentionedUserIds, // Add this line
    };

    const result = await shoutsCollection.insertOne(newShout);
    if (!result.insertedId) {
        return { success: false, message: "Failed to save shout." };
    }

    // Award achievement for first post
    await checkAndAwardAchievement(user._id, 'COMMUNITY_VOICE');

    const createdShout: Shout = {
        ...newShout,
        _id: result.insertedId.toString(),
    };

    revalidatePath("/dashboard"); // Or a more specific path if your shoutbox is elsewhere

    return { success: true, message: "Shout posted!", shout: createdShout };
  } catch (error) {
    console.error("Error creating shout:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}

export async function getRecentShouts(): Promise<{ success: boolean; shouts?: Shout[]; message?: string }> {
  try {
    const db = await getDb();
    const shoutsCollection = db.collection<Shout>("shouts");
    
    const twentyFourHoursAgo = subHours(new Date(), 24);

    const recentShouts = await shoutsCollection.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 }).limit(50).toArray(); 

    return { 
        success: true, 
        shouts: recentShouts.map(s => ({
            ...s, 
            _id: s._id.toString(),
            userRole: s.userRole || 'user',
            isEdited: s.isEdited || false,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
            mentionedUserIds: s.mentionedUserIds || [],
        })) 
    };
  } catch (error) {
    console.error("Error fetching recent shouts:", error);
    return { success: false, message: "Failed to fetch shouts." };
  }
}

export async function editShout(shoutId: string, newContent: EditShoutInput): Promise<{ success: boolean; message: string }> {
    const user = await getLoggedInUser();
    if (!user) return { success: false, message: "Unauthorized." };
    if (user.isBannedFromShoutbox) return { success: false, message: "You are banned and cannot edit shouts."};

    try {
        const db = await getDb();
        const shoutsCollection = db.collection<Shout>("shouts");
        const shoutToEdit = await shoutsCollection.findOne({ _id: shoutId });

        if (!shoutToEdit) return { success: false, message: "Shout not found." };
        if (shoutToEdit.userId !== user._id && user.role !== 'admin') {
            return { success: false, message: "You can only edit your own shouts." };
        }
        
        // Basic toxicity check on edit, only for non-admins editing their own posts
        if (user.role !== 'admin' && shoutToEdit.userId === user._id) {
            const lowerCaseMessage = newContent.message.toLowerCase();
            const containsToxicWord = TOXIC_WORDS.some(word => lowerCaseMessage.includes(word));
            if (containsToxicWord) {
                return { success: false, message: "Edited message contains inappropriate language. Please revise."};
            }
        }

        const mentionedUserIds = await parseMentions(newContent.message);

        const result = await shoutsCollection.updateOne(
            { _id: shoutId },
            { $set: { 
                message: newContent.message, 
                isEdited: true, 
                updatedAt: new Date(),
                mentionedUserIds: mentionedUserIds, // Update mentions on edit
            } }
        );

        if (result.modifiedCount === 0) return { success: false, message: "Failed to update shout or no changes made." };
        
        revalidatePath("/dashboard"); 
        return { success: true, message: "Shout updated successfully." };
    } catch (error) {
        console.error("Error editing shout:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

export async function deleteShout(shoutId: string): Promise<{ success: boolean; message: string }> {
    const user = await getLoggedInUser();
    if (!user) return { success: false, message: "Unauthorized." };

    try {
        const db = await getDb();
        const shoutsCollection = db.collection<Shout>("shouts");
        const shoutToDelete = await shoutsCollection.findOne({ _id: shoutId });

        if (!shoutToDelete) return { success: false, message: "Shout not found." };
        if (shoutToDelete.userId !== user._id && user.role !== 'admin') {
            return { success: false, message: "You can only delete your own shouts." };
        }

        const result = await shoutsCollection.deleteOne({ _id: shoutId });
        if (result.deletedCount === 0) return { success: false, message: "Failed to delete shout." };
        
        revalidatePath("/dashboard");
        return { success: true, message: "Shout deleted successfully." };
    } catch (error) {
        console.error("Error deleting shout:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}
