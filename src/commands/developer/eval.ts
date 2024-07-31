
import { ApplicationCommandOptionType, Colors, EmbedBuilder, ModalBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { transpile } from 'typescript'

export default {
    name: 'eval',
    description: "Allows the developer to evaluate code",
    aliases: ['e'],
    perms: "dev",
    type: "dmOnly",
    options: [
        {
            name: "code",
            description: "The code to evaluate",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    execute: async ({ handler, args, channel, guild, interaction, member, message, player }) => {
        let code = args.get('code');
        const embed = new EmbedBuilder()
            .setTitle("Eval")
            .setColor(Colors.NotQuiteBlack)
        const excludeCodeWith = /token|secret|password|pass|client\.token|client\.secret|client\.password|client\.pass/gi;
        if (excludeCodeWith.test(code)) {
            embed.setDescription("``nuh uh``");
            return { embeds: [embed] }
        }
        const startTime = new Date();
        try {
            if (code.startsWith('```')) {
                code = code.replace(/```/g, "")
            }
            const evaluatedResult = Function(`"use strict";return ${code}`)()
            embed.setDescription(`\`\`\`js\n${evaluatedResult}\`\`\``)
        } catch (e) {
            embed.setDescription(`\`\`\`js\n${e}\`\`\``)
        }
        embed.setFooter({ text: `Took ${new Date().getTime() - startTime.getTime()}ms` })
        return { embeds: [embed] }
    }
} as ICommand