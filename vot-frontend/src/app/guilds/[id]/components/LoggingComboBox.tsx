"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "../../../../components/ui/use-toast";

interface ChannelProps {
  channels: {
    label: string;
    value: string;
  }[];
  guildId: string;
  token: string;
  apiUrl: string;
  currentChannel: string | null;
}

export default function LoggingComboBox({
  channels,
  guildId,
  token,
  apiUrl,
  currentChannel,
}: ChannelProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(currentChannel || "");
  const { toast } = useToast();
  const handleSelect = async (currentValue: string) => {
    setValue(currentValue === value ? "" : currentValue);
    setOpen(false);
    if (currentValue === "") return;
    // const res = await fetch(`${apiUrl}discord/guilds/${guildId}`, {
    //   method: "PATCH",
    //   body: JSON.stringify({
    //     loggingChannel: currentValue,
    //   }),
    //   headers: {
    //     authorization: token,
    //   },
    // }).then((res) => res.json());
    // if (res.error) {
    //   toast({
    //     title: "Error",
    //     description: res.error,
    //     color: "red",
    //     variant: "destructive",
    //   });
    // } else {
    //   toast({
    //     title: "Success",
    //     description: res.message,
    //     color: "green",
    //   });
    // }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {value
            ? channels.find((channel) => channel.value === value)?.label
            : "Select a channel..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search channels..." />
          <CommandEmpty>No channel found.</CommandEmpty>
          <CommandGroup>
            {channels.map((channel) => (
              <CommandItem
                key={channel.value}
                value={channel.label}
                onSelect={() => {
                  handleSelect(channel.value);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === channel.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {channel.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
