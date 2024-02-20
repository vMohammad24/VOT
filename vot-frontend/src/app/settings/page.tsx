import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SpotifyRelink from "./components/SpotifyRelink";
import { apiUrl } from "../page";

export default async function Settings() {
  const token = cookies().get("token")?.value;
  if (!token) return <Link href="/">GO back</Link>;
  const user = await prisma.user.findFirst({
    where: {
      token,
    },
    select: {
      spotify: true,
      avatar: true,
      email: true,
      name: true,
      token: true,
    },
  });
  if (!user) return <Link href="/">GO back</Link>;
  const isSpotifyLinked = user.spotify !== null;
  return (
    <main className="bg-slate-900 min-h-screen text-white overflow-hidden">
      <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
        <Card>
          <CardHeader>
            <h2 className="font-bold">Spotify Settings</h2>
          </CardHeader>
          <CardContent className="flex flex-col">
            Spotify is currently {isSpotifyLinked ? "linked" : "not linked"}
            <Link href="/spotify" className="self-center mt-2">
              <Button>
                {isSpotifyLinked ? "Relink Account" : "Link Account"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
