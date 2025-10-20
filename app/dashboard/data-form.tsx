"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  PhoneInput,
  defaultCountries,
  parseCountry,
} from "react-international-phone";

export default function DashboardPage() {
  const { user } = useUser();
  const [phone, setPhone] = useState("");
  const [sheetOption, setSheetOption] = useState<"link" | "new">("link");
  const [sheetLink, setSheetLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/save-user-data", {
      method: "POST",
      body: JSON.stringify({
        phone,
        sheetOption,
        sheetLink,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Dados salvos com sucesso!");
    } else {
      setMessage("Erro: " + data.error);
    }
    setLoading(false);
  }
  const countries = defaultCountries.filter((country) => {
    const { iso2 } = parseCountry(country);
    return ["br"].includes(iso2);
  });
  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Configuração</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Número Whatsapp:</label>
          <div className="w-full">
            <PhoneInput
              countries={countries}
              defaultCountry="br"
              value={phone}
              onChange={(text) => setPhone(text)}
              required
            ></PhoneInput>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Tabela Google Drive</label>
          <div className="space-x-4">
            <label className="block">
              <input
                type="radio"
                value="new"
                checked={sheetOption === "new"}
                onChange={() => setSheetOption("new")}
              />
              Criar nova tabela para mim
            </label>
            <label className="block">
              <input
                type="radio"
                value="link"
                checked={sheetOption === "link"}
                onChange={() => setSheetOption("link")}
              />
              Usar uma tabela compartilhadas comigo
            </label>
          </div>
        </div>

        {sheetOption === "link" && (
          <div>
            <input
              type="text"
              value={sheetLink}
              onChange={(e) => setSheetLink(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </form>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
