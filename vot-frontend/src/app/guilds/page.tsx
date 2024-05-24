import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/utils";
import GuildCarousal from "./components/GuildCarousal";
export default async function Guilds() {
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
