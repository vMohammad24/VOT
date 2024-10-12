import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import axios from 'axios';
import TurnDownService from 'turndown';

const turndownService = new TurnDownService();




export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	execute: async ({ user, interaction, handler, args, guild }) => {
		// return nigger
		const formData = new FormData();
		const fileUrl = 'https://cdn.nest.rip/uploads/b78f9638-5c97-40cf-a12a-28b71d9f1149';
		const content = (await axios.get(fileUrl, { responseType: 'arraybuffer' })).data;
		const file = new File([content], 'test.png');
		formData.set('encoded_image', file);
		formData.set('processed_image_dimensions', '1920x1080');
		const res = await axios.post('https://lens.google.com/search', formData, {
			params: {
				hl: 'en-JO',
				re: 'df',
				st: Date.now(),
				ep: 'gsbubu'
			}
		})
		console.log(res.data);
		return {
			content: 'test',
			ephemeral: true
		};
	},
} as ICommand;
