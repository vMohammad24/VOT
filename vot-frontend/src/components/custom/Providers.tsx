// app/providers.jsx

"use client";

import { ThemeProvider } from "next-themes";
import React, { ReactNode } from "react";
import { TooltipProvider } from "../ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div className="bg-base">{children}</div>
      </ThemeProvider>
    </TooltipProvider>
  );
}
