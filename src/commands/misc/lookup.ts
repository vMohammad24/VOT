import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { filesize } from "filesize";
import numeral from "numeral";
import ICommand from "../../handler/interfaces/ICommand";
import { launchPuppeteer } from "../../util/puppeteer";
const browser = await launchPuppeteer();
const page = await browser.newPage();

interface User {
    avatar: string;
    banned: boolean;
    bio: string;
    contributor: boolean;
    created_at: string;
    id: string;
    invited_by: string | null;
    private_profile: boolean;
    rank: string;
    storage_used: number;
    uid: number;
    uploads: number;
    username: string;
}

function captitalizeString(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export default {
    description: 'Lookup a user in a service',
    // slashOnly: true,
    options: [
        {
            name: 'service',
            description: 'The service to lookup the user in',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'nest.rip',
                    value: 'nest.rip'
                }
            ]
        },
        {
            name: 'query',
            description: 'What to use to search for the user (username, id, etc.)',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    type: 'all',
    execute: async ({ args }) => {
        const service = args.get('service') as string;
        const query = args.get('query') as string;
        if (!service) return { ephemeral: true, content: `Please provide a service to lookup the user in.` };
        if (!query) return { ephemeral: true, content: `Please provide a query to search for the user.` };
        switch (service) {
            case 'nest.rip':
                await page.goto(`https://nest.rip/${query}`);
                const script = await page.$('#__NEXT_DATA__');
                const data = await page.evaluate((el: any) => JSON.parse(el.innerHTML), script);
                const user: User = data.props.pageProps.user;
                if (!user || !user.uid) {
                    return {
                        ephemeral: true,
                        content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                    }
                }
                if (user && user.private_profile) return {
                    ephemeral: true,
                    content: `This user has a private profile.`
                }
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: user.username, url: `https://nest.rip/${user.id}`, iconURL: user.avatar ? `https://cdn.nest.rip/avatars/${user.avatar}` : '' })
                            .setThumbnail(user.avatar ? `https://cdn.nest.rip/avatars/${user.avatar}` : '')
                            .addFields([
                                { name: 'ID', value: user.uid.toString(), inline: true },
                                { name: 'Rank', value: captitalizeString(user.rank), inline: true },
                                { name: 'Contributor', value: user.contributor ? 'Yes' : 'No', inline: true },
                                { name: 'Banned', value: user.banned ? 'Yes' : 'No', inline: true },
                                { name: 'Storage Used', value: filesize(user.storage_used), inline: true },
                                { name: 'Uploads', value: numeral(user.uploads).format('0,0'), inline: true },
                            ])
                            .setDescription(user.bio)
                            .setFooter({
                                text: `Invited by ${user.invited_by ?? 'No one'}`,
                            })
                            .setColor('Random')
                            .setTimestamp(new Date(user.created_at))
                    ]
                }
            default:
                return { ephemeral: true, content: `I'm sorry, but the service "${service}" is not yet supported.` };
        }
    }
} as ICommand