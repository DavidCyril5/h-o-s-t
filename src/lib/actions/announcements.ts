
"use server";

import { getDb } from "../mongodb";
import { getLoggedInUser, type LoggedInUser } from "./auth";
import type { Announcement } from "../types";
import type { CreateAnnouncementInput } from "../schemas";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(
  data: CreateAnnouncementInput
): Promise<{ success: boolean; message: string; announcement?: Announcement }> {
  const adminUser = await getLoggedInUser();
  if (!adminUser || adminUser.role !== "admin") {
    return { success: false, message: "Unauthorized: Only admins can create announcements." };
  }

  try {
    const db = await getDb();
    const announcementsCollection = db.collection<Omit<Announcement, '_id'>>("announcements");

    const newAnnouncement: Omit<Announcement, '_id'> = {
      title: data.title,
      message: data.message,
      createdAt: new Date(),
      isReadByUserIds: [],
      createdBy: adminUser._id,
    };

    const result = await announcementsCollection.insertOne(newAnnouncement);
    if (!result.insertedId) {
        return { success: false, message: "Failed to create announcement in database." };
    }

    const createdAnnouncement: Announcement = {
        ...newAnnouncement,
        _id: result.insertedId.toString(),
    };

    revalidatePath("/admin/announcements");
    revalidatePath("/dashboard"); // Header is on dashboard pages

    return { success: true, message: "Announcement created successfully.", announcement: createdAnnouncement };
  } catch (error) {
    console.error("Error creating announcement:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}

export async function getAnnouncementsForUser(
  userId: string
): Promise<{ success: boolean; announcements?: Announcement[]; unreadCount?: number; message?: string }> {
  if (!userId) {
    return { success: false, message: "User ID is required." };
  }

  try {
    const db = await getDb();
    const announcementsCollection = db.collection<Announcement>("announcements");

    const allAnnouncements = await announcementsCollection.find().sort({ createdAt: -1 }).toArray();

    const announcementsWithReadStatus = allAnnouncements.map(ann => ({
      ...ann,
      _id: ann._id.toString(),
      isRead: (ann.isReadByUserIds || []).includes(userId),
    }));

    const unreadCount = announcementsWithReadStatus.filter(ann => !ann.isRead).length;

    return { success: true, announcements: announcementsWithReadStatus, unreadCount };
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return { success: false, message: "Failed to fetch announcements." };
  }
}

export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId || !announcementId) {
    return { success: false, message: "User ID and Announcement ID are required." };
  }

  try {
    const db = await getDb();
    const announcementsCollection = db.collection<Announcement>("announcements");

    const result = await announcementsCollection.updateOne(
      { _id: announcementId, isReadByUserIds: { $ne: userId } },
      { $addToSet: { isReadByUserIds: userId } }
    );

    if (result.modifiedCount > 0) {
      revalidatePath("/dashboard"); // For header updates
      return { success: true, message: "Announcement marked as read." };
    }
    return { success: true, message: "Announcement was already marked as read or not found." };
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    return { success: false, message: "Failed to mark announcement as read." };
  }
}

export async function markAllAnnouncementsAsRead(
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: "User ID is required." };
  }
  try {
    const db = await getDb();
    const announcementsCollection = db.collection<Announcement>("announcements");

    await announcementsCollection.updateMany(
      { isReadByUserIds: { $ne: userId } },
      { $addToSet: { isReadByUserIds: userId } }
    );
    revalidatePath("/dashboard");
    return { success: true, message: "All announcements marked as read." };
  } catch (error) {
    console.error("Error marking all announcements as read:", error);
    return { success: false, message: "Failed to mark all announcements as read." };
  }
}

export async function getAdminAnnouncements(): Promise<{ success: boolean; announcements?: Announcement[]; message?: string }> {
    const adminUser = await getLoggedInUser();
    if (!adminUser || adminUser.role !== "admin") {
        return { success: false, message: "Unauthorized." };
    }
    try {
        const db = await getDb();
        const announcements = await db.collection<Announcement>("announcements").find().sort({ createdAt: -1 }).toArray();
        return { success: true, announcements: announcements.map(a => ({...a, _id: a._id.toString()})) };
    } catch (error) {
        console.error("Error fetching admin announcements:", error);
        return { success: false, message: "Failed to fetch announcements." };
    }
}

export async function deleteAnnouncement(announcementId: string): Promise<{ success: boolean; message: string }> {
  const adminUser = await getLoggedInUser();
  if (!adminUser || adminUser.role !== "admin") {
    return { success: false, message: "Unauthorized: Only admins can delete announcements." };
  }

  if (!ObjectId.isValid(announcementId)) {
    return { success: false, message: "Invalid announcement ID format." };
  }

  try {
    const db = await getDb();
    const announcementsCollection = db.collection<Announcement>("announcements");

    const result = await announcementsCollection.deleteOne({ _id: announcementId });

    if (result.deletedCount === 0) {
      return { success: false, message: "Announcement not found or already deleted." };
    }

    revalidatePath("/admin/announcements");
    return { success: true, message: "Announcement deleted successfully." };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, message: "An unexpected error occurred while deleting the announcement." };
  }
}

    
