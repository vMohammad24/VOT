import axios from 'axios';
import UserAgent from 'user-agents';

const API_URL = `https://duckduckgo-ai.vmohammad.workers.dev/`;
export interface Message {
	role: string;
	content: string;
}

export interface Choices {
	index: number;
	message: Message;
	logprobs: string;
	finish_reason: string;
}

export interface Usage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

export interface DDGAIRes {
	id: string;
	object: string;
	created: number;
	model: string;
	system_fingerprint: string;
	choices: Choices[];
	usage: Usage;
}

export const ddgModels = {
	'gpt-4o-mini': 'GPT-4o Mini',
	'o3-mini': 'GPT-o3 Mini',
	'claude-3-haiku-20240307': 'Claude3 Haiku',
	'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'Llama 3.170B',
	'mistralai/Mistral-Small-24B-Instruct-2501': 'Mixtral',
};

export async function askDDG(
	message: string,
	model: keyof typeof ddgModels = 'gpt-4o-mini',
): Promise<DDGAIRes | { error: string }> {
	if (!ddgModels[model]) {
		return { error: 'Invalid model' };
	}
	return (
		await axios.post(
			`${API_URL}v1/chat/completions`,
			{
				model,
				messages: [
					{
						role: 'user',
						content: message,
					},
				],
			},
			{
				headers: {
					Authorization: `Bearer NOWAYTHISFUCKINGWORKSLMAO`,
					'Content-Type': 'application/json',
				},
			},
		)
	).data as DDGAIRes;
}

interface ResMessage {
	created: number;
	id: string;
	action: string;
	model: string;
	message?: string;
}

export class DuckDuckGoChat {
	private model: string;
	private vqd: string | undefined;
	private messages: { content: string; role: string }[] = [];
	private userAgent = new UserAgent();
	constructor(model: string) {
		if (!Object.keys(ddgModels).includes(model)) {
			throw new Error('Invalid model');
		}
		this.model = model;
	}

	public getModel() {
		return this.model;
	}

	public setModel(model: string) {
		if (!Object.keys(ddgModels).includes(model)) {
			throw new Error('Invalid model');
		}
		this.model = model;
	}

	private async generateVQD() {
		const response = await axios.get('https://duckduckgo.com/duckchat/v1/status', {
			headers: {
				'cache-control': 'no-store',
				'user-agent': this.userAgent.toString(),
				'x-vqd-accept': '1',
				'sec-fetch-site': 'same-origin',
				referer: 'https://duckduckgo.com/',
			},
		});
		this.vqd = response.headers['x-vqd-4'];
	}

	public async chat(query: string): Promise<string> {
		if (!this.vqd) {
			await this.generateVQD();
		}
		this.messages.push({
			role: 'user',
			content: query,
		});
		const res = await axios.post(
			'https://duckduckgo.com/duckchat/v1/chat',
			{
				messages: this.messages,
				model: this.model,
			},
			{
				headers: {
					'cache-control': 'no-store',
					'user-agent': this.userAgent.toString(),
					'x-vqd-accept': '1',
					referer: 'https://duckduckgo.com/',
					'x-vqd-4': this.vqd,
				},
				responseType: 'stream',
			},
		);
		res.headers['x-vqd-4'] && (this.vqd = res.headers['x-vqd-4']);
		const responses: ResMessage[] = [];
		let response = '';
		await new Promise<void>((resolve, reject) => {
			res.data.on('data', (data: Buffer) => {
				try {
					const lines = data.toString().split('\n');
					lines.forEach((line) => {
						if (line.startsWith('data: ')) {
							const jsonStr = line.substring(6);
							if (jsonStr !== '[DONE]') {
								const parsed = JSON.parse(jsonStr);
								responses.push(parsed);
							}
						}
					});
				} catch (e) { }
			});
			res.data.on('end', () => {
				response = responses
					.map((response) => {
						return response.message || '';
					})
					.join('');
				resolve();
				this.messages.push({
					role: 'assistant',
					content: response,
				});
			});
			res.data.on('error', (err: Error) => {
				reject(err);
			});
		});

		if (!response || response.length < 1) {
			return await this.chat(query);
		}
		return response;
	}

	public export() {
		return {
			model: this.model,
			messages: this.messages,
		};
	}

	public import(data: { model: string; messages: { content: string; role: string }[] }) {
		this.model = data.model;
		this.messages = data.messages;
	}
}

export interface TranslationResponse {
	detected_language: string | null;
	translated: string;
}

export class DuckDuckGoTranslate {
	private vqd: string | undefined;
	private userAgent = new UserAgent();

	private async generateVQD() {
		const response = await axios.get('https://duckduckgo.com/?q=translate&ia=web', {
			headers: {
				'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'accept-language': 'en-US,en;q=0.9',
				'cache-control': 'max-age=0',
				'user-agent': this.userAgent.toString(),
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'same-origin'
			}
		});

		const html = response.data;
		const vqdMatch = html.match(/vqd="([^"]+)"/);
		if (vqdMatch && vqdMatch[1]) {
			this.vqd = vqdMatch[1];
		} else {
			throw new Error('Failed to extract VQD from DuckDuckGo response');
		}
	}

	public async translate(text: string, to: string = 'en', from?: string): Promise<string> {
		if (!this.vqd) {
			await this.generateVQD();
		}

		let url = `https://duckduckgo.com/translation.js?vqd=${this.vqd}&query=translate&to=${to}`;
		if (from) {
			url += `&from=${from}`;
		}

		const response = await axios({
			method: 'post',
			url,
			headers: {
				'content-type': 'text/plain',
				'user-agent': this.userAgent.toString(),
				'origin': 'https://duckduckgo.com',
				'referer': 'https://duckduckgo.com/',
				'x-requested-with': 'XMLHttpRequest',
			},
			data: text,
		});


		const result = response.data as TranslationResponse;
		return result.translated;
	}
}
