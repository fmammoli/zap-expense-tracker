"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignUpButton, useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex flex-col justify-center items-center pt-10 relative">
      <div className="text-center relative z-10 p-6">
        <h1 className="text-6xl md:text-7xl font-extrabold text-white drop-shadow-lg">
          Croco Conta
        </h1>
        <p className="mt-6 text-lg md:text-xl text-green-100 max-w-md mx-auto font-semibold">
          Registre seus gastos pelo Zap e veja tudo organizadinho numa planilha
          no seu próprio google docs. As informações não são salvas em nenhum
          outro lugar. 🐊
        </p>

        <div className="mt-12">
          {isSignedIn ? (
            <Link href={"/dashboard"}>
              <Button className="rounded-2xl px-8 py-6 text-xl shadow-lg bg-white text-purple-900 hover:bg-purple-200">
                Começar 🚀
              </Button>
            </Link>
          ) : (
            <SignUpButton>
              <Button className="rounded-2xl px-8 py-6 text-xl shadow-lg bg-white text-purple-900 hover:bg-purple-200">
                Começar 🚀
              </Button>
            </SignUpButton>
          )}
        </div>
      </div>
    </div>
  );
}
