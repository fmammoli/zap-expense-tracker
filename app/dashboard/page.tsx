"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { updateSheetId } from "../invite/_actions";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [sheetLink, setSheetLink] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      const id = user.publicMetadata?.sheetId;
      if (id) {
        const link = `https://docs.google.com/spreadsheets/d/${id}/edit`;
        setSheetLink(link);
        setInputValue(link);
        setInviteLink(`${window.location.origin}/invite?sheetId=${id}`);
      }
    }
  }, [user]);

  const botNumber = "551151990251";
  const botLink = `https://wa.me/15551821747?text=Ajuda`;

  if (!isLoaded) return <p>Loading....</p>;

  const handleCopyInvite = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      alert("✅ Link de convite copiado!");
    }
  };

  const handleSheetUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Extract sheetId from the input
    const match = inputValue.match(/d\/([a-zA-Z0-9-_]+)\//);
    if (!match) {
      alert("Link inválido! Insira um link de planilha do Google válido.");
      return;
    }

    const newSheetId = match[1];

    setUpdating(true);
    try {
      console.log(newSheetId);
      //await updateSheetId(sheetId);

      const newLink = `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`;
      setSheetLink(newLink);
      setInputValue(newLink);
      setInviteLink(`${window.location.origin}/invite?sheetId=${newSheetId}`);
      alert("✅ Planilha atualizada!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar a planilha.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-start p-6 bg-gradient-to-tr from-green-400 via-pink-400 to-purple-500">
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 w-full max-w-xl shadow-lg flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-purple-700 text-center drop-shadow">
          🐊 Bem-vindo ao CrocoConta!
        </h1>

        {/* How to register expenses */}
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
        </section>

        {/* WhatsApp Bot Section */}
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-purple-700">
            Bot no WhatsApp
          </h2>
          <p>Adicione o número do bot e comece a enviar suas despesas:</p>
          <Link href={botLink} target="_blank" rel="noopener noreferrer">
            <Button className="w-full mt-2 bg-green-500 hover:bg-green-400 text-white px-1">
              Abrir WhatsApp ({botNumber})
            </Button>
          </Link>
        </section>

        {/* Editable Sheet Link Section */}
        {sheetLink && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-purple-700">
              Sua planilha de despesas
            </h2>
            <p>
              Você pode abrir sua planilha para conferir ou editar seus gastos
              manualmente ou trocar para outra planilha:
            </p>

            <form onSubmit={handleSheetUpdate} className="flex flex-col gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-white/80 border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-full"
              />
              <div className="flex gap-2 items-center">
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white  flex-1"
                  disabled={updating}
                >
                  {updating ? "Atualizando..." : "Atualizar planilha"}
                </Button>
                <Link
                  href={sheetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center hover:underline hover:text-purple600 text-purple-500 font-bold w-full"
                >
                  Abrir planilha
                </Link>
              </div>
            </form>
          </section>
        )}

        {/* Shared Sheet Invitation */}
        {inviteLink && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-purple-700">
              Compartilhar planilha
            </h2>
            <p>
              Gere um link para convidar outra pessoa a participar da sua
              planilha de despesas:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-white/80 border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-700"
              />
              <Button
                onClick={handleCopyInvite}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                Copiar
              </Button>
            </div>

            <p className="text-xs text-gray-700 mt-1">
              Envie este link para um amigo — ele terá acesso compartilhado à
              sua planilha.
            </p>
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
