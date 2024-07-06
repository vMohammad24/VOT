import { apiUrl } from "@/lib/utils";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { redirect } from "next/navigation";

interface Message {
    username: string, content: string, timestamp: string, attachments: string[], roleColor: string, avatar: string
}

export default async function GuildPage({
  params,
}: {
  params: { id: string };
}) {
  const token = cookies().get("token");
  if (!token) {
      return redirect(apiUrl + "discord/callback");
  }
  const user = await prisma.user.findUnique({ where: { token: token.value } });
  if (!user) {
      return redirect(apiUrl + "discord/callback");
  }
  const ticketId = params.id;
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
      <main className="min-h-screen flex justify-center items-center">
        <h1 className=" text-xl">Ticket not found</h1>
      </main>
    );
  }
  if ((!ticket.Guild.admins.some((admin) => admin.id === user.id)) && (ticket.userId !== user.id)) {
    return (
      <main className="min-h-screen flex justify-center items-center">
        <h1 className=" text-xl">You do not have permission to view this ticket</h1>
      </main>
    );
  }
  const transcript = (await (await fetch(`https://cdn.nest.rip/uploads/${ticket.transcriptId}`)).json() as Message[]).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const tsTs = transcript.map((message) => new Date(message.timestamp));
  return (
    <main className=" min-h-screen flex justify-center items-center">
      <div className="bg-slate-800 p-6 bg-blend-darken rounded-lg shadow-md max-w-3xl w-full">
        <div className="space-y-4">
          {transcript.map((message, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="shrink-0">
                <Image src={message.avatar} alt="avatar" width={50} height={50} className="rounded-full"/>
              </div>
              <div>
                <p className={`text-sm text-[${message.roleColor}]`}>{message.username} <span className="text-gray-400">{tsTs[i].toLocaleTimeString()} - {tsTs[i].toLocaleDateString()}</span></p>
                <div>
                  <p className="">{message.content}</p>
                  {message.attachments && message.attachments.map((attachment, i) => (
                    <Image key={i} src={"https://cdn.nest.rip/uploads/" + attachment} alt="attachment" width={412} height={412} className="rounded-md"/>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
