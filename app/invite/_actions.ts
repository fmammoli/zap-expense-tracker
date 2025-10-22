"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export const updateSheetId = async (sheetId: string) => {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    return { message: "No Logged In User" };
  }

  const client = await clerkClient();

  try {
    const user = await client.users.getUser(userId!);
    const res = await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        sheetId: sheetId || user.publicMetadata?.sheetId,
      },
    });
    return { message: res.publicMetadata };
  } catch (err) {
    return { error: `There was an error updating the user metadata. ${err}` };
  }
};
