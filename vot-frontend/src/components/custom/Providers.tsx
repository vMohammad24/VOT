// app/providers.jsx

"use client";

import { ThemeProvider } from "next-themes";
import React, { ReactNode } from "react";
import { TooltipProvider } from "../ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div className="mocha font-sans antialiased text-text bg-base h-full">{children}</div>
      </ThemeProvider>
    </TooltipProvider>
  );
}
