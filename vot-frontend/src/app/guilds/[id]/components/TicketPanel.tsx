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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Guild } from "@prisma/client";
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
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  channel: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
});

export default function TicketPanel({
  guild,
  token,
  channels,
  roles,
  categories,
  apiUrl,
}: {
  guild: any;
  token: string;
  apiUrl: string;
  channels: {
    label: string;
    value: string;
  }[];
  roles: {
    label: string;
    value: string;
  }[];
  categories: {
    label: string;
    value: string;
  }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [open1, setOpen1] = React.useState(false);
  const [open2, setOpen2] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: guild.TicketSettings?.embedTitle || "",
      description: guild.TicketSettings?.embedDesc || "",
      channel: guild.TicketSettings?.channelId || "",
      role: guild.TicketSettings?.roleId || "",
      category: guild.TicketSettings?.categoryId || "",
    },
  });
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const res = await fetch(`${apiUrl}discord/guilds/${guild.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ticketEmbedTitle: data.title,
        ticketEmbedDesc: data.description,
        ticketChannelId: data.channel,
        ticketRoleId: data.role,
        ticketCategoryId: data.category,
      }),
      headers: {
        authorization: token,
      },
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
  };
  return (
    <>
      <CardHeader>
        <h2 className="font-bold text-center">Ticket Embed Settings</h2>
      </CardHeader>
      <ScrollArea>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embed Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Tickets" {...field} />
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
                        placeholder="This is where you open tickets"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the description that will be displayed on the
                      embed
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
                      This is the channel where the embed will be sent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cateogry</FormLabel>
                    <Popover open={open2} onOpenChange={setOpen2}>
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
                              ? categories.find(
                                  (category) =>
                                    category.value === category.value
                                )?.label
                              : "Select a category..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search categories..." />
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.value}
                                value={category.label}
                                onSelect={() => {
                                  form.setValue("category", category.value);
                                  setOpen2(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === category.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {category.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      This is the category where every ticket will be created in
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Popover open={open1} onOpenChange={setOpen1}>
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
                              ? roles.find((role) => role.value === field.value)
                                  ?.label
                              : "Select a role..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search roles..." />
                          <CommandEmpty>No role found.</CommandEmpty>
                          <CommandGroup>
                            {roles.map((role) => (
                              <CommandItem
                                key={role.value}
                                value={role.label}
                                onSelect={() => {
                                  form.setValue("role", role.value);
                                  setOpen1(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === role.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {role.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      This is the role that will have permissions to view every
                      ticket
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </CardContent>
      </ScrollArea>
    </>
  );
}
