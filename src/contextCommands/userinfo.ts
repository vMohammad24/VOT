import { ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import commandHandler from '..';
import { IContextCommand } from '../handler/interfaces/IContextCommand';

export default {
	name: 'User info',
	description: 'Display info about a user.',
	type: ApplicationCommandType.User,
	context: 'all',
	execute: async (interaction: UserContextMenuCommandInteraction) => {
		commandHandler.executeCommand.bind(commandHandler)(
			commandHandler.commands?.find((c) => c.name == 'userinfo')!,
			interaction,
		);
	},
} as IContextCommand;
