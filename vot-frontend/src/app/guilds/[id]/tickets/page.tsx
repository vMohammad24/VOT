import { apiUrl } from "@/lib/utils";
import { cookies } from "next/headers";
import TicketPanel from "../components/TicketPanel";
import prisma from "@/lib/prisma";
import DiscordEmbed from "@/components/custom/DiscordEmbed";

export default async function GuildTicketsPage({
  params: { id: guildId },
}: {
  params: { id: string };
}) {
  const token = cookies().get("token");
  if (!token) {
    return;
  }
  const guildInfo = await fetch(apiUrl + "discord/guilds/" + guildId, {
    headers: {
      Authorization: token.value,
    },
  }).then((res) => res.json());
  const channels = (guildInfo.textChannels as any[]).map((channel) => {
    return {
      value: channel.id,
      label: channel.name,
    };
  });
  const categories = (guildInfo.categoryChannels as any[]).map((channel) => {
    return {
      value: channel.id,
      label: channel.name,
    };
  });
  const roles = (guildInfo.roles as any[]).map((channel) => {
    return {
      value: channel.id,
      label: channel.name,
    };
  });
  const guild = await prisma.guild.findUnique({
    where: {
      id: guildId,
    },
    include: {
      admins: { select: { id: true } },
      TicketSettings: true,
    },
  });
  return (
    <main className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 border-2 rounded-lg">
      <TicketPanel
        guild={guild}
        token={token.value}
        channels={channels}
        categories={categories}
        roles={roles}
      />
    </main>
  );
}
