"use client";

import { ThemeProvider } from "next-themes";
import React, { ReactNode } from "react";
import { TooltipProvider } from "../ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TooltipProvider>
          <div className="min-h-max mocha font-sans antialiased text-text bg-base">{children}</div>
        </TooltipProvider>
      </ThemeProvider>
  );
}
