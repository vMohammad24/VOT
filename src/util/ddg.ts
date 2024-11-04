import axios from "axios";

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



export async function askGPT(message: string) {
    return (await axios.post(
        `${API_URL}v1/chat/completions`,
        {
            model: "gpt-4o-mini",
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