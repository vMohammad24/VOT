
import { ApplicationCommandOptionType, Colors, EmbedBuilder, ModalBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'eval',
    description: "Allows the developer to evaluate code",
    aliases: ['e'],
    perms: "dev",
    userInstall: true,
    options: [
        {
            name: "code",
            description: "The code to evaluate",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    execute: async ({ handler, args, channel, guild, interaction, member, message, player }) => {
        // console.log(args)
        if (typeof args[args.length - 1] == "boolean") {
            args.pop();
        }
        let code = args.join(" ");
        const embed = new EmbedBuilder()
            .setTitle("Eval")
            .setColor(Colors.NotQuiteBlack)
        const excludeCodeWith = /token|secret|password|pass|client\.token|client\.secret|client\.password|client\.pass/gi;
        if (excludeCodeWith.test(code)) {
            embed.setDescription("``nuh uh``");
            return { embeds: [embed] }
        }
        try {
            if (code.startsWith('```')) {
                code = code.replace(/```/g, "")
            }
            let evaled = await eval(code);
            embed.setDescription(`\`\`\`js\n${evaled}\`\`\``)
        } catch (e) {
            embed.setDescription(`\`\`\`js\n${e}\`\`\``)
        }
        return { embeds: [embed] }
    }
} as ICommand