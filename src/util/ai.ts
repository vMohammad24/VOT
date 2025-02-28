import axios from "axios";
import { Collection } from "discord.js";


const axiosInstance = axios.create({
    baseURL: import.meta.env.NODE_ENV === 'production' ? 'http://g4f:8080/v1' : 'http://localhost:8080/v1/',
})

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const sessions = new Collection<string, Message[]>();
export const chat = async (query: string, sessionId?: string, model?: string) => {
    const session = sessionId ? sessions.get(sessionId) : [];
    const defaultModel = 'deepseek-r1';
    if (!model) model = defaultModel;
    const res = await axiosInstance.post('/chat/completions', {
        messages: [
            ...(session || []),
            {
                role: 'user',
                content: query,
            },
        ],
        model: model,
        provider: model === defaultModel ? "Blackbox" : undefined,
        stream: false
    })
    const message = res.data.choices[0].message;
    if (sessionId) {
        sessions.set(sessionId, [...session!, message]);
    }
    return message.content;
}

export const generateImage = async (query: string, model?: string): Promise<string[]> => {
    const defaultModel = 'flux-schnell';
    if (!model) model = defaultModel;
    const res = await axiosInstance.post('/images/generate', {
        prompt: query,
        model: model,
        provider: model === defaultModel ? "BlackForestLabsFlux1Schnell" : null,
        response_format: "url"
    })
    console.log(res.data)
    return res.data.data.map((a: any) => a.url);
}