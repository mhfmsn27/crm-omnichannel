import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 
import { AuthProvider } from "@/context/AuthContext";
import React from 'react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WA Gateway Admin",
  description: "Admin panel for managing WhatsApp SaaS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
