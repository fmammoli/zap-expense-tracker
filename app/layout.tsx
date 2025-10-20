import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZapGastos",
  description:
    "Converse com o bot no WhatsApp e registre seus gastos direto na sua planilha.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="pt-BR">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen 
          bg-gradient-to-b from-green-400 via-purple-400 to-pink-400 overflow-hidden`}
        >
          {/* Fun Header */}
          {/* Fun Header */}
          <header className="relative p-6 rounded-2xl z-10">
            <div
              className="flex justify-between items-center px-6 py-4 
                  bg-white/20 backdrop-blur-xs shadow-md rounded-2xl"
            >
              {/* Logo / App Name */}
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-bounce">🐊</span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide drop-shadow">
                  CrocoConta
                </h1>
              </div>

              {/* Auth Controls */}
              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton
                    fallbackRedirectUrl={
                      process.env
                        .NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
                    }
                  >
                    <Button className="bg-white/80 text-purple-700 font-semibold rounded-full px-5 py-2 hover:scale-105 hover:bg-yellow-200 transition-transform shadow">
                      Entrar
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="bg-yellow-400 hover:bg-yellow-300 text-purple-900 font-bold rounded-full px-6 py-2 transition-transform hover:scale-110 shadow-lg">
                      Registrar 🎉
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox:
                          "w-12 h-12 border-2 border-white shadow-lg",
                      },
                    }}
                  />
                </SignedIn>
              </div>
            </div>

            {/* Wavy divider */}
            <svg
              className="absolute bottom-[-1px] left-0 w-full rotate-180 text-transparent"
              viewBox="0 0 1440 80"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                fill="currentColor"
                d="M0,64L48,58.7C96,53,192,43,288,42.7C384,43,480,53,576,64C672,75,768,85,864,74.7C960,64,1056,32,1152,21.3C1248,11,1344,21,1392,26.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0,192,0,96,0,48,0L0,0Z"
              ></path>
            </svg>
          </header>

          {/* Page content */}
          <main className="pt-20">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
