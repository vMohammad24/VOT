"use client";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { useEffect, useState } from "react";

type CardProps = React.ComponentProps<typeof Card>;
type StatsCardProps = {
  title: string;
  value: number;
} & CardProps;

export default function UptimeCard({
  className,
  title,
  value,
  ...props
}: StatsCardProps) {
    const getUptime = () => {
        return new Date(Date.now() - value).toISOString().slice(11, 19)
    }
    const [uptime,setUptime] = useState("");
    useEffect(() => {
        const interval = setInterval(() => {
            setUptime(getUptime());
        }, 1);
        return () => clearInterval(interval);
    
    })
  return (
    <Card className={cn("w-[238px]", className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-small leading-none">{uptime}</p>
      </CardContent>
    </Card>
  );
}
