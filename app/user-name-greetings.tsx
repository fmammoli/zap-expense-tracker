"use client";

import { useUser } from "@clerk/nextjs";
export default function UserNameGreetings() {
  const { user, isSignedIn } = useUser();
  return (
    <div>
      {isSignedIn && (
        <p className="text-gray-600">
          Olá,{" "}
          <span className="text-purple-500 font-bold">{user?.firstName}</span>
        </p>
      )}
    </div>
  );
}
