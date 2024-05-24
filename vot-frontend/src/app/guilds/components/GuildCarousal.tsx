"use client";
import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Guild } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
interface GuildCarousalProps {
  guilds: Guild[];
}

export default function GuildCarousal({ guilds }: GuildCarousalProps) {
  return (
    <Carousel className="w-full max-w-sm min-h-full border-none">
      <CarouselContent className="-ml-1">
        {guilds.map((guild, index) => (
          <CarouselItem
            key={index}
            className="pl-1 transition-shadow hover:shadow-xl"
          >
            <Link href={`/guilds/${guild.id}`} className="select-none">
              <div className="p-1">
                <Card>
                  <CardContent className="bg-blend-overlay flex flex-col gap-2 aspect-square items-center justify-center p-8">
                    {guild.icon && (
                      <Image
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=1024`}
                        alt={guild.name}
                        width={1024}
                        height={1024}
                        className="rounded-md"
                      />
                    )}
                    <span className="text-2xl font-semibold">{guild.name}</span>
                  </CardContent>
                </Card>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
