"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./_actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "react-international-phone";
import { createSheet } from "./create-sheet";
import router from "next/router";

export default function OnboardingComponent() {
  const [error, setError] = React.useState("");
  const [step, setStep] = React.useState(1);
  const [phone, setPhone] = React.useState("");
  const [sheetName, setSheetName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const { user } = useUser();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return alert("Digite seu número de WhatsApp!");
    setStep(2);
  };

  const handleCreateSheet = async () => {
    setLoading(true);
    try {
      const name = sheetName || "croco-contas";
      const sheetId = await createSheet(name);
      console.log("Sheet created:", sheetId);

      const formData = new FormData();
      formData.set("whatsappNumber", phone);
      formData.set("sheetId", sheetId);

      const res = await completeOnboarding(formData);

      if (res?.error) {
        setError(res.error);
      } else {
        // Reload Clerk user data
        await user?.reload();
        router.push("/dashboard"); // redirect to dashboard
        //setStep(3);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar planilha!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-tr from-green-400 via-pink-400 to-purple-500">
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 w-full max-w-md shadow-lg flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-purple-700 text-center drop-shadow">
          Bem-vindo ao ZapGastos 🐊
        </h1>

        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
            <label className="font-semibold text-purple-700">
              1️⃣ Digite seu WhatsApp
            </label>
            <PhoneInput
              defaultCountry="br"
              value={phone}
              onChange={setPhone}
            ></PhoneInput>
            {error && <p className="text-red-600">{error}</p>}
            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar número"}
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <label className="font-semibold text-purple-700">
              2️⃣ Crie sua planilha de despesas
            </label>
            <Input
              placeholder="Nome da planilha (opcional)"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="w-full"
            />
            <Button
              onClick={handleCreateSheet}
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar planilha"}
            </Button>
            <p className="text-gray-800 text-sm mt-2 text-center">
              Após criar a planilha, você poderá registrar gastos enviando
              mensagens para o WhatsApp do bot.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold text-purple-700 text-center">
              🎉 Tudo pronto!
            </h2>
            <p className="text-gray-800 text-center">
              Agora você pode começar a registrar seus gastos! <br />
              Basta adicionar este número no WhatsApp:
            </p>
            <p className="text-lg font-mono text-purple-700 text-center bg-purple-100 px-3 py-1 rounded">
              +1 (555) 182-1747
            </p>
            <p className="text-gray-800 text-center">
              Depois, envie uma mensagem descrevendo o gasto e o valor. Por
              exemplo: <br />
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                Almoço 25,00
              </span>{" "}
              <br />
              Pronto! Ele será registrado automaticamente na sua planilha.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="mt-2 w-full"
            >
              Ir para o dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
