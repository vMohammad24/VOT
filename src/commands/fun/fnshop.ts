import axios from 'axios';
import { EmbedBuilder } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export interface Root {
	status: number;
	data: Data;
}

export interface Data {
	hash: string;
	date: string;
	vbuckIcon: string;
	entries: Entry[];
}

export interface Entry {
	regularPrice: number;
	finalPrice: number;
	devName: string;
	offerId: string;
	inDate: string;
	outDate: string;
	giftable: boolean;
	refundable: boolean;
	sortPriority: number;
	layoutId: string;
	layout: Layout;
	colors?: Colors;
	tileSize: string;
	newDisplayAssetPath: string;
	newDisplayAsset?: NewDisplayAsset;
	brItems?: BrItem[];
	offerTag?: OfferTag;
	tracks?: Track[];
	bundle?: Bundle;
	banner?: Banner;
	displayAssetPath?: string;
	cars?: Car[];
	legoKits?: LegoKit[];
	instruments?: Instrument[];
}

export interface Layout {
	id: string;
	name: string;
	category: string;
	index: number;
	rank: number;
	showIneligibleOffers: string;
	useWidePreview: boolean;
	displayType: string;
	textureMetadata?: TextureMetadaum[];
	stringMetadata?: StringMetadaum[];
	textMetadata?: TextMetadaum[];
}

export interface TextureMetadaum {
	key: string;
	value: string;
}

export interface StringMetadaum {
	key: string;
	value: string;
}

export interface TextMetadaum {
	key: string;
	value: string;
}

export interface Colors {
	color1: string;
	color2?: string;
	color3: string;
	textBackgroundColor?: string;
}

export interface NewDisplayAsset {
	id: string;
	cosmeticId?: string;
	materialInstances: MaterialInstance[];
	renderImages: RenderImage[];
}

export interface MaterialInstance {
	id: string;
	primaryMode: string;
	productTag: string;
	images: Images;
	colors: Colors2;
	scalings: Scalings;
	flags?: Flags;
}

export interface Images {
	OfferImage?: string;
	Background: string;
	CarTexture?: string;
	CarUtil?: string;
	ItemStackTexture?: string;
}

export interface Colors2 {
	Background_Color_B?: string;
	FallOff_Color?: string;
	Background_Color_A?: string;
	MF_RadialCoordinates?: string;
	'Floor Radial Angle'?: string;
	'Floor Radial Offset'?: string;
	'Background Color 1'?: string;
	OffScreen_Color?: string;
	Color?: string;
	EmissiveTint?: string;
}

