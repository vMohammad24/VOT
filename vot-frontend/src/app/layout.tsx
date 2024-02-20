import { Roboto } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect } from "react";
import Header from "@/components/ui/header";
import { Providers } from "@/components/custom/Providers";
import { Toaster } from "@/components/ui/toaster";
import Head from "next/head";

export const fontSans = Roboto({
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>VOT</title>
      </head>
      <body
        className={cn(
          `min-h-screen bg-background font-sans antialiased text-white ${fontSans.variable} {styles.text}`
        )}
      >
        <Header />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
