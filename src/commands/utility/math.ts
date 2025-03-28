import { ApplicationCommandOptionType, Collection } from "discord.js";
import { all, create } from "mathjs";
import numeral from "numeral";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

const math = create(all);
const userContexts = new Collection<string, math.Parser>();

export default {
	description: "Perform mathematical calculations with persistent context",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "expression",
			description: "The mathematical expression to evaluate",
			required: true,
		},
	],
	type: "all",
	execute: async ({ args, user }) => {
		const userId = user.id;
		const expression = args.get("expression");
		if (!expression) {
			return {
				content: "Please provide a mathematical expression",
				ephemeral: true,
			};
		}

		if (!userContexts.has(userId)) {
			userContexts.set(userId, math.parser());
		}
		const parser = userContexts.get(userId)!;

		try {
			const startTime = process.hrtime();
			const result = parser.evaluate(expression);
			const diff = process.hrtime(startTime);
			const microseconds = diff[0] * 1e6 + diff[1] / 1e3;
			const timeTaken =
				microseconds > 2000
					? `${numeral(microseconds / 1000).format("0,0.0")}ms`
					: `${numeral(microseconds).format("0,0.0")}µs`;
			const embed = await new VOTEmbed()
				.setDescription(`\`\`\`js\n${result}\`\`\``)
				.setFooter({ text: `Context is Saved • Evaluated in ${timeTaken}` })
				.author(user)
				.dominant();

			return { embeds: [embed] };
		} catch (error: any) {
			return {
				content: `Error: ${error.message}`,
				ephemeral: true,
			};
		}
	},
} as ICommand;
