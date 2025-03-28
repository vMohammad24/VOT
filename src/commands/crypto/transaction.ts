import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

interface BlockCypherTx {
	hash: string;
	block_height: number;
	total: number;
	fees: number;
	received: string;
	confirmed: string;
	inputs: Array<{ addresses: string[] }>;
	outputs: Array<{ addresses: string[]; value: number }>;
}

const CRYPTO_CONFIG = {
	btc: {
		name: "Bitcoin",
		icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
		color: "#F7931A",
		endpoint: "https://api.blockcypher.com/v1/btc/main",
	},
	ltc: {
		name: "Litecoin",
		icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.png",
		color: "#345D9D",
		endpoint: "https://api.blockcypher.com/v1/ltc/main",
	},
} as const;

export default {
	description: "Displays information about a specific crypto transaction",
	aliases: ["txid"],
	options: [
		{
			name: "txid",
			description: "your transaction id",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "crypto",
			description: "cryptocurrency type",
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: "Bitcoin (BTC)", value: "btc" },
				{ name: "Litecoin (LTC)", value: "ltc" },
			],
		},
	],
	type: "all",
	disabled: false,
	execute: async ({ args, interaction }) => {
		const txid = args.get("txid") as string;
		const crypto = (args.get("crypto") as keyof typeof CRYPTO_CONFIG) || "ltc";

		if (!txid)
			return {
				content: "Invalid txid",
				ephemeral: true,
			};

		try {
			const config = CRYPTO_CONFIG[crypto];
			const response: AxiosResponse<BlockCypherTx> = await axios.get(
				`${config.endpoint}/txs/${txid}?limit=50&includeHex=true`,
			);

			const tx = response.data;
			const error = (tx as any).error;
			if (error) {
				return {
					content: error,
					ephemeral: true,
				};
			}
			const embed = new VOTEmbed()
				.setAuthor({
					name: `${config.name} Transaction Details`,
					iconURL: config.icon,
				})
				.addFields(
					{
						name: "**Block Height**",
						value: `\`${tx.block_height.toString()}\``,
						inline: true,
					},
					{
						name: "**Total Amount**",
						value: `\`${tx.total / 100000000} ${crypto.toUpperCase()}\``,
						inline: true,
					},
					{
						name: "**Fees**",
						value: `\`${tx.fees / 100000000} ${crypto.toUpperCase()}\``,
						inline: true,
					},
					{
						name: "**Received**",
						value: `\`${new Date(tx.received).toLocaleString()}\``,
						inline: true,
					},
					{
						name: "**Confirmed**",
						value: `\`${new Date(tx.confirmed).toLocaleString()}\``,
						inline: true,
					},
					{
						name: "**From**",
						value: tx.inputs[0].addresses
							.map((addr) => `\`${addr}\``)
							.join("\n"),
						inline: false,
					},
					{
						name: "**To**",
						value: tx.outputs
							.map(
								(out) =>
									`\`${out.addresses[0]}\` (\`${out.value / 100000000} ${crypto.toUpperCase()}\`)`,
							)
							.join("\n"),
						inline: false,
					},
				)
				.setFooter({ text: `TxID: ${tx.hash}` })
				.setTimestamp()
				.setColor(config.color);

			return { embeds: [embed] };
		} catch (error) {
			return {
				content:
					"Error fetching transaction details. Please check the transaction ID and try again.",
				ephemeral: true,
			};
		}
	},
} as ICommand;
