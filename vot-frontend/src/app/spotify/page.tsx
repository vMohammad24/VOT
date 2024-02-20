import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/utils";

export default async function Spotify({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const code = searchParams!.code;
  if (!code) return redirect(apiUrl + "spotify/callback");
  const token = cookies().get("token")?.value;
  if (!token) return;
  const user = await prisma.user.findFirst({
    where: {
      token,
    },
    include: {
      spotify: true,
    },
  });
  if (!user) return;
  const res = await fetch(apiUrl + "spotify/callback?code=" + code, {
    headers: {
      Authorization: user.token,
    },
  }).then((res) => res.json());
  if (res.success) {
    redirect("/settings");
  }
}