export interface Scalings {
	Gradient_Position_X?: number;
	Gradient_Position_Y?: number;
	Gradient_Size?: number;
	FallOffColor_DecayRate?: number;
	FallOffColor_Fill_Percent?: number;
	FallOffColor_Postion?: number;
	OffsetImage_X?: number;
	OffsetImage_Y?: number;
	OffsetImage_Y_Compensation?: number;
	Scale_Compensation?: number;
	ZoomImage_Percent?: number;
	RefractionDepthBias: number;
	'Density-Smoke'?: number;
	'Radius-Smoke'?: number;
	'Smoke-Intensity'?: number;
	'Smoke-Offset-X'?: number;
	'Smoke-Offset-Y'?: number;
	'Suit Scale'?: number;
	'Background-Balance'?: number;
	'Vignette Density'?: number;
	'Vignette Radius'?: number;
	'Vignette-Strength'?: number;
	'2nd-Beam Y-Offset'?: number;
	'Density-Cloud'?: number;
	'Radius-Cloud'?: number;
	'Time Factor'?: number;
	'Global UV Background'?: number;
	'Global UV Foreground'?: number;
	'Localized UV'?: number;
	'Enable-Disable'?: number;
	'Ember Intensity'?: number;
	'Ember-Scale'?: number;
	'Falloff-Edge'?: number;
	'Falloff-Subtract'?: number;
	'Smoke-Offset'?: number;
	'Smoke-Distortion-Intensity'?: number;
	Gradient_Hardness?: number;
	Spotlight_Hardness?: number;
	Spotlight_Intensity?: number;
	Spotlight_Position_X?: number;
	Spotlight_Position_Y?: number;
	Spotlight_Size?: number;
	'Global Intensity'?: number;
	GlyphIntensity?: number;
	'LocalizedUV-Add'?: number;
	RearGlyphIntensity?: number;
	bIsStatic?: number;
	'G-Local-UV-Influence'?: number;
	'G-Strength'?: number;
	'G-U-Tiles'?: number;
	'G-V-Tiles'?: number;
	'Global Tile'?: number;
	'R-Local-UV-Influence'?: number;
	'R-Strength'?: number;
	'R-V-Tiles'?: number;
	Background?: number;
	'Car Offset X'?: number;
	'Car Offset Y'?: number;
	'Car Scale'?: number;
	FlagAlpha?: number;
	FlagScale?: number;
	'Item Stack Offset X'?: number;
	'Item Stack Offset Y'?: number;
	'Item Stack Scale'?: number;
	'Floor Outer Brightness'?: number;
	'Global Offset X'?: number;
	'Global Offset Y'?: number;
	'Global Scale'?: number;
	'Floor Radial Scale X'?: number;
	'Floor Radial Scale Y'?: number;
	'Horizon Offset Y'?: number;
	'Horizon Rotation'?: number;
	'Floor Center Brightness'?: number;
	'Back Light Opacity'?: number;
	'Back Light Relative Offset X'?: number;
	'Back Light Relative Offset Y'?: number;
	'Back Light Scale X'?: number;
	'Back Light Scale Y'?: number;
	'Sky Min Opacity'?: number;
	'Blend Floor and Sky'?: number;
	'Horizon Sharpness'?: number;
	'Smoke Orientation'?: number;
	'Hue Shift'?: number;
	'Sky Contrast'?: number;
	'Smoke Left Intensity'?: number;
	'Smoke Right Intensity'?: number;
	'Density-Enhanced'?: number;
	'Effect-Bump-Multiply'?: number;
	'Effect-Time-Factor'?: number;
	'Radius-Enhanced'?: number;
	'Sine Offset'?: number;
	'Streak Angle'?: number;
	'Streak Power Angle'?: number;
	'Streak-G-Multiply-Max'?: number;
	'Streak-G-Multiply-Min'?: number;
	'Streak-G-Power-Max'?: number;
	'Streak-G-Power_Min'?: number;
	'Streak-G-U-Offset'?: number;
	'Streak-G-U-Tile'?: number;
	'Streak-G-V-Offset'?: number;
	'Streak-G-V-Tile'?: number;
	'Streak-R-Multiply-Max'?: number;
	'Streak-R-Multiply-Min'?: number;
	'Streak-R-Power-Max'?: number;
	'Streak-R-Power-Min'?: number;
	'Streak-R-U-Offset'?: number;
	'Streak-R-U-Tile'?: number;
	'Streak-R-V-Offset'?: number;
	'Streak-R-V-Tile'?: number;
	'Reflection Amount'?: number;
	Item_GradientMask_OFFSET_DEBUG?: number;
	Item_GradientMask_OnOff?: number;
	Item_GradientMask_STRENGTH_DEBUG?: number;
}

export interface Flags {
	IsCharacter?: boolean;
	IsSeriesCosmetic?: boolean;
	bIsCreatorCollabSeries?: boolean;
	blsFNMares_2022_Series?: boolean;
	IsAnimatedWrap?: boolean;
	bIsColumbusSeries?: boolean;
	UseCustomSpotlight_Hardness?: boolean;
	UseCustomSpotlightLocation?: boolean;
	UseCustomSpotlightRadius?: boolean;
	blsFNMares_2023_Series?: boolean;
	bIsMarvelSeries?: boolean;
	IsJustImage?: boolean;
	UseTextureBackground?: boolean;
	'Display Car'?: boolean;
	'Display Environment'?: boolean;
}

