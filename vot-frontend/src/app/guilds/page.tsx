import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/utils";
import GuildCarousal from "./components/GuildCarousal";
import { redirect } from "next/navigation";
export default async function Guilds() {
  const token = cookies().get("token");
  if (!token) {
    redirect(apiUrl + "discord/callback");
    
  }
  const user = await prisma.user.findUnique({ where: { token: token.value }, select: {discord: true, id: true} });
  if (!user) {
    redirect(apiUrl + "discord/callback");
  }
  const res = await fetch(apiUrl + "discord/guilds", {
    headers: {
      Authorization: token.value,
    },
  }).then((res) => res.json());
  if (res.error) {
    const {discord} = user;
    if (!discord) {
      return redirect(apiUrl + "discord/callback");
    }
  }
  const guilds = await prisma.guild.findMany({
    where: {
      admins: {
        some: {
          id: user.id,
        },
      },
    },
  });
  return (
    <main className=" min-h-screen text-text overflow-hidden">
      <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
        <GuildCarousal guilds={guilds} />
      </div>
    </main>
  );
}
