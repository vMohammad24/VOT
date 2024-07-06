import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Card,
} from "@/components/ui/card";
import { apiUrl } from "@/lib/utils";
import LoggingComboBox from "../components/LoggingComboBox";
import PrefixInputBox from "../components/PrefixInputBox";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import InviteButton from "../../components/InviteButton";

export default async function GuildSettingsPage({
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
  if (guildInfo.error == "notInGuild") {
    return <InviteButton />
  }
  const channels = (guildInfo.textChannels as any[]).map((channel) => {
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
  if (!guild) {
    return;
  }
  return (
    <Card className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Change settings for {guild.name}</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prefix</CardTitle>
              <CardDescription>
                Change the prefix for this guild
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrefixInputBox
                currentPrefix={guild.prefix}
                guildId={guildId}
                token={token.value}
                apiUrl={apiUrl}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Logging</CardTitle>
              <CardDescription>
                Change the logging settings for this guild
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-max">
              <LoggingComboBox
                channels={channels}
                guildId={guildId}
                token={token.value}
                apiUrl={apiUrl}
                currentChannel={guild.loggingChannel}
              />
            </CardContent>
          </Card>
      </CardContent>
    </Card>
  );
}
