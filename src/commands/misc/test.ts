import { EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export default {
	description: 'test command for devs',
	perms: 'dev',
	disabled: true,
	execute: async ({ member, interaction, handler, args, message }) => {
		const pag = await pagination({
			interaction: interaction || undefined, message: message || undefined, type: 'select', embeds: [{
				embed: new EmbedBuilder().setTitle('Page 1').setDescription('This is page 1'),
				name: 'test1',
				page: 0
			}, {
				embed: new EmbedBuilder().setTitle('Page 2').setDescription('This is page 2'),
				name: 'test2',
				page: 1
			}, {
				embed: new EmbedBuilder().setTitle('Page 3').setDescription('This is page 3'),
				name: 'test3',
				page: 2
			}, {
				embed: new EmbedBuilder().setTitle('Page 4').setDescription('This is page 4'),
				name: 'test4',
				page: 3
			}, {
				embed: new EmbedBuilder().setTitle('Page 5').setDescription('This is page 5'),
				name: 'test5',
				page: 4
			}, {
				embed: new EmbedBuilder().setTitle('Page 6').setDescription('This is page 6'),
				name: 'test6',
				page: 5
			}, {
				embed: new EmbedBuilder().setTitle('Page 7').setDescription('This is page 7'),
				name: 'test7',
				page: 6
			}, {
				embed: new EmbedBuilder().setTitle('Page 8').setDescription('This is page 8'),
				name: 'test8',
				page: 7
			}, {
				embed: new EmbedBuilder().setTitle('Page 9').setDescription('This is page 9'),
				name: 'test9',
				page: 8
			}, {
				embed: new EmbedBuilder().setTitle('Page 10').setDescription('This is page 10'),
				name: 'test10',
				page: 9
			}, {
				embed: new EmbedBuilder().setTitle('Page 11').setDescription('This is page 11'),
				name: 'test11',
				page: 10
			}, {
				embed: new EmbedBuilder().setTitle('Page 12').setDescription('This is page 12'),
				name: 'test12',
				page: 11
			}, {
				embed: new EmbedBuilder().setTitle('Page 13').setDescription('This is page 13'),
				name: 'test13',
				page: 12
			}, {
				embed: new EmbedBuilder().setTitle('Page 14').setDescription('This is page 14'),
				name: 'test14',
				page: 13
			}]
		})

	},
} as ICommand;
