import type { PrismaClient } from "@prisma/client";
import type { Client } from "discord.js";
import type { Kazagumo } from "kazagumo";
import type ICommand from "./ICommand";
import type { IContextCommand } from "./IContextCommand";

export default interface SlashHandler {
	client: Client;
	testServers: string[];
	developers: string[];
	prodMode: boolean;
	prisma: PrismaClient;
	kazagumo: Kazagumo;
	commands: (ICommand | IContextCommand)[];
}
