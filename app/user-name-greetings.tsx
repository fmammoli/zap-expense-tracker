"use client";

import { useUser } from "@clerk/nextjs";
export default function UserNameGreetings() {
  const { user, isLoaded } = useUser();
  return (
    <p className="text-gray-600">
      Olá, <span className="text-purple-500 font-bold">{user?.firstName}</span>
    </p>
  );
}
