import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { FloatingNav } from "./floating-navbar";
import {
  HomeIcon,
  UserIcon,
  MessageCircleIcon,
  TerminalIcon,
  HotelIcon,
} from "lucide-react";
import { apiUrl } from "@/lib/utils";

export default async function Header() {
  const token = cookies().get("token")?.value;
  const isLoggedIn = token ? true : false;
  const user = isLoggedIn
    ? await prisma.user.findUnique({ where: { token } })
    : null;
  const navItems = [
    {
      name: "Home",
      link: "/",
      icon: <HomeIcon className="h-4 w-4 text-neutral-500 dark:" />,
    },
    {
      name: "Commands",
      link: "/commands",
      icon: (
        <TerminalIcon className="h-4 w-4 text-neutral-500 dark:" />
      ),
    },
    {
      name: "Guilds",
      link: "/guilds",
      icon: <HotelIcon className="h-4 w-4 text-neutral-500 dark:" />,
    },
  ];
  return (
    <FloatingNav
      navItems={navItems}
      loginLink={apiUrl + "discord/callback"}
      user={user || undefined}
    />
  );
}
