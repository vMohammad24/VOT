"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useFormState, useFormStatus } from "react-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { submitWelcomeSettings } from "@/lib/actions";

const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  message: z.string().optional(),
  channel: z.string(),
});

export default function WelcomePanel({
  guild,
  token,
  channels,
}: {
  guild: any;
  token: string;
  channels: {
    label: string;
    value: string;
  }[];
}) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: guild.WelcomeSettings?.embedTitle || "",
      description: guild.WelcomeSettings?.embedDesc || "",
      message: guild.WelcomeSettings?.message || "",
      channel: guild.WelcomeSettings?.channelId || "",
    },
  });

  const handleSub = submitWelcomeSettings.bind(
    null,
    form.getValues(),
    guild.id,
    token
  );
  const [state, formAction] = useFormState(handleSub, null);
  return (
    <>
      <CardHeader>
        <h2 className="font-bold text-center">Welcome Message Settings</h2>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Welcome to the server" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the title that will be displayed on the embed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Hopefully you enjoy your stay!"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the description that will be displayed on the embed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message content</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Hello {{user}}, welcome to the server!"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the the content of the welcome message
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? channels.find(
                                (channel) => channel.value === field.value
                              )?.label
                            : "Select a channel..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search channels..." />
                        <CommandEmpty>No channel found.</CommandEmpty>
                        <CommandGroup>
                          {channels.map((channel) => (
                            <CommandItem
                              key={channel.value}
                              value={channel.label}
                              onSelect={() => {
                                form.setValue("channel", channel.value);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === channel.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {channel.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    This is the channel where the embed will be sent when a new
                    user joins
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
