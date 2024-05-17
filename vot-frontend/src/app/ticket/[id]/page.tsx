import { apiUrl } from "@/lib/utils";

import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";

interface Message {
    username: string, content: string, timestamp: string, attatchments: string[]
}

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
  const ticketId = parseInt(params.id);
  if(isNaN(ticketId)){
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          Invalid ticket id
        </div>
      </main>
    );
  }
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
        Guild: {include: {admins: {select: {id: true}}}},
        transcriptId: true,
        userId: true,
    },
  });
  if (!ticket) {
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          Ticket not found
        </div>
      </main>
    );
  }
  if ((!ticket.Guild.admins.some((admin) => admin.id === user.id)) && (ticket.userId !== user.id)) {
    return (
      <main className="bg-slate-900 min-h-screen text-white ">
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          You do not have permission to view this ticket
        </div>
      </main>
    );
  }
  const transcript = await (await fetch(`https://cdn.nest.rip/uploads/${ticket.transcriptId}`)).json() as Message[];
  return (
    <main className="bg-slate-900 min-h-screen text-white ">
      <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
        <div className="flex justify-between flex-col">
          {transcript.map((message, index) => {
          return (
            <div key={index} className="bg-slate-800 p-4 rounded-lg mb-4">
              <div className="flex justify-between">
                <div className="text-lg font-bold">{message.username}</div>
                <div className="text-sm">{message.timestamp}</div>
              </div>
              <div className="text-white">{message.content}</div>
              {message.attatchments && message.attatchments.map((attatchment, index) => {
                return (
                  <img key={index} src={attatchment} className="w-1/2" />
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    </main>
  );
}
