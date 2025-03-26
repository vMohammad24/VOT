import axios from "axios";
import { Collection } from "discord.js";
import commandHandler from "..";


const axiosInstance = axios.create({
    baseURL: import.meta.env.NODE_ENV === 'production' ? 'http://g4f:8080/v1' : 'http://localhost:8080/v1/',
})

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    tool_calls?: any;
}

const sessions = new Collection<string, AIMessage[]>();
export const chat = async (query: string, sessionId?: string, model?: string) => {
    try {
        const session = sessionId ? (sessions.get(sessionId) || []) : [];
        const defaultModel = 'deepseek-r1';
        if (!model) model = defaultModel;
        session.push({ role: 'user', content: query });
        const res = await axiosInstance.post('/chat/completions', {
            messages: session,
            model: model,
            provider: model === defaultModel ? "Blackbox" : undefined,
            stream: false
        });

        if (!res.data?.choices?.[0]?.message) {
            throw new Error('Invalid response format from API');
        }

        const message = res.data.choices[0].message;
        session.push(message);
        if (sessionId) {
            sessions.set(sessionId, session);
        }
        return message.content;
    } catch (error) {
        commandHandler.logger.error('Error in chat function:', error);
        throw error;
    }
}

export const advancedChat = async (messages: AIMessage[], model: string, provider?: string) => {
    try {
        const res = await axiosInstance.post('/chat/completions', {
            messages: messages,
            model: model,
            provider: provider || undefined,
            stream: false
        });

        if (!res.data?.choices?.[0]?.message) {
            throw new Error('Invalid response format from API');
        }

        return res.data.choices[0].message.content;
    } catch (error) {
        commandHandler.logger.error('Error in advancedChat function:', error);
        throw error;
    }
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
    return res.data.data.map((a: any) => a.url);
}