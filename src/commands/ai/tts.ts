import { ApplicationCommandOptionType, MessageFlags, MessageFlagsBitField } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import elevenlabs from "../../util/elvenlabs";

export default {
    description: 'Text to speech',
    category: 'ai',
    options: [{
        name: 'text',
        description: 'The text you want to convert to speech',
        type: ApplicationCommandOptionType.String,
        required: true
    },
    ],
    type: 'all',
    execute: async ({ args, interaction }) => {
        const text = args.get('text') as string | undefined;
        if (!text) return { ephemeral: true, content: 'Please provide text to convert.' };
        await interaction?.deferReply();
        const audio = await elevenlabs.generate({
            voice: 'Brian',
            text,
            model_id: 'eleven_turbo_v2_5'
        })
        const array = new Uint8Array(69);
        crypto.getRandomValues(array);
        return {
            files: [{
                attachment: audio,
                name: 'tts.mp3',
                waveform: Buffer.from(array).toString("base64"),
                duration_secs: 4140
            }],
            flags: new MessageFlagsBitField([MessageFlags.IsVoiceMessage]).toJSON()
        }

    }
} as ICommand