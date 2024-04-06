"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function TokenLoader() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  if (token) {
    document.cookie = `token=${token}`;
    router.push("/");
    router.refresh();
  }
  return <></>;
}
