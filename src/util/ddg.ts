import axios from "axios";
import UserAgent from "user-agents";

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



const models = ["gpt-4o-mini", "claude-3-haiku-20240307", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"];
export async function askDDG(message: string, model: string = "gpt-4o-mini"): Promise<DDGAIRes | { error: string }> {
    if (!models.includes(model)) return {
        error: "Invalid model"
    }
    return (await axios.post(
        `${API_URL}v1/chat/completions`,
        {
            model,
            messages: [
                {
                    role: "user",
                    content: message
                }
            ]
        },
        {
            headers: {
                "Authorization": `Bearer NOWAYTHISFUCKINGWORKSLMAO`,
                "Content-Type": "application/json"
            }
        }
    )).data as DDGAIRes;
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
    private messages: { content: string; role: string; }[] = [];
    private userAgent = new UserAgent();
    constructor(model: "gpt-4o-mini" | "claude-3-haiku-20240307" | "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo" | "mistralai/Mixtral-8x7B-Instruct-v0.1") {
        this.model = model;
    }

    private async generateVQD() {
        const response = await axios.get('https://duckduckgo.com/duckchat/v1/status', {
            headers: {
                'sec-ch-ua-platform': '"Linux"',
                'cache-control': 'no-store',
                'user-agent': this.userAgent.toString(),
                'sec-ch-ua': '"Chromium";v="130", "Brave";v="130", "Not?A_Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'x-vqd-accept': '1',
                'accept': '*/*',
                'sec-gpc': '1',
                'accept-language': 'en-US,en;q=0.9',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://duckduckgo.com/',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'cookie': 'dcm=6',
                'priority': 'u=1, i'
            }
        });
        this.vqd = response.headers['x-vqd-4'];
    }

    public async chat(query: string) {
        if (!this.vqd) {
            await this.generateVQD();
        }
        this.messages.push({
            role: 'user',
            content: query
        })
        const res = await axios.post('https://duckduckgo.com/duckchat/v1/chat', {
            messages: this.messages,
            model: this.model
        }, {
            headers: {
                'sec-ch-ua-platform': '"Linux"',
                'cache-control': 'no-store',
                'user-agent': this.userAgent.toString(),
                'sec-ch-ua': '"Chromium";v="130", "Brave";v="130", "Not?A_Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'x-vqd-accept': '1',
                'accept': '*/*',
                'sec-gpc': '1',
                'accept-language': 'en-US,en;q=0.9',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://duckduckgo.com/',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'cookie': `dcm=6;`,
                'priority': 'u=1, i',
                'x-vqd-4': this.vqd
            },
            responseType: 'stream'
        });
        res.headers['x-vqd-4'] && (this.vqd = res.headers['x-vqd-4']);
        const responses: ResMessage[] = [];
        let response = '';
        await new Promise<void>((resolve, reject) => {
            res.data.on('data', (data: Buffer) => {
                try {
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.substring(6);
                            if (jsonStr !== '[DONE]') {
                                const parsed = JSON.parse(jsonStr);
                                responses.push(parsed);
                            }
                        }
                    });
                } catch (e) {

                }
            });
            res.data.on('end', () => {
                response = responses.map(response => {
                    console.log(response)
                    return response.message || '';
                }).join('')
                resolve();
                this.messages.push({
                    role: 'assistant',
                    content: response
                })
            });
            res.data.on('error', (err: Error) => {
                reject(err);
            });
        });
        return response;
    }
}
