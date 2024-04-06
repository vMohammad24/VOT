import type SlashHandler from "./interfaces/SlashHandler"
import type LegacyHandler from "./interfaces/LegacyHandler";
import SlashCommandHandler from "./slash";
import type ICommand from "./interfaces/ICommand";
import type { CommandContext } from "./interfaces/ICommand";
import { GuildMember, type Message, ChatInputCommandInteraction, type Interaction } from "discord.js";
import LegacyCommandHandler from "./legacy";
import ListenerHandler from "./listenres";
import { Glob } from "bun";
import path from 'path';
import PinoLogger from "pino";
interface RequiredShits {
    commandsDir: string;
    listenersDir: string;
}


type ICommandHandler = LegacyHandler & SlashHandler & RequiredShits;
// same as the above but without some types so we can declare it in the constructor
interface IMCommandHandler extends Omit<(LegacyHandler & SlashHandler & RequiredShits), 'categoryDirs' | 'commands'> { }

export default class CommandHandler {
    public prisma: ICommandHandler['prisma'];
    public kazagumo: ICommandHandler['kazagumo'];
    public client: ICommandHandler['client'];
    public developers: ICommandHandler['developers'];
    public commands: ICommandHandler['commands'] | undefined;
    public prodMode: ICommandHandler['prodMode'];
    private glob = new Glob("**/*.{ts,js}");
    public logger = PinoLogger({ name: "vCommands", })
    constructor(mHandler: IMCommandHandler) {
        const handler = mHandler as ICommandHandler;
        const { commandsDir, listenersDir } = handler;
        this.prisma = handler.prisma;
        this.kazagumo = handler.kazagumo;
        this.client = handler.client;
        this.developers = handler.developers
        this.prodMode = handler.prodMode;
        handler.commands = [];
        handler.client.on("ready", async () => {
            for await (const file of this.glob.scan({ absolute: false, cwd: commandsDir })) {
                const commandName = file.split("/").pop()!.split(".")[0];
                const categoryName = file.split("/").slice(-2, -1)[0];
                const command = await import(path.join(commandsDir, file));
                const modifiedData = Object.assign({}, command.default, {
                    name: commandName,
                    category: categoryName
                });
                if (modifiedData.disabled) continue;
                handler.commands.push(modifiedData);
                if (modifiedData.init) await modifiedData.init(this);
                this.logger.info(`Initialized command ${modifiedData.name} in ${modifiedData.category}`)
            }
            const Ilegacy = handler as LegacyHandler;
            const Islash = handler as SlashHandler;
            const slash = new SlashCommandHandler(Islash, this);
            const legacy = new LegacyCommandHandler(Ilegacy, this);
            this.commands = handler.commands;
            // listener
            const listener = new ListenerHandler(this, listenersDir, this.glob);
        })
    }


    public async executeCommand(command: ICommand, ctx: Interaction | Message) {
        let commandContext: CommandContext;
        const getPlayer = (member: GuildMember) => {
            if (!member) return;
            if (!member.guild) return;
            const player = this.kazagumo.getPlayer(member.guild.id);
            if (!member.voice.channelId) return null;
            if (player && player.voiceId !== member.voice.channelId) return;
            if (!player && command.needsPlayer) return this.kazagumo.createPlayer({
                guildId: member.guild.id,
                voiceId: member.voice.channelId,
                textId: member.voice.channelId,
            })
            return player;
        }
        if (ctx.applicationId) {
            const interaction = ctx as ChatInputCommandInteraction;
            commandContext = {
                interaction,
                user: interaction.user,
                channel: interaction.channel!,
                guild: interaction.guild!,
                handler: this,
                member: interaction.member! as GuildMember,
                args: [],
                message: null,
                player: await getPlayer(interaction.member as GuildMember) || undefined
            }
        } else {
            const message = ctx as Message;
            commandContext = {
                interaction: null,
                user: message.author,
                channel: message.channel,
                guild: message.guild!,
                handler: this,
                member: message.member!,
                args: message.content.split(" ").slice(1),
                message,
                player: await getPlayer(message.member as GuildMember) || undefined
            }
        }
        const validationDir = path.join(import.meta.dir, "validations");
        for await (const validationFile of this.glob.scan({ cwd: validationDir })) {
            const validation = await import(path.join(validationDir, validationFile));
            const result = await validation.default(command, commandContext);
            if (result !== true) return result;
        }
        await this.prisma.user.upsert({
            where: {
                id: commandContext.user.id,
            },
            update: {
                name: commandContext.user.username,
                avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
                commands: {
                    create: {
                        commandId: command.name!,
                        commandInfo: {
                            args: commandContext.args || null,
                            guild: commandContext.guild && commandContext.guild.id || null,
                            channel: commandContext.channel.id,
                            message: commandContext.message?.id || null,
                            interaction: commandContext.interaction?.id || null,
                        }
                    }
                }
            },
            create: {
                id: commandContext.user.id,
                name: commandContext.user.username,
                avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
                commands: {
                    create: {
                        commandId: command.name!,
                        commandInfo: {
                            args: commandContext.args || null,
                            guild: commandContext.guild.id,
                            channel: commandContext.channel.id,
                            message: commandContext.message?.id || null,
                            interaction: commandContext.interaction?.id || null,
                        }
                    }
                }
            },
        });
        const result = await command.execute(commandContext);
        return result;
    }
}