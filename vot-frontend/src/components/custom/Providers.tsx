// app/providers.jsx

"use client";

import { ThemeProvider } from "next-themes";
import React, { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}
