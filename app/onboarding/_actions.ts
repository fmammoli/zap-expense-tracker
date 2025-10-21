"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export const completeOnboarding = async (formData: FormData) => {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    return { message: "No Logged In User" };
  }

  const client = await clerkClient();

  try {
    const res = await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        whatsappNumber: formData.get("whatsappNumber"),
        sheetId: formData.get("sheetId"),
      },
    });
    return { message: res.publicMetadata };
  } catch (err) {
    return { error: `There was an error updating the user metadata. ${err}` };
  }
};