export interface RenderImage {
	productTag: string;
	fileName: string;
	image: string;
}

export interface BrItem {
	id: string;
	name: string;
	description: string;
	type: Type;
	rarity: Rarity;
	series?: Series;
	set: Set;
	introduction: Introduction;
	images: Images2;
	showcaseVideo?: string;
	added: string;
	variants?: Variant[];
	metaTags?: string[];
	dynamicPakId?: string;
	builtInEmoteIds?: string[];
	searchTags?: string[];
}

export interface Type {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Rarity {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Series {
	value: string;
	image?: string;
	colors: string[];
	backendValue: string;
}

export interface Set {
	value: string;
	text: string;
	backendValue: string;
}

export interface Introduction {
	chapter: string;
	season: string;
	text: string;
	backendValue: number;
}

export interface Images2 {
	smallIcon: string;
	icon: string;
	featured?: string;
	lego?: Lego;
	bean?: Bean;
	other?: Other;
}

export interface Lego {
	small: string;
	large: string;
}

export interface Bean {
	small: string;
	large: string;
}

export interface Other {
	background: string;
}

export interface Variant {
	channel: string;
	type: string;
	options: Option[];
}

export interface Option {
	tag: string;
	name: string;
	image: string;
}

export interface OfferTag {
	id: string;
	text: string;
}

export interface Track {
	id: string;
	devName: string;
	title: string;
	artist: string;
	releaseYear: number;
	bpm: number;
	duration: number;
	difficulty: Difficulty;
	albumArt: string;
	added: string;
	album?: string;
	genres?: string[];
}

export interface Difficulty {
	vocals: number;
	guitar: number;
	bass: number;
	plasticBass: number;
	drums: number;
	plasticDrums: number;
}

export interface Bundle {
	name: string;
	info: string;
	image: string;
}

export interface Banner {
	value: string;
	intensity: string;
	backendValue: string;
}

export interface Car {
	id: string;
	vehicleId: string;
	name: string;
	description: string;
	type: Type2;
	rarity: Rarity2;
	images: Images3;
	added: string;
	series?: Series2;
}

export interface Type2 {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Rarity2 {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Images3 {
	small: string;
	large: string;
}

export interface Series2 {
	value: string;
	colors: string[];
	backendValue: string;
}

export interface LegoKit {
	id: string;
	name: string;
	type: Type3;
	images: Images4;
	added: string;
}

export interface Type3 {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Images4 {
	small: string;
}

export interface Instrument {
	id: string;
	name: string;
	description: string;
	type: Type4;
	rarity: Rarity3;
	images: Images5;
	added: string;
	series?: Series3;
}

export interface Type4 {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Rarity3 {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface Images5 {
	small: string;
	large: string;
}

export interface Series3 {
	value: string;
	image: string;
	colors: string[];
	backendValue: string;
}

export default {
	description: 'Get the current Fortnite shop',
	type: 'all',
	aliases: ['fortnite', 'fortniteshop', 'fn'],
	disabled: true,
	execute: async ({ interaction, message }) => {
		const res = await axios.get<Root>('https://fortnite-api.com/v2/shop');
		const data = res.data.data;
		const entries = data.entries;
		await pagination({
			interaction,
			message,
			pages: entries
				.flatMap((entry) =>
					(entry.brItems || []).map((item) => ({
						page: new EmbedBuilder()
							.setTitle(`[${item.type.displayValue}] ${item.name}`)
							.setDescription(item.description)
							.setImage(item.images.icon)
							.addFields([
								{ name: 'Rarity', value: item.rarity.displayValue, inline: true },
								{ name: 'Price', value: `${entry.finalPrice} V-Bucks`, inline: true },
							])
							.setFooter({ text: 'Added' })
							.setTimestamp(new Date(item.added)),
						name: item.name,
					})),
				)
				.slice(20, 25),
			type: 'select',
		});
	},
} as ICommand;
