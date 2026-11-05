import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07090E",
};

export const metadata: Metadata = {
  title: "HIDERUSH — Real-World GPS Tag",
  description: "Mobile-first real-time multiplayer GPS Hide & Seek game.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HIDERUSH",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-game-black text-game-text min-h-[100dvh] flex flex-col antialiased">
        <ServiceWorkerRegister />
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative overflow-hidden">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
