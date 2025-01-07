import { ApplicationCommandOptionType } from 'discord.js';
import Fuse from 'fuse.js';
import moment from 'moment-timezone';
import ICommand from '../../handler/interfaces/ICommand';

const fuse = new Fuse(moment.tz.names())
const fuzzySearch = (query: string) => fuse.search(query).map((result) => result.item);
export default {
    name: 'time',
    description: 'Show the current time for a specific timezone',
    type: 'all',
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'zone',
            description: 'Timezone (e.g. CST or America/Chicago)',
            required: true,
            autocomplete: true
        },
    ],
    autocomplete: async (inter) => {
        const zone = inter.options.getString('zone')?.toLowerCase();
        if (!zone) return inter.respond([{
            name: 'Please provide a timezone.',
            value: ''
        }]);
        const results = fuzzySearch(zone);
        if (results.length === 0) return inter.respond([{
            name: 'No results found.',
            value: ''
        }]);
        return inter.respond(results.slice(0, 25).map((result) => ({
            name: result,
            value: result
        })));
    },
    execute: async ({ args }) => {
        const zone = (args.get('zone') as string)?.trim();
        if (!zone) return { ephemeral: true, content: 'Please provide a timezone.' };

        let currentTime;
        try {
            currentTime = moment().tz(zone).format('HH:mm DD/MM ([UTC]Z)');
        } catch {
            return { ephemeral: true, content: 'Invalid timezone. Try "America/Chicago" or "CST".' };
        }

        const replyContent = `The current time in ${zone} is: **${currentTime}**`;
        return { ephemeral: false, content: replyContent };
    },
} as ICommand;