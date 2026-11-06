import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { container } from "@/lib/layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farm Depot",
  description: "A B2B marketplace connecting farmers with bulk buyers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense
          fallback={
            <header className="border-b border-white/10">
              <div className={`${container} py-4 text-xl font-bold text-lime-300`}>
                Farm Depot
              </div>
            </header>
          }
        >
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}