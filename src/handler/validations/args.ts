import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";
export default async function (command: ICommand, ctx: CommandContext) {
    const { args, interaction, message } = ctx;
    const { options } = command;
    if (!options) return true;
    const allArgs = args.join(" ");
    if (message && allArgs.includes('"')) {
        // Add support for quotes
        const regex = /"([^"]+)"/g;
        const matches = allArgs.match(regex);
        if (matches) {
            const newArgs = allArgs.replace(regex, "");
            const newArgsArray = newArgs.split(" ");
            const finalArgs = newArgsArray.concat(matches);
            const finalArgsArray = finalArgs.filter((arg) => arg !== "");
            ctx.args = finalArgsArray;
        }
    }
    if (interaction) {
        const args = interaction.options.data.map((option) => (option.type === ApplicationCommandOptionType.Subcommand ? option.name : option.value) as string);
        ctx.args = args;
    }
    return true;
}