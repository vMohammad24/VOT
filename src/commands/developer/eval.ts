import { exec } from "child_process";
import { promisify } from "util";
import { inspect } from "bun";
import { ApplicationCommandOptionType, Colors, EmbedBuilder } from "discord.js";
import numeral from "numeral";
import commandHandler, { redis } from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
const execAsync = promisify(exec);
export default {
	name: "eval",
	description: "Allows the developer to evaluate code",
	aliases: ["e"],
	perms: "dev",
	type: commandHandler.prodMode ? "dmOnly" : "all",
	options: [
		{
			name: "type",
			description: "The type of code to evaluate",
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{
					name: "TypeScript",
					value: "ts",
				},
				{
					name: "JavaScript",
					value: "js",
				},
				{
					name: "Shell",
					value: "sh",
				},
				{
					name: "SQL",
					value: "sql",
				},
				{
					name: "Redis",
					value: "redis",
				},
				{
					name: "Source",
					value: "src",
				},
			],
		},
		{
			name: "code",
			description: "The code to evaluate",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	execute: async (ctx) => {
		const {
			handler,
			args,
			channel,
			guild,
			interaction,
			member,
			message,
			player,
		} = ctx;
		let code = args.get("code") as string | undefined;
		if (!code) return { content: "No code provided", ephemeral: true };
		const embed = new EmbedBuilder()
			.setTitle("Eval")
			.setColor(Colors.NotQuiteBlack);
		const excludeCodeWith =
			/token|process|env|meta|secret|password|pass|client\.token|client\.secret|client\.password|client\.pass/gi;
		if (excludeCodeWith.test(code)) {
			embed.setDescription("``nuh uh``");
			return { embeds: [embed] };
		}
		const startTime = process.hrtime();
		try {
			if (code.startsWith("```")) {
				code = code.slice(3, -3);
			}
			let lang = args.get("type");
			let evaluatedResult = "";
			switch (lang) {
				case "sql":
					evaluatedResult = inspect(
						JSON.stringify(await handler.prisma.$queryRawUnsafe(code)),
					);
					break;
				case "redis":
					evaluatedResult = (await redis.eval(code, 0)) as string;
					break;
				case "js":
					evaluatedResult = await eval(code);
					break;
				case "sh":
				case "shell":
					const { stdout: shellStdout, stderr: shellStderr } =
						await execAsync(code);
					evaluatedResult = shellStdout || shellStderr;
					break;
				case "src":
				case "source":
					const command = await commandHandler.commands!.find(
						(c) => c.name === code || c.aliases?.includes(code!),
					);
					if (!command)
						return { content: "Command not found", ephemeral: true };
					evaluatedResult = "" + command.execute;
					lang = "ts";
					break;
				default:
					evaluatedResult = await new Function(`
						return (async () => { 
						const { handler, args, channel, guild, interaction, member, message, player } = arguments[0];return ${code} })();
					`).call(null, {
						handler,
						args,
						channel,
						guild,
						interaction,
						member,
						message,
						player,
					});
					break;
			}
			embed.setDescription(`\`\`\`${lang}\n${evaluatedResult}\`\`\``);
		} catch (e) {
			embed.setDescription(`\`\`\`js\n${e}\`\`\``).setColor("DarkRed");
		}
		const diff = process.hrtime(startTime);
		const microseconds = diff[0] * 1e6 + diff[1] / 1e3;
		const timeTaken =
			microseconds > 2000
				? `${numeral(microseconds / 1000).format("0,0.0")}ms`
				: `${numeral(microseconds).format("0,0.0")}µs`;
		embed.setFooter({
			text: `Took ${timeTaken}`,
		});
		return { embeds: [embed] };
	},
} as ICommand;
