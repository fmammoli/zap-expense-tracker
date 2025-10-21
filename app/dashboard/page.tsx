"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [sheetLink, setSheetLink] = useState<string | null>(null);

  useEffect(() => {
    // Aqui você pode buscar a planilha do usuário via API ou atributos do usuário
    // Supondo que você tenha salvo o sheetId no usuário via custom attribute
    if (user) {
      const id = user.publicMetadata?.sheetId;
      if (id) {
        setSheetLink(`https://docs.google.com/spreadsheets/d/${id}/edit`);
      }
    }
  }, [user]);

  const botNumber = "+1 (555) 182-1747"; // número do WhatsApp do bot
  const botLink = `https://wa.me/15551821747?text=Ajuda`; // link direto para o WhatsApp

  if (!isLoaded) return <p>Loading....</p>;

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-start p-6 bg-gradient-to-tr from-green-400 via-pink-400 to-purple-500">
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 w-full max-w-xl shadow-lg flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-purple-700 text-center drop-shadow">
          🐊 Bem-vindo ao CrocoConta!
        </h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-purple-700">
            Como registrar seus gastos
          </h2>
          <p>
            É simples! Basta enviar uma mensagem para o nosso bot no WhatsApp
            descrevendo o gasto e o valor.
          </p>
          <p className="font-mono bg-gray-100 px-2 py-1 rounded">
            Exemplo: Almoço 25,00
          </p>
          <p></p>
          <p className="font-mono bg-gray-100 px-2 py-1 rounded">
            Exemplo: Almoço 100 foi caro esse
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-purple-700">
            Bot no WhatsApp
          </h2>
          <p>Adicione o número do bot e comece a enviar suas despesas:</p>
          <Link href={botLink} target="_blank" rel="noopener noreferrer">
            <Button className="w-full mt-2 bg-green-500 hover:bg-green-400 text-white">
              Abrir WhatsApp ({botNumber})
            </Button>
          </Link>
        </section>

        {sheetLink && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-purple-700">
              Sua planilha de despesas
            </h2>
            <p>
              Você pode abrir sua planilha para conferir ou editar seus gastos
              manualmente:
            </p>
            <Link href={sheetLink} target="_blank" rel="noopener noreferrer">
              <Button className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white">
                Abrir planilha
              </Button>
            </Link>
          </section>
        )}

        <section className="mt-4 text-gray-800 text-center">
          <p>
            Dica: envie mensagens claras com valor e descrição para que o bot
            registre corretamente.
          </p>
        </section>
      </div>
    </div>
  );
}
