import type Elysia from "elysia";
import { t } from "elysia";
import TurndownService from "turndown";
import { chatllm, searchBrave, searchBraveSuggest } from "../util/brave";
const turndown = new TurndownService();
export default (server: Elysia<"brave">) => {
	server.post(
		"/ask",
		async ({ body, headers, set }) => {
			const { query } = body;
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
			detail: {
				description: "Ask a question using Brave search",
			},
			response: t.Object({
				raw_response: t.String(),
				references: t.Array(t.Any()),
				urls: t.Array(t.String()),
				images: t.Array(
					t.Object({
						src: t.String(),
						text: t.String(),
						page_url: t.String(),
						query_text: t.String(),
						click_url: t.Union([t.String(), t.Null()]),
					}),
				),
				qa: t.Array(
					t.Object({
						answer: t.String(),
						score: t.Number(),
						href: t.Union([t.String(), t.Null()]),
					}),
				),
				entities: t.Array(t.Any()),
				main_entity: t.Union([t.String(), t.Null()]),
				main_entity_infobox: t.Union([t.Any(), t.Null()]),
				predicate: t.Union([t.Any(), t.Null()]),
				context: t.Array(t.Any()),
				context_urls: t.Array(t.String()),
				context_results: t.Array(
					t.Object({
						url: t.String(),
						title: t.String(),
						hostname: t.String(),
						favicon: t.String(),
					}),
				),
				followups: t.Optional(t.Array(t.String())),
			}),
		},
	);

	server.get(
		"/search",
		async ({ query: s, headers, set }) => {
			const { query } = s;
			const search = await searchBrave(query);
			const { results } = search.data.body.response.web;
			const res = results.map((result) => ({
				title: turndown.turndown(result.title),
				description: turndown.turndown(result.description),
				url: result.url,
			}));
			return {
				formatted: res,
				raw: results,
			};
		},
		{
			query: t.Object({
				query: t.String(),
			}),
			headers: t.Object({
				authorization: t.String(),
			}),
			detail: {
				description: "Search for a query using Brave search",
			},
			response: t.Object({
				formatted: t.Array(
					t.Object({
						title: t.String(),
						description: t.String(),
						url: t.String(),
					}),
				),
				raw: t.Any(),
			}),
		},
	);

	server.get(
		"/suggest",
		async ({ query: { query }, headers, set }) => {
			return await searchBraveSuggest(query);
		},
		{
			query: t.Object({
				query: t.String(),
			}),
			headers: t.Object({
				authorization: t.String(),
			}),
			detail: {
				description: "Get search suggestions from Brave",
			},
			response: t.Array(t.String()),
		},
	);
};
