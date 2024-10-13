import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import axios from 'axios';
import UserAgent from 'user-agents';
const hasher = new Bun.CryptoHasher('sha256');
function generateBraveServicesKey(apiKey: string): string {
	hasher.update(apiKey);
	return hasher.digest('hex');
}

const userAgent = new UserAgent();

const keys: string[] = ['qztbjzBqJueQZLFkwTTJrieu8Vw3789u']
export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	execute: async ({ user, interaction, handler, args, guild, channel, message }) => {
		let key = keys[0];
		for (let i = 0; i < 5; i++) {
			keys.push(generateBraveServicesKey(key));
		}
		const res = await axios.post('https://ai-chat.bsg.brave.com/v1/conversation', {
			"events": [
				{
					"content": "hi",
					"role": "user",
					"type": "chatMessage"
				}
			],
			"language": "en_US",
			"model": "mixtral-8x7b-instruct",
			"stream": false
		}, {
			responseType: 'json',
			headers: {
				'accept': 'text/event-stream',
				'authorization': `Signature keyId="linux-129-release",algorithm="hs2019",headers="digest",signature="${Math.random().toString(36).substring(2, 15)}"`,
				'digest': 'SHA-256=' + hasher.update('hi').digest('base64'),
				'x-brave-key': key,
				'content-type': 'application/json',
				'sec-fetch-site': 'none',
				'sec-fetch-mode': 'no-cors',
				'sec-fetch-dest': 'empty',
				'user-agent': userAgent.random().toString(),
				'accept-encoding': 'gzip, deflate, br, zstd',
				'accept-language': 'en-US,en;q=0.9',
				'priority': 'u=4, i',
				// X-Forwarded-For random
				'X-Forwarded-For': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
				'X-Forwarded-Host': 'ai-chat.bsg.brave.com',
				'X-Forwarded-Proto': 'https',
				'X-Forwarded-Port': '443',
				'X-Forwarded-Server': 'ai-chat.bsg.brave.com',
				'X-Forwarded-Uri': '/v1/conversation',
				'X-Forwarded-Method': 'POST',
			},
		})
		console.log(res.data)
		// let text = '';
		// await res.data.on('data', async (chunk: Buffer | string) => {
		// 	let data = chunk.toString();
		// 	if (typeof chunk == 'object') {
		// 		data = chunk.toString('utf-8');
		// 	}
		// 	// data: {"type":"completion","model":"mixtral-8x7b-instruct","log_id":"cmpl-36aPxEs7vqcMTQjcccbc6L","completion":" know.","stop_reason":"stop_sequence"}
		// 	text += data.replace(/"(.{1})"/g, '$1');
		// 	await pagination({
		// 		message,
		// 		interaction,
		// 		pages: text.match(/[\s\S]{1,1999}/g)!.map((text, i) => ({
		// 			page: {
		// 				content: text,
		// 			},
		// 		})),
		// 	})
		// })
		// return text + 'hi';
	},
} as ICommand;
