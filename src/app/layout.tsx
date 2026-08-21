import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AmbientGlow } from "@/components/AmbientGlow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymOS - Gym Management Software",
  description: "Run your entire gym from one simple platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div id="site-root" className="min-h-screen w-full relative isolate">
            <AmbientGlow />
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
