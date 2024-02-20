import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { GuildTier, UserTier } from "../../handler/interfaces/ICommand";
import type { FilterOptions } from "shoukaku";
export default {
    description: "Change filters on the player",
    cooldown: 10000,
    needsPlayer: true,
    userTier: UserTier.Premium,
    options: [
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "volume",
            "description": "Adjust the volume",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "value",
                    "description": "Volume level",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "equalizer",
            "description": "Adjust the equalizer settings",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "band",
                    "description": "Equalizer band (1-10)",
                    "required": true
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "gain",
                    "description": "Gain value for the band",
                    "required": true
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "karaoke",
            "description": "Apply karaoke effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "level",
                    "description": "Karaoke level (0-100)",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "monolevel",
                    "description": "Mono level for karaoke",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "filterband",
                    "description": "Filter band for karaoke",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "filterwidth",
                    "description": "Filter width for karaoke",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "timescale",
            "description": "Apply timescale effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "speed",
                    "description": "Timescale speed",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "pitch",
                    "description": "Timescale pitch",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "rate",
                    "description": "Timescale rate",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "tremolo",
            "description": "Apply tremolo effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "frequency",
                    "description": "Tremolo frequency",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "depth",
                    "description": "Tremolo depth",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "vibrato",
            "description": "Apply vibrato effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "frequency",
                    "description": "Vibrato frequency",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "depth",
                    "description": "Vibrato depth",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "rotation",
            "description": "Apply rotation effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "rotationhz",
                    "description": "Rotation frequency (Hz)",
                    "required": false
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "distortion",
            "description": "Apply distortion effect",
            "options": [
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "sinoffset",
                    "description": "Sin offset for distortion",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "sinscale",
                    "description": "Sin scale for distortion",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "cosoffset",
                    "description": "Cos offset for distortion",
                    "required": false
                },
                {
                    "type": ApplicationCommandOptionType.Number,
                    "name": "cosscale",
                    "description": "Cos scale for distortion",
                    "required": false
                }
            ]
        }
    ],
    slashOnly: true,
    execute: async ({ handler, player, interaction, }) => {
        if (!interaction) return;
        const filter = interaction.options.getSubcommand();
        if (!player) return "No player found";
        if (!filter) return "Invalid filter";
        const args = interaction.options.data;
        const filterOptions: FilterOptions = player?.filters!;
        switch (filter) {
            case "volume":
                if (args[0]) {
                    const volume = args[0].value as number;
                    if (volume < 0 || volume > 100) return "Invalid volume";
                    filterOptions.volume = volume;
                }
                break;
            case "equalizer":
                if (args[0] && args[1]) {
                    const band = args[0].value as number;
                    const gain = args[1].value as number;
                    if (band < 1 || band > 10 || gain < -0.25 || gain > 1) return "Invalid equalizer band or gain";
                    filterOptions.equalizer = [{ band, gain }];
                }
                break;
            case "karaoke":
                if (args[0]) {
                    const level = args[0].value as number;
                    if (level < 0 || level > 100) return "Invalid karaoke level";
                    filterOptions.karaoke = { level };
                }
                if (args[1]) {
                    const monoLevel = args[1].value as number;
                    if (monoLevel < 0 || monoLevel > 100) return "Invalid mono level";
                    filterOptions.karaoke = { ...filterOptions.karaoke, monoLevel };
                }
                if (args[2]) {
                    const filterBand = args[2].value as number;
                    if (filterBand < 0 || filterBand > 100) return "Invalid filter band";
                    filterOptions.karaoke = { ...filterOptions.karaoke, filterBand };
                }
                if (args[3]) {
                    const filterWidth = args[3].value as number;
                    if (filterWidth < 0 || filterWidth > 100) return "Invalid filter width";
                    filterOptions.karaoke = { ...filterOptions.karaoke, filterWidth };
                }
                break;
            case "timescale":
                if (args[0]) {
                    const speed = args[0].value as number;
                    if (speed < 0 || speed > 100) return "Invalid timescale speed";
                    filterOptions.timescale = { speed };
                }
                if (args[1]) {
                    const pitch = args[1].value as number;
                    if (pitch < 0 || pitch > 100) return "Invalid timescale pitch";
                    filterOptions.timescale = { ...filterOptions.timescale, pitch };
                }
                if (args[2]) {
                    const rate = args[2].value as number;
                    if (rate < 0 || rate > 100) return "Invalid timescale rate";
                    filterOptions.timescale = { ...filterOptions.timescale, rate };
                }
                break;
            case "tremolo":
                if (args[0]) {
                    const frequency = args[0].value as number;
                    if (frequency < 0 || frequency > 100) return "Invalid tremolo frequency";
                    filterOptions.tremolo = { frequency };
                }
                if (args[1]) {
                    const depth = args[1].value as number;
                    if (depth < 0 || depth > 100) return "Invalid tremolo depth";
                    filterOptions.tremolo = { ...filterOptions.tremolo, depth };
                }
                break;
            case "vibrato":
                if (args[0]) {
                    const frequency = args[0].value as number;
                    if (frequency < 0 || frequency > 100) return "Invalid vibrato frequency";
                    filterOptions.vibrato = { frequency };
                }
                if (args[1]) {
                    const depth = args[1].value as number;
                    if (depth < 0 || depth > 100) return "Invalid vibrato depth";
                    filterOptions.vibrato = { ...filterOptions.vibrato, depth };
                }
                break;
            case "rotation":
                if (args[0]) {
                    const rotationHz = args[0].value as number;
                    if (rotationHz < 0 || rotationHz > 100) return "Invalid rotation frequency";
                    filterOptions.rotation = { rotationHz };
                }
                break;
            case "distortion":
                if (args[0]) {
                    const sinOffset = args[0].value as number;
                    if (sinOffset < 0 || sinOffset > 100) return "Invalid sin offset";
                    filterOptions.distortion = { sinOffset };
                }
                if (args[1]) {
                    const sinScale = args[1].value as number;
                    if (sinScale < 0 || sinScale > 100) return "Invalid sin scale";
                    filterOptions.distortion = { ...filterOptions.distortion, sinScale };
                }
                if (args[2]) {
                    const cosOffset = args[2].value as number;
                    if (cosOffset < 0 || cosOffset > 100) return "Invalid cos offset";
                    filterOptions.distortion = { ...filterOptions.distortion, cosOffset };
                }
                if (args[3]) {
                    const cosScale = args[3].value as number;
                    if (cosScale < 0 || cosScale > 100) return "Invalid cos scale";
                    filterOptions.distortion = { ...filterOptions.distortion, cosScale };
                }
                break;
        }
        player!.shoukaku.setFilters(filterOptions);
        const embed = new EmbedBuilder().setColor('Random').setTitle('Filter Changed');
        for (const [key, value] of Object.entries(filterOptions)) {
            let val = "";
            if (typeof value === "object") {
                val = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join("\n");
            } else {
                val = value.toString();
            }
            embed.addFields({ name: key, value: val });
        }
        return { embeds: [embed] }
    },

} as ICommand