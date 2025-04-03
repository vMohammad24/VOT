import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { chatllm, searchBrave } from "../../util/brave";
import { pagination } from "../../util/pagination";
import VOTEmbed from "../../util/VOTEmbed";

export default {
	description: "Ask brave a question",
	category: "ai",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "question",
			description: "The question you want to ask brave",
			required: true,
		},
	],
	type: "all",
	execute: async ({ args, interaction: inter, message, editReply, user }) => {
		const q = (args.get("question") as string) || "test";
		let rMsg = message
			? await message.reply("Thinking...")
			: await inter!.deferReply();
		const func = async (query: string, params?: string) => {
			const queryResponse = (await searchBrave(query, params)).data.body
				.response;
			if (!queryResponse || !queryResponse.chatllm) {
				return editReply({ content: "No results found.", components: [] });
			}
			const summary = queryResponse.chatllm.summary_og;
			const llm = await chatllm(queryResponse.chatllm);
			const collector = rMsg.createMessageComponentCollector({
				filter: (i) => i.customId == `enrichments_${rMsg.id}`,
				time: 60_000 * 60,
			});
			collector.on("collect", async (i) => {
				const embed = new EmbedBuilder()
					.setTitle("Sources")
					.setDescription(
						llm.context_results
							.map((v) => `- [${v.title}](${v.url})`)
							.join("\n"),
					);
				await i.reply({
					embeds: [embed],
					ephemeral: true,
				});
			});
			const res = llm.raw_response || "No results found";
			/* {
					embeds: [embed],
					content: `> ${query}`,
					components: [
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
							new StringSelectMenuBuilder()
								.setCustomId("followup")
								.setPlaceholder("Select a follow up")
								.addOptions(
									llm.followups!.map((v, i) => ({
										label: v.slice(0, 99),
										value: i.toString(),
									})),
								),
						),
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel("View sources")
								.setStyle(ButtonStyle.Primary)
								.setCustomId(`enrichments_${rMsg.id}`),
						),
					],
					files: llm.images.map((v) => ({
						attachment: v.src,
						name: "image.png",
					})),
				},*/
			await pagination({
				interaction: inter,
				message,
				rMsg: rMsg as any,
				pages:
					res.match(/[\s\S]{1,1999}/g)!.map((text: string, i) => ({
						page: {
							embeds: [
								new VOTEmbed()
									.setTitle("Search results")
									.setDescription(text ?? "> No results found")
									.setColor("Green")
									.author(user)
							],
							content: `> ${query}`,
							components: [
								new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
									new StringSelectMenuBuilder()
										.setCustomId("followup")
										.setPlaceholder("Select a follow up")
										.addOptions(
											llm.followups!.map((v, i) => ({
												label: v.slice(0, 99),
												value: i.toString(),
											})),
										),
								),
								new ActionRowBuilder<ButtonBuilder>().addComponents(
									new ButtonBuilder()
										.setLabel("View sources")
										.setStyle(ButtonStyle.Primary)
										.setCustomId(`enrichments_${rMsg.id}`),
								),
							],
							files: llm.images.map((v) => ({
								attachment: v.src,
								name: "image.png",
							})),
						}
					}))

			})
			const collector2 = rMsg.createMessageComponentCollector({
				filter: (i) => i.customId == "followup" && i.user.id == user.id,
				time: 60_000 * 60,
			});
			collector2.on("collect", async (i) => {
				if (!i.isStringSelectMenu()) return;
				const page = Number.parseInt(i.values[0]);
				const followUp = llm.followups![page];
				if (!followUp) return;
				rMsg = await i.deferReply();
				await func(
					followUp,
					`&summary=${queryResponse.chatllm.key}&summary_og=${summary}&source=llmFollowup`,
				);
			});
		};
		await func(q, `&source=llm`);
	},
} as ICommand;
