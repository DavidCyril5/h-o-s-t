
"use server";

import { getLoggedInUser } from "./auth";
import { pusherServer } from "../pusher";

export async function broadcastTyping(isTyping: boolean): Promise<{ success: boolean; message: string }> {
  const user = await getLoggedInUser();

  if (!user) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    // The channel is 'shoutbox', event is 'user-typing'
    await pusherServer.trigger("shoutbox", "user-typing", {
      userId: user._id.toString(),
      userName: user.name,
      isTyping: isTyping,
    });
    return { success: true, message: "Typing status broadcasted successfully." };
  } catch (error) {
    console.error("Failed to broadcast typing status:", error);
    return { success: false, message: "Error broadcasting typing status." };
  }
}
