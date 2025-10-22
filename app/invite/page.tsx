"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateSheetId } from "./_actions";

export default function InvitePageForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = searchParams.get("sheetId");
    if (id) setSheetId(id);
  }, [searchParams]);

  if (!isLoaded) return <p>Loading user...</p>;
  if (!sheetId) return <p>Invalid invite link.</p>;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Update user metadata with the shared sheetId
      await updateSheetId(sheetId);
      await user?.reload();
      router.push("/dashboard");
    } catch (err) {
      console.error("Error accepting invite:", err);
      alert("Ocorreu um erro ao aceitar o convite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-tr from-green-400 via-pink-400 to-purple-500 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white/20 backdrop-blur-md rounded-2xl p-8 w-full max-w-md shadow-lg flex flex-col gap-6 text-center"
      >
        <h1 className="text-2xl font-bold text-purple-700 drop-shadow">
          🐊 Convite para planilha compartilhada
        </h1>

        <p>
          Você recebeu um convite para colaborar em uma planilha compartilhada.
          <br />
          Ao aceitar, sua planilha atual será substituída pela planilha
          compartilhada.
        </p>

        <input
          type="text"
          readOnly
          value={sheetId}
          className="font-mono bg-gray-100 px-2 py-1 rounded text-center"
        />

        <Button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 text-lg"
          disabled={loading}
        >
          {loading ? "Aceitando..." : "Aceitar convite"}
        </Button>

        <p className="text-xs text-gray-700 mt-2">
          Você poderá acessar todas as despesas compartilhadas na sua dashboard.
        </p>
      </form>
    </div>
  );
}
