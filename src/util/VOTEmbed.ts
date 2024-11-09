import { EmbedBuilder, EmbedData } from 'discord.js';
import commandHandler from '..';
let votIcon: string | undefined = undefined;
class VOTEmbed extends EmbedBuilder {
    constructor(data?: EmbedData) {
        super(data);
        if (!votIcon) commandHandler.client.user?.displayAvatarURL({ size: 1024 });
    }

    toJSON() {
        const json = super.toJSON()
        if (!json.color && json.thumbnail) {
            json.color = 0x424549;
        }
        if (!json.footer) {
            json.footer = {
                text: 'VOT',
                icon_url: votIcon,
            }
        }
        return json;
    }
}

export default VOTEmbed;