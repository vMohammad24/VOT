import type { PrismaClient } from "@prisma/client";
import type { Client } from "discord.js";
import type { Kazagumo } from "kazagumo";
import type ICommand from "./ICommand";

export default interface LegacyHandler {
    client: Client;
    prodMode: boolean;
    testServers: string[];
    developers: string[];
    globalPrefix: string;
    prisma: PrismaClient;
    kazagumo: Kazagumo;
    commands: ICommand[];
}