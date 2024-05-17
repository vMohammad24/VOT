import { apiUrl } from "@/lib/utils";

import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/custom/StatsCard";
export default async function GuildPage({
  params,
}: {
  params: { id: string };
}) {
  const token = cookies().get("token");
  if (!token) {
    return (
      <>
        <h1>Not Logged In</h1>
      </>
    );
  }
  const user = await prisma.user.findUnique({ where: { token: token.value } });
  if (!user) {
    return (
      <>
        <h1>Not Logged In</h1>
      </>
    );
  }
  const res = await fetch(apiUrl + "discord/guilds", {
    headers: {
      Authorization: token.value,
    },
  }).then((res) => res.json());
  if (res.error) {
    const discord = await prisma.discord.findUnique({
      where: {
        userId: user.id,
      },
    });
    if (!discord) {
      return (
        <>
          <h1>Not Logged In</h1>
        </>
      );
    }
    await fetch(
      apiUrl + "discord/callback?refresh_token=" + discord.refreshToken,
      {
        headers: {
          Authorization: token.value,
        },
      }
    ).then((res) => res.json());
  }
  const { id: guildId } = params;
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
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          Guild not found
        </div>
      </main>
    );
  }
  if (guild.admins.some((admin) => admin.id === user.id) === false) {
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          You are not an admin of {guild.name}
        </div>
      </main>
    );
  }
  const guildInfo = await fetch(apiUrl + "discord/guilds/" + guildId, {
    headers: {
      Authorization: token.value,
    },
  }).then((res) => res.json());

  if (guildInfo.error == "notInGuild") {
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          <Link href={apiUrl + "discord/invite"} className="justify-center">
            <Button>Invite VOT</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <h3 className="font-bold text-3xl text-center mb-2">
        Currently managing: {guild.name}
      </h3>
      <div className="md:flex justify-between gap-2 p-2">
        <StatsCard title="Members" value={guildInfo.memberCount} />
        <StatsCard
          title="Channels"
          value={(guildInfo.textChannels as any[]).length.toString()}
        />
        <StatsCard title="Current Prefix" value={guildInfo.prefix} />
      </div>
    </main>
  );
  // return (
  //   <main className="bg-slate-900 min-h-screen text-white ">
  //     <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-max min-h-max ">
  //       <Tabs defaultValue="Info" className="w-[800px] h-[800px]">
  //         <h3 className="font-bold text-xl text-center mb-2 text-slate-400">
  //           {guild.name}
  //         </h3>
  //         <TabsList className="grid w-full grid-cols-3">
  //           <TabsTrigger value="Info">Info</TabsTrigger>
  //           <TabsTrigger value="Ticket">Ticket Panel</TabsTrigger>
  //           <TabsTrigger value="Settings">Settings</TabsTrigger>
  //         </TabsList>
  //         <Card className="mt-2 max-h-full">
  //           <TabsContent value="Info">
  //             <CardContent className="flex justify-between gap-2 p-2">
  //               <StatsCard title="Members" value={guildInfo.memberCount} />
  //               <StatsCard
  //                 title="Channels"
  //                 value={(guildInfo.textChannels as any[]).length.toString()}
  //               />
  //               <StatsCard title="Current Prefix" value={guildInfo.prefix} />
  //             </CardContent>
  //           </TabsContent>
  //           <TabsContent value="Ticket">
  //             <div className="m-2 p-5">
  //               <TicketPanel
  //                 guild={guild}
  //                 token={token.value}
  //                 channels={channels}
  //                 categories={categories}
  //                 roles={roles}
  //               />
  //             </div>
  //           </TabsContent>
  //           <TabsContent value="Settings">
  //             <CardHeader>
  //               <CardTitle>Settings</CardTitle>
  //               <CardDescription>
  //                 Change settings for {guild.name}
  //               </CardDescription>
  //             </CardHeader>
  //             <CardContent>
  //               <div className="grid grid-cols-2">
  //                 <Card>
  //                   <CardHeader>
  //                     <CardTitle>Prefix</CardTitle>
  //                     <CardDescription>
  //                       Change the prefix for this guild
  //                     </CardDescription>
  //                   </CardHeader>
  //                   <CardContent>
  //                     <PrefixInputBox
  //                       currentPrefix={guild.prefix}
  //                       guildId={guildId}
  //                       token={token.value}
  //                       apiUrl={apiUrl}
  //                     />
  //                   </CardContent>
  //                 </Card>
  //                 <Card>
  //                   <CardHeader>
  //                     <CardTitle>Logging</CardTitle>
  //                     <CardDescription>
  //                       Change the logging settings for this guild
  //                     </CardDescription>
  //                   </CardHeader>
  //                   <CardContent className="min-w-max">
  //                     <LoggingComboBox
  //                       channels={channels}
  //                       guildId={guildId}
  //                       token={token.value}
  //                       apiUrl={apiUrl}
  //                       currentChannel={guild.loggingChannel}
  //                     />
  //                   </CardContent>
  //                 </Card>
  //               </div>
  //             </CardContent>
  //           </TabsContent>
  //         </Card>
  //       </Tabs>
  //     </div>
  //   </main>
  // );
}
