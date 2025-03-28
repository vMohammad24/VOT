import axios from "axios";
import * as cheerio from "cheerio";
export class GoogleLens {
	private url: string;
	private session: any;

	constructor() {
		this.url = "https://lens.google.com";
		this.session = axios.create({
			headers: {
				"User-agent":
					"Mozilla/5.0 (X11; Linux x86_64; rv:103.0) Gecko/20100101 Firefox/103.0",
			},
		});
	}

	private async getPrerenderScript(page: string): Promise<any> {
		const $ = cheerio.load(page);
		const scriptContent = $("script")
			.filter((_, script) => {
				const content = $(script).html();
				return (
					!!content &&
					content.includes("AF_initDataCallback(") &&
					/key: 'ds:(\d+)'/.exec(content)?.[1] === "0"
				);
			})
			.html();

		if (!scriptContent) throw new Error("Prerender script not found");

		const hash = /hash: '(\d+)'/.exec(scriptContent)?.[1];
		if (!hash) throw new Error("Hash not found in prerender script");

		const adjustedScript = scriptContent
			.replace("AF_initDataCallback(", "")
			.replace(");", "")
			.replace(
				`key: 'ds:0', hash: '${hash}', data:`,
				`"key": "ds:0", "hash": "${hash}", "data":`,
			)
			.replace("sideChannel:", '"sideChannel":');

		const jsonData = JSON.parse(adjustedScript);
		return jsonData["data"][1];
	}

	private parsePrerenderScript(prerenderScript: any): any {
		const data: { match: any; similar: any[] } = { match: null, similar: [] };

		try {
			data.match = {
				title: prerenderScript[0][1][8][12][0][0][0],
				thumbnail: prerenderScript[0][1][8][12][0][2][0][0],
				pageURL: prerenderScript[0][1][8][12][0][2][0][4],
			};
		} catch (e) {}

		let visualMatches;
		if (data.match) {
			visualMatches = prerenderScript[1][1][8][8][0][12];
		} else {
			try {
				visualMatches = prerenderScript[0][1][8][8][0][12];
			} catch (e) {
				return data;
			}
		}

		for (const match of visualMatches) {
			data.similar.push({
				title: match[3],
				thumbnail: match[0][0],
				pageURL: match[5],
				sourceWebsite: match[14],
			});
		}

		return data;
	}

	async searchByFile(buffer: File): Promise<any> {
		const formData = new FormData();
		formData.append("encoded_image", buffer, "image.jpg");
		formData.append("image_content", "");

		const response = await this.session.post(`${this.url}/upload`, formData, {
			// headers: formData.getHeaders(),
			maxRedirects: 0,
			// validateStatus: (status) => status >= 200 && status < 400
		});

		const searchUrl = response.headers["location"];
		const searchResponse = await this.session.get(searchUrl);
		const prerenderScript = await this.getPrerenderScript(searchResponse.data);

		return this.parsePrerenderScript(prerenderScript);
	}

	async searchByUrl(url: string): Promise<any> {
		const response = await this.session.get(`${this.url}/uploadbyurl`, {
			params: { url },
			maxRedirects: true,
		});
		const prerenderScript = await this.getPrerenderScript(response.data);
		return this.parsePrerenderScript(prerenderScript);
	}
}
