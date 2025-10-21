"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

type Croc = {
  id: number;
  top: number;
  left: number;
  x: number;
  y: number;
  duration: number;
};

export default function Home() {
  const { isSignedIn } = useAuth();

  const [crocs, setCrocs] = useState<Croc[]>([]);

  useEffect(() => {
    const numCrocs = 20;
    const generated = Array.from({ length: numCrocs }, (_, i) => {
      const top = Math.random() * window.innerHeight;
      const left = Math.random() * window.innerWidth;

      // movement range (random ping-pong vectors)
      const x = (Math.random() - 0.5) * 400; // -200 → 200
      const y = (Math.random() - 0.5) * 400;

      return {
        id: i,
        top,
        left,
        x,
        y,
        duration: 8 + Math.random() * 6,
      };
    });
    setCrocs(generated);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center pt-20">
      {/* Crocs pingponging */}
      <div>
        {crocs.map((c) => (
          <motion.div
            key={c.id}
            className="absolute text-4xl select-none z-0"
            style={{ top: c.top, left: c.left }}
            animate={{ x: [0, c.x], y: [0, c.y] }}
            transition={{
              duration: c.duration,
              repeat: Infinity,
              repeatType: "reverse", // bounce
              ease: "easeInOut",
            }}
          >
            {Math.random() < 0.5 ? "🐊" : "💸"}
          </motion.div>
        ))}
      </div>
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center relative z-10 p-6"
      >
        <h1 className="text-6xl md:text-7xl font-extrabold text-white drop-shadow-lg">
          Croco Conta
        </h1>
        <p className="mt-6 text-lg md:text-xl text-green-100 max-w-md mx-auto font-semibold">
          Registre seus gastos pelo Zap e veja tudo organizadinho numa planilha
          no seu próprio google docs. As informações não são salvas em nenhum
          outro lugar. 🐊
        </p>

        <div className="mt-12">
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-xl shadow-lg bg-white text-purple-900 hover:bg-purple-200"
            >
              Começar 🚀
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
