import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { getHead, getProfile, renderSkin3D, searchNames } from "../../util/minecraft";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    description: 'View the Minecraft profile of a user',
    options: [
        {
            name: 'player',
            description: 'The username or uuid of the player',
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        }
    ],
    type: 'all',
    autocomplete: async (inter) => {
        if (inter.responded) return;
        const input = inter.options.getString('player');
        if (inter.responded) return;
        if (!input) return inter.respond([{ value: '', name: 'Please provide a valid username or uuid' }]);
        if (inter.responded) return;
        const results = await searchNames(input);
        if (inter.responded) return;
        inter.respond(results.map(r => ({ name: r.name, value: r.uuid })));
    },
    execute: async ({ args }) => {
        const player = args.get('player') as string;
        if (!player) return {
            content: 'Please provide a valid username or uuid',
            ephemeral: true
        }
        const profile = await getProfile(player);
        if (!profile) return {
            content: 'Profile not found',
            embeds: [{
                title: 'Error',
                description: 'The profile for this user was not found'
            }]
        };
        if ((profile as any).error) return {
            content: 'An error occurred',
            embeds: [{
                title: 'Error',
                description: (profile as any).error
            }]
        }
        if (!profile.name) return {
            content: 'Profile not found',
            embeds: [{
                title: 'Error',
                description: 'The profile for this user was not found'
            }]
        }
        console.log('a')
        const activeSkin = profile.textures.SKIN?.find(s => s.active)?.image_hash;
        const skin = activeSkin ? await renderSkin3D(activeSkin) : null;
        const head = await getHead(profile.uuid);
        const embed = new VOTEmbed()
            .setAuthor({ name: profile.name, iconURL: head ? 'attachment://head.png' : undefined })
            .setFooter({ text: `UUID: ${profile.uuid}` })
            .setImage(skin ? 'attachment://skin.png' : null)
            .setColor('Random')
            .setTimestamp();
        if (profile.name_history) {
            const mapped = profile.name_history.map(u => `**${u.name}**: (${u.changed_at ? `<t:${Math.round(new Date(u.changed_at).getTime() / 1000)}:R>` : 'Original'})`).reverse();
            embed.setDescription(`## **Name History**:\n${mapped.join('\n')}`);
        }
        return {
            embeds: [
                embed
            ],
            files: [
                skin ? { attachment: skin, name: 'skin.png' } : undefined,
                head ? { attachment: head, name: 'head.png' } : undefined
            ].filter(Boolean)
        }
    }
} as ICommand