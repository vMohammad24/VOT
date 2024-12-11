import { ColorResolvable, EmbedBuilder, EmbedData, User } from 'discord.js';
import commandHandler from '..';
import { loadImg } from './database';
import { getTwoMostUsedColors, isNullish } from './util';
let votIcon: string | undefined = undefined;
class VOTEmbed extends EmbedBuilder {
	constructor(data?: EmbedData) {
		super(data);
		if (!votIcon) votIcon = commandHandler.client.user?.displayAvatarURL({ size: 1024 });
	}

	async dominant() {
		const json = this.toJSON();
		const img = json.thumbnail?.url || json.image?.url || json.author?.icon_url || json.footer?.icon_url;
		let color: ColorResolvable = '#313338';
		if (img) {
			const image = await loadImg(img);
			color = getTwoMostUsedColors(image)[0];
		}
		return super.setColor(color);
	}

	public setColor(color: ColorResolvable | null): this {
		if (color == 'Random') {
			const r = Math.floor(Math.random() * 256);
			const g = Math.floor(Math.random() * 256);
			const b = Math.floor(Math.random() * 256);
			color = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
		}
		return super.setColor(color);
	}

	addDescription(description: string) {
		return this.setDescription((this.toJSON().description || '') + description);
	}

	setDescription(description: string | null | undefined): this {
		if (!description || isNullish(description)) return this;
		return super.setDescription(description);
	}

	setTitle(title: string | null | undefined): this {
		if (!title || isNullish(title)) return this;
		return super.setTitle(title);
	}


	author(user: User) {
		return this.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
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
