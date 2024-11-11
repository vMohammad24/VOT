import { EdgeSpeechTTS } from '@lobehub/tts';
import { ApplicationCommandOptionType } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';

const tts = new EdgeSpeechTTS({ locale: 'en-US' });
export default {
	description: 'Text to speech',
	category: 'ai',
	options: [
		{
			name: 'text',
			description: 'The text you want to convert to speech',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: 'voice',
			description: 'The voice you want to use',
			type: ApplicationCommandOptionType.String,
			required: false,
			choices: tts.voiceOptions!.map((v) => ({ name: v.label, value: v.value })),
		},
	],
	type: 'all',
	// userTier: 'Premium',
	// slashOnly: true,
	execute: async ({ args, interaction, handler }) => {
		const text = args.get('text') as string | undefined;
		const voice = (args.get('voice') as string | undefined) || 'en-US-GuyNeural';
		if (!text) return { ephemeral: true, content: 'Please provide text to convert.' };
		await interaction?.deferReply();
		// const audio = await elevenlabs.generate({
		//     voice: 'Milo - Casual, Chill, Relatable Young Male',
		//     text,
		//     model_id: 'eleven_turbo_v2_5'
		// })
		const audio = await tts.create({
			input: text,
			options: {
				voice,
			},
		});
		if (!audio) return { ephemeral: true, content: 'Failed to generate audio' };
		const buffer = Buffer.from(await audio.arrayBuffer());
		return {
			files: [
				{
					attachment: buffer,
					name: 'tts.mp3',
				},
			],
		};
		// if (handler.prodMode) {
		//     return {
		//         files: [{
		//             attachment: buffer,
		//             name: 'tts.mp3',
		//         }],
		//     }
		// } else {
		// const array = new Uint8Array(69);
		// crypto.getRandomValues(array);
		// return {
		//     files: [{
		//         attachment: buffer,
		//         name: 'tts.mp3',
		//         waveform: Buffer.from(array).toString("base64"),
		//         duration_secs: 4140
		//     }],
		//     flags: new MessageFlagsBitField([MessageFlags.IsVoiceMessage]).toJSON()
		// }
	},
} as ICommand;
