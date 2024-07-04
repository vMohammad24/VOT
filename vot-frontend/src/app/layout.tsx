import { Roboto } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect } from "react";
import Header from "@/components/ui/header";
import { Providers } from "@/components/custom/Providers";
import { Toaster } from "@/components/ui/toaster";

export const fontSans = Roboto({
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

export interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>VOT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta content="VOT" property="og:title" />
        <meta content="A multi-purpose discord bot" property="og:description" />
        <meta content="VOT" property="og:site_name" />
        <meta name="theme-color" content="#10b595" />
      </head>
      <body
        className={cn(
          `${fontSans.className} antialiased`,
        )}
      >
        <Providers>
          <Header />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
