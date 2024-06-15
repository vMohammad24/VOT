import StatsCard from "@/components/custom/StatsCard";
import TokenLoader from "@/components/custom/TokenLoader";
import UptimeCard from "@/components/custom/UptimeCard";
import {
  TypewriterEffect,
  TypewriterEffectSmooth,
} from "@/components/ui/typewriter-effect";
import prisma from "@/lib/prisma";
import { apiUrl } from "@/lib/utils";
import { cookies } from "next/headers";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default async function Home() {
  const token = cookies().get("token");
  let stats: {
    [key: string]: string; // Add index signature
    ping: string;
    upSince: string;
    totalMembers: string;
    totalGuilds: string;
    totalCommands: string;
  } | null = null;
  console.log(apiUrl);
  await fetch(apiUrl)
    .then(async (res) => await res.json())
    .then((data) => {
      stats = data;
    });
  const commandsRan = await prisma.command.count();
  const upSince = parseInt(stats!.upSince);
  const description = "A multi-purpose Discord bot.".split(" ").map((word) => {
    return { text: word, className: "md:text-4xl text-white" };
  });
  return (
    <main className="min-h-screen">
      <TokenLoader />
      <div className="absolute m-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full pt-32">
        <div className="flex flex-col align-middle items-center">
          <h1
            id="welcome"
            className="ease-linear text-5xl animate-in fade-in duration-500 font-bold text-transparent bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% bg-clip-text md:text-6xl"
          >
            Welcome to <b>VOT</b>
          </h1>
          <TypewriterEffect words={description} className="text-white" />
        </div>
        <div
          id="cards"
          className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 justify-items-center w-fit max-w-7xl m-auto"
        >
          <StatsCard title="VOT's Ping" value={stats!.ping} />
          <UptimeCard title="Uptime" value={upSince} />
          <StatsCard title="Total Members" value={stats!.totalMembers} />
          <StatsCard title="Total Guilds" value={stats!.totalGuilds} />
          <StatsCard title="Total Commands" value={stats!.totalCommands} />
          <StatsCard
            title="Total Commands Ran"
            value={commandsRan.toString()}
          />
        </div>
      </div>
    </main>
  );
}
