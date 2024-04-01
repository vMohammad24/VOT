import { type Client, type ApplicationCommandDataResolvable, PermissionsBitField, ApplicationCommandType } from "discord.js";
import type ICommand from "../interfaces/ICommand";
import type SlashHandler from "../interfaces/SlashHandler";
import CommandHandler from "..";
export default class SlashCommandHandler {

    public commands: ICommand[] = [];
    private handler: CommandHandler;
    constructor({ client, commands }: SlashHandler, handler: CommandHandler) {
        this.commands = commands;
        this.handler = handler;
        this.initCommands(client);
        this.initListener(client);
    }

    public initCommands(client: Client) {
        const commands = this.commands.map(cmd => {
            let perms: bigint | null = 0n;
            if (cmd.perms && cmd.perms != "dev") {
                for (const perm of cmd.perms) {
                    for (const [key, value] of Object.entries(PermissionsBitField.Flags)) {
                        if (key == perm && typeof perms == "bigint") {
                            perms = perms | value;
                        }
                    }
                }
            } else {
                perms = null;
            }
            let uInstall = {};
            if (cmd.userInstall == true) {
                uInstall = {
                    integration_types: [0, 1, 2],
                    contexts: [0, 1],
                }
            }
            if (!cmd.type) cmd.type = ApplicationCommandType.ChatInput;
            const command = { ...cmd, defaultMemberPermissions: perms, dmPermission: false } as ApplicationCommandDataResolvable
            return { ...command, ...uInstall } as any
        })
        client.application?.commands.set(commands);
    }

    public initListener(client: Client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;
            const command = this.commands.find(cmd => cmd.name === interaction.commandName);
            if (!command) return;
            try {
                const execution = await this.handler.executeCommand(command, interaction);
                if (execution) {
                    if (interaction.deferred) {
                        await interaction.editReply(execution);
                    } else {
                        await interaction.reply(execution);
                    }
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command, please try again later', ephemeral: true });
            }
        })
    }

}