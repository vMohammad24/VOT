"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function TokenLoader() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  if (token) {
    document.cookie = `token=${token}`;
    const router = useRouter();
    router.push("/");
    router.refresh();
  }
  return <></>;
}
