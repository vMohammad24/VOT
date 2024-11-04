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



export async function askDDG(message: string, model: string = "gpt-4o-mini"): Promise<DDGAIRes | { error: string }> {
    const models = ["gpt-4o-mini", "claude-3-haiku-20240307", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"];
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