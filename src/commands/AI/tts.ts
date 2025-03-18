import axios from 'axios';
import { ApplicationCommandOptionType } from 'discord.js';
import Fuse from 'fuse.js';
import ICommand from '../../handler/interfaces/ICommand';


const fuzzySearch = (query: string, list: { name: string, value: string }[]) => {
	const options = {
		keys: ['name'],
		threshold: 0.3,
	};
	const fuse = new Fuse(list, options);
	return fuse.search(query).slice(0, 25).map(result => result.item);
};


const voices = [
	{ name: 'Female (US)', value: 'en_us_001' },
	{ name: 'Male 1 (US)', value: 'en_us_006' },
	{ name: 'Male 2 (US)', value: 'en_us_007' },
	{ name: 'Male 3 (US)', value: 'en_us_009' },
	{ name: 'Male 4 (US)', value: 'en_us_010' },
	{ name: 'Male 1 (UK)', value: 'en_uk_001' },
	{ name: 'Male 2 (UK)', value: 'en_uk_003' },
	{ name: 'Female (AU)', value: 'en_au_001' },
	{ name: 'Male (AU)', value: 'en_au_002' },
	{ name: 'Male 1 (FR)', value: 'fr_001' },
	{ name: 'Male 2 (FR)', value: 'fr_002' },
	{ name: 'Female (DE)', value: 'de_001' },
	{ name: 'Male (DE)', value: 'de_002' },
	{ name: 'Male (ES)', value: 'es_002' },
	{ name: 'Male (MX)', value: 'es_mx_002' },
	{ name: 'Female 2 (BR)', value: 'br_003' },
	{ name: 'Female 3 (BR)', value: 'br_004' },
	{ name: 'Male (BR)', value: 'br_005' },
	{ name: 'Female (ID)', value: 'id_001' },
	{ name: 'Female 1 (JP)', value: 'jp_001' },
	{ name: 'Female 2 (JP)', value: 'jp_003' },
	{ name: 'Female 3 (JP)', value: 'jp_005' },
	{ name: 'Male (JP)', value: 'jp_006' },
	{ name: 'Male 1 (KR)', value: 'kr_002' },
	{ name: 'Male 2 (KR)', value: 'kr_004' },
	{ name: 'Female (KR)', value: 'kr_003' },
	{ name: 'Ghostface (Scream) (Characters)', value: 'en_us_ghostface' },
	{ name: 'Chewbacca (Star Wars) (Characters)', value: 'en_us_chewbacca' },
	{ name: 'C3PO (Star Wars) (Characters)', value: 'en_us_c3po' },
	{ name: 'Stitch (Lilo & Stitch) (Characters)', value: 'en_us_stitch' },
	{ name: 'Stormtrooper (Star Wars) (Characters)', value: 'en_us_stormtrooper' },
	{ name: 'Rocket (Guardians of the Galaxy) (Characters)', value: 'en_us_rocket' },
	{ name: 'Alto (Singing)', value: 'en_female_f08_salut_damour' },
	{ name: 'Tenor (Singing)', value: 'en_male_m03_lobby' },
	{ name: 'Sunshine Soon (Singing)', value: 'en_male_m03_sunshine_soon' },
	{ name: 'Warmy Breeze (Singing)', value: 'en_female_f08_warmy_breeze' },
	{ name: 'Glorious (Singing)', value: 'en_female_ht_f08_glorious' },
	{ name: 'It Goes Up (Singing)', value: 'en_male_sing_funny_it_goes_up' },
	{ name: 'Chipmunk (Singing)', value: 'en_male_m2_xhxs_m03_silly' },
	{ name: 'Dramatic (Singing)', value: 'en_female_ht_f08_wonderful_world' }
];
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
			autocomplete: true
		},
	],
	type: 'all',
	autocomplete: async (inter) => {
		const input = inter.options.getString('voice');
		if (inter.responded) return;
		if (!input) return inter.respond(voices.map(v => ({ name: v.name, value: v.value })).slice(0, 25));
		inter.respond(fuzzySearch(input, voices).map(v => ({ name: v.name, value: v.value })))
	},
	// userTier: 'Premium',
	// slashOnly: true,
	execute: async ({ args, interaction, handler }) => {
		const text = args.get('text') as string | undefined;
		const voice = (args.get('voice') as string | undefined) || 'en_us_001';
		if (!text) return { ephemeral: true, content: 'Please provide text to convert.' };


		const matchedVoices = fuzzySearch(voice, voices);
		const selectedVoice = matchedVoices.length > 0 ? matchedVoices[0].value : 'en_us_001';
		const { data } = await axios.post('https://tiktok-tts.weilnet.workers.dev/api/generation', {
			text,
			voice: selectedVoice,
		});
		if (!data.success) {
			return { ephemeral: true, content: data.error || 'An error occurred while generating the audio.' };
		}
		const audio = Buffer.from(data.data, 'base64');
		// return {
		// 	files: [
		// 		{
		// 			attachment: audio,
		// 			name: 'tts.mp3',
		// 		},
		// 	],
		// };
		return {
			files: [{
				attachment: audio,
				name: 'VOT_TTS.mp3',
				// waveform: Buffer.from([1, 2, 3, 4, 5]).toString("base64"),
				// duration_secs: 4140
			}],
			// flags: new MessageFlagsBitField([MessageFlags.IsVoiceMessage]).toJSON()
		}
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
