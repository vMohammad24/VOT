"use client";;
import { Info, PenLine, Settings, Ticket, Triangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
  params: { id: string };
}
export default function GuildLayout({ children, params: { id } }: Props) {
  const getCurrentPath = () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePathname().split("/").pop()!;
  };
  const NavMenu = () => {
    const guildLink = `/guilds/${id}`;

    const ToolTipIconButton = ({
      path,
      icon,
      content,
    }: {
      path: string;
      icon: React.ReactNode;
      content: string;
    }) => {
      let isMuted = getCurrentPath() === path.slice(1) ? " bg-muted" : "";
      if (path === "/") {
        isMuted = getCurrentPath() === id ? " bg-muted" : "";
      }
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={guildLink + path}>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-lg${isMuted && " " + isMuted}`}
                aria-label={content}
              >
                {icon}
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5}>
            {content}
          </TooltipContent>
        </Tooltip>
      );
    };
    return (
      <aside className="inset-y fixed  left-0 z-20 flex h-full flex-col border-r bg-slate-950">
        <div className="border-b p-2">
          <ToolTipIconButton
            path="/.."
            icon={<Triangle className="size-5 fill-foreground" />}
            content="Guilds"
          />
        </div>

        <nav className="grid gap-1 p-2">
          <ToolTipIconButton
            content="Info"
            icon={<Info className="size-5" />}
            path="/"
          />
          <ToolTipIconButton
            content="Tickets"
            icon={<Ticket className="size-5" />}
            path="/tickets"
          />
          <ToolTipIconButton
            content="Welcome Message"
            icon={<PenLine className="size-5" />}
            path="/welcome"
          />
          <ToolTipIconButton
            content="Settings"
            icon={<Settings className="size-5" />}
            path="/settings"
          />
        </nav>
      </aside>
    );
  };

  return (
    <section>
      <NavMenu />
      <main className="ml-16 bg-base min-h-screen">{children}</main>
    </section>
  );
}
