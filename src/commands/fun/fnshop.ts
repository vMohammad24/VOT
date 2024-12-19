import axios from 'axios';
import ICommand from '../../handler/interfaces/ICommand';
import VOTEmbed from '../../util/VOTEmbed';
import { pagination } from '../../util/pagination';

export interface Layout {
	id: string;
	name: string;
	category: string;
	index: number;
	rank: number;
	showIneligibleOffers: string;
	useWidePreview: boolean;
	displayType: string;
}

export interface Colors {
	color1: string;
	color2: string;
	color3: string;
	textBackgroundColor: string;
}

export interface Images {
	smallIcon: string;
	icon: string;
	featured: string;
	OfferImage: string;
}

export interface Scalings {
	Spotlight_Hardness: number;
	Spotlight_Intensity: number;
	Spotlight_Position_X: number;
	Spotlight_Position_Y: number;
	FallOffColor_Fill_Percent: number;
	FallOffColor_Postion: number;
	OffsetImage_X: number;
	OffsetImage_Y: number;
	ZoomImage_Percent: number;
	RefractionDepthBias: number;
	Gradient_Hardness: number;
	Gradient_Position_X: number;
	Gradient_Position_Y: number;
	Gradient_Size: number;
	Spotlight_Size: number;
}

export interface Flags {
	UseCustomSpotlightLocation: boolean;
	UseCustomSpotlightRadius: boolean;
	IsCharacter: boolean;
	UseCustomSpotlight_Hardness: boolean;
}

export interface MaterialInstances {
	id: string;
	primaryMode: string;
	productTag: string;
	images: Images;
	colors: Colors;
	scalings: Scalings;
	flags: Flags;
}

export interface RenderImages {
	productTag: string;
	fileName: string;
	image: string;
}

export interface NewDisplayAsset {
	id: string;
	cosmeticId: string;
	materialInstances: MaterialInstances[];
	renderImages: RenderImages[];
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

export interface Introduction {
	chapter: string;
	season: string;
	text: string;
	backendValue: number;
}

export interface BrItems {
	id: string;
	name: string;
	description: string;
	type: Type;
	rarity: Rarity;
	introduction: Introduction;
	images: Images;
	showcaseVideo: string;
	added: string;
}

export interface Entries {
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
	colors: Colors;
	tileSize: string;
	displayAssetPath: string;
	newDisplayAssetPath: string;
	newDisplayAsset: NewDisplayAsset;
	brItems: BrItems[];
}

export interface Data {
	hash: string;
	date: string;
	vbuckIcon: string;
	entries: Entries[];
}

export interface FortniteShopResponse {
	status: number;
	data: Data;
}


export default {
	description: 'Get the current Fortnite shop',
	type: 'all',
	aliases: ['fortnite', 'fortniteshop', 'fn'],
	execute: async ({ interaction, message }) => {
		const res = await axios.get<FortniteShopResponse>('https://fortnite-api.com/v2/shop')
		const pages = res.data.data.entries
			.sort((a, b) => a.sortPriority - b.sortPriority)
			.filter(e => e.brItems?.length > 0)
			.map((entry, index) => {
				const item = entry.brItems[0];
				const embed = new VOTEmbed()
					.setTitle(item.name)
					.setDescription(
						`${item.description} \n` +
						`├ Type: ${item.rarity.displayValue} ${item.type.displayValue}\n` +
						`├ Price: ${entry.finalPrice} V-Bucks`
					)
					.setImage(item.images.featured);

				return {
					page: {
						embeds: [embed],
						files: item.showcaseVideo ? [item.showcaseVideo] : []
					},
					name: item.name,
					pageNumber: index,
					description: `${item.description} • ${entry.finalPrice} V-Bucks`
				};
			});

		pagination({
			pages,
			type: 'multipleSelect',
			interaction,
			message,
			name: 'Fortnite Item Shop'
		});
	}
} as ICommand;
