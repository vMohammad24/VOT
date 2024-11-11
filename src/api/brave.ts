import type Elysia from 'elysia';
import { t } from 'elysia';
import TurndownService from 'turndown';
import { apiKeys } from '.';
import { chatllm, searchBrave } from '../util/brave';
const turndown = new TurndownService();
export default (server: Elysia<'brave'>) => {
	server.post(
		'/ask',
		async ({ body, headers, set }) => {
			const { query } = body;
			const { authorization } = headers;
			if (!apiKeys.includes(authorization)) {
				set.status = 401;
				return { error: 'Unauthorized' };
			}
			const search = await searchBrave(query);
			const llm = await chatllm(search.data.body.response.chatllm);
			return llm;
		},
		{
			body: t.Object({
				query: t.String(),
			}),
			headers: t.Object({
				authorization: t.String(),
			}),
		},
	);

	server.get(
		'/search',
		async ({ query: s, headers, set }) => {
			const { query } = s;
			const { authorization } = headers;
			if (!apiKeys.includes(authorization)) {
				set.status = 401;
				return { error: 'Unauthorized' };
			}
			const search = await searchBrave(query);
			const { results } = search.data.body.response.web;
			return results.map((result) => ({
				title: turndown.turndown(result.title),
				description: turndown.turndown(result.description),
				url: result.url,
			}));
		},
		{
			query: t.Object({
				query: t.String(),
			}),
			headers: t.Object({
				authorization: t.String(),
			}),
		},
	);
};
