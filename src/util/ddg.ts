import axios from "axios";
import UserAgent from "user-agents";

export interface TranslationResponse {
	detected_language: string | null;
	translated: string;
}

export class DuckDuckGoTranslate {
	private vqd: string | undefined;
	private userAgent = new UserAgent();

	private async generateVQD() {
		const response = await axios.get(
			"https://duckduckgo.com/?q=translate&ia=web",
			{
				headers: {
					accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "max-age=0",
					"user-agent": this.userAgent.toString(),
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "same-origin",
				},
			},
		);

		const html = response.data;
		const vqdMatch = html.match(/vqd="([^"]+)"/);
		if (vqdMatch?.[1]) {
			this.vqd = vqdMatch[1];
		} else {
			throw new Error("Failed to extract VQD from DuckDuckGo response");
		}
	}

	public async translate(
		text: string,
		to = "en",
		from?: string,
	): Promise<string> {
		if (!this.vqd) {
			await this.generateVQD();
		}

		let url = `https://duckduckgo.com/translation.js?vqd=${this.vqd}&query=translate&to=${to}`;
		if (from) {
			url += `&from=${from}`;
		}

		const response = await axios({
			method: "post",
			url,
			headers: {
				"content-type": "text/plain",
				"user-agent": this.userAgent.toString(),
				origin: "https://duckduckgo.com",
				referer: "https://duckduckgo.com/",
				"x-requested-with": "XMLHttpRequest",
			},
			data: text,
		});

		const result = response.data as TranslationResponse;
		return result.translated;
	}
}

interface DuckDuckGoWeather {
	currentWeather: CurrentWeather;
	forecastDaily: ForecastDaily;
	forecastHourly: ForecastHourly;
	location: string;
	timezone: string;
	error?: string;
}

interface CurrentWeather {
	asOf: Date;
	cloudCover: number;
	cloudCoverHighAltPct: number;
	cloudCoverLowAltPct: number;
	cloudCoverMidAltPct: number;
	conditionCode: ConditionCode;
	daylight: boolean;
	humidity: number;
	metadata: Metadata;
	name: string;
	precipitationIntensity: number;
	pressure: number;
	pressureTrend: PressureTrend;
	temperature: number;
	temperatureApparent: number;
	temperatureDewPoint: number;
	uvIndex: number;
	visibility: number;
	windDirection: number;
	windGust: number;
	windSpeed: number;
}

enum ConditionCode {
	Clear = "Clear",
	Drizzle = "Drizzle",
	MostlyClear = "MostlyClear",
	MostlyCloudy = "MostlyCloudy",
	PartlyCloudy = "PartlyCloudy",
	Windy = "Windy",
}

interface Metadata {
	attributionURL: string;
	expireTime: Date;
	latitude: number;
	longitude: number;
	readTime: Date;
	reportedTime: Date;
	sourceType: string;
	units: string;
	version: number;
}

enum PressureTrend {
	Falling = "falling",
	Rising = "rising",
	Steady = "steady",
}

interface ForecastDaily {
	days: Day[];
	metadata: Metadata;
	name: string;
}

interface Day {
	conditionCode: ConditionCode;
	daytimeForecast: Forecast;
	forecastEnd: Date;
	forecastStart: Date;
	maxUvIndex: number;
	moonPhase: MoonPhase;
	moonrise: Date;
	moonset: Date;
	overnightForecast: Forecast;
	precipitationAmount: number;
	precipitationChance: number;
	precipitationType: PrecipitationType;
	restOfDayForecast?: Forecast;
	snowfallAmount: number;
	solarMidnight: Date;
	solarNoon: Date;
	sunrise: Date;
	sunriseAstronomical: Date;
	sunriseCivil: Date;
	sunriseNautical: Date;
	sunset: Date;
	sunsetAstronomical: Date;
	sunsetCivil: Date;
	sunsetNautical: Date;
	temperatureMax: number;
	temperatureMin: number;
	windGustSpeedMax: number;
	windSpeedAvg: number;
	windSpeedMax: number;
}

interface Forecast {
	cloudCover: number;
	conditionCode: ConditionCode;
	forecastEnd: Date;
	forecastStart: Date;
	humidity: number;
	precipitationAmount: number;
	precipitationChance: number;
	precipitationType: PrecipitationType;
	snowfallAmount: number;
	temperatureMax: number;
	temperatureMin: number;
	windDirection: number;
	windGustSpeedMax: number;
	windSpeed: number;
	windSpeedMax: number;
}

enum PrecipitationType {
	Clear = "clear",
	Rain = "rain",
}

enum MoonPhase {
	Full = "full",
	WaningGibbous = "waningGibbous",
	WaxingGibbous = "waxingGibbous",
}

interface ForecastHourly {
	hours: Hour[];
	metadata: Metadata;
	name: string;
}

interface Hour {
	cloudCover: number;
	conditionCode: ConditionCode;
	daylight: boolean;
	forecastStart: Date;
	humidity: number;
	precipitationAmount: number;
	precipitationChance: number;
	precipitationIntensity: number;
	precipitationType: PrecipitationType;
	pressure: number;
	pressureTrend: PressureTrend;
	snowfallAmount: number;
	snowfallIntensity: number;
	temperature: number;
	temperatureApparent: number;
	temperatureDewPoint: number;
	uvIndex: number;
	visibility: number;
	windDirection: number;
	windGust: number;
	windSpeed: number;
}

interface DuckDuckGoTime {
	version: number;
	info: string;
	locations: Location[];
	error?: string;
}

interface Location {
	id: string;
	geo: Geo;
	matches: Matches;
	score: number;
	time: TimeClass;
	timechanges: Timechange[];
	astronomy: Astronomy;
}

interface Astronomy {
	objects: Object[];
}

interface Object {
	name: Name;
	events: Event[];
}

interface Event {
	type: Type;
	hour: number;
	minute: number;
}

export enum Type {
	Rise = "rise",
	Set = "set",
}

export enum Name {
	Sun = "sun",
}

interface Geo {
	name: string;
	country: Country;
	latitude: number;
	longitude: number;
	zonename: string;
	state?: string;
}

interface Country {
	id: string;
	name: string;
}

export enum Matches {
	Location = "location",
}

interface TimeClass {
	iso: Date;
	datetime: Datetime;
	timezone: Timezone;
}

interface Datetime {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

interface Timezone {
	offset: string;
	zoneabb: string;
	zonename: string;
	zoneoffset: number;
	zonedst: number;
	zonetotaloffset: number;
}

interface Timechange {
	newdst: number;
	newzone: null;
	newoffset: number;
	utctime: Date;
	oldlocaltime: Date;
	newlocaltime: Date;
	verbose: Verbose;
}

interface Verbose {
	utctime: NewlocaltimeClass;
	oldlocaltime: NewlocaltimeClass;
	newlocaltime: NewlocaltimeClass;
}

interface NewlocaltimeClass {
	datetime: Datetime;
}

export const DDGWeather = async (location: string) => {
	const response = await axios.get(
		`https://duckduckgo.com/js/spice/forecast/${location}/en`,
		{
			headers: {
				"user-agent": new UserAgent().toString(),
			},
		},
	);
	const data = response.data as string;
	return JSON.parse(data.slice(19, -3)) as DuckDuckGoWeather;
};

export const DDGTime = async (location: string) => {
	const response = await axios.get(
		`https://duckduckgo.com/js/spice/time/${location}`,
		{
			headers: {
				"user-agent": new UserAgent().toString(),
			},
		},
	);
	const data = response.data as string;
	return JSON.parse(data.slice(15, -2)) as DuckDuckGoTime;
};
