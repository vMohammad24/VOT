"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface PrefixInputBoxProps {
  currentPrefix: string;
  guildId: string;
  apiUrl: string;
  token: string;
}

export default function PrefixInputBox({
  currentPrefix,
  apiUrl,
  guildId,
  token,
}: PrefixInputBoxProps) {
  const [value, setValue] = useState(currentPrefix);
  const { toast } = useToast();
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch(`${apiUrl}discord/guilds/${guildId}`, {
            method: "PATCH",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prefix: value }),
          }).then((res) => res.json());
          if (res.error) {
            toast({
              title: "Error",
              description: res.error,
              color: "red",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: res.message,
              color: "green",
            });
          }
        }}
      >
        <Input
          type="text"
          id="prefix"
          placeholder="Prefix"
          value={value}
          onInput={(e) => {
            setValue(e.currentTarget.value);
          }}
        />
        <Button type="submit" className="mt-2">
          Save
        </Button>
      </form>
    </div>
  );
}
