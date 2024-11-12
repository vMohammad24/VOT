import { EmbedBuilder, EmbedData } from 'discord.js';
import commandHandler from '..';
import { loadImg } from './database';
import { getTwoMostUsedColors } from './util';
let votIcon: string | undefined = undefined;
class VOTEmbed extends EmbedBuilder {
	constructor(data?: EmbedData) {
		super(data);
		if (!votIcon) commandHandler.client.user?.displayAvatarURL({ size: 1024 });
	}

	async dominant() {
		const json = this.toJSON();
		if (!json.color) {
			if (json.thumbnail) {

				const image = await loadImg(json.thumbnail.url);
				this.setColor(getTwoMostUsedColors(image)[0]);
			} else {
				this.setColor('#313338')
			}
		}
		return this;
	}

	addDescription(description: string) {
		return this.setDescription((this.toJSON().description || '') + description);
	}

	toJSON() {
		const json = super.toJSON();
		if (!json.footer) {
			json.footer = {
				text: 'VOT',
				icon_url: votIcon,
			};
		} else if (!json.author) {
			json.author = {
				name: 'VOT',
				icon_url: votIcon,
			};
		}
		return json;
	}
}

export default VOTEmbed;
