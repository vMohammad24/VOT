interface IUser {
	pk: string;
	username: string;
	profile_pic_url: string;
	id: string;
	is_verified: boolean;
	is_unpublished: boolean;
	is_private: boolean;
	friendship_status: any;
}

interface IOriginalSoundInfo {
	audio_asset_id: string;
	ig_artist: IUser;
	consumption_info: {
		should_mute_audio_reason_type: any;
		is_trending_in_clips: boolean;
	};
	original_audio_title: string;
	is_explicit: boolean;
}

interface IClipsMetadata {
	music_info: any;
	original_sound_info: IOriginalSoundInfo;
}

interface ICandidate {
	height: number;
	url: string;
	width: number;
}

interface IImageVersions2 {
	candidates: ICandidate[];
}

interface ICaption {
	text: string;
	pk: string;
	has_translation: any;
}

interface IVideoVersion {
	type: number;
	url: string;
}
interface Media {
	code: string;
	pk: string;
	actor_fbid: string | null;
	has_liked: boolean;
	comments_disabled: boolean | null;
	like_count: number;
	user: User;
	product_type: string;
	view_count: number | null;
	like_and_view_counts_disabled: boolean;
	owner: Owner;
	id: string;
	organic_tracking_token: string;
	inventory_source: string;
	logging_info_token: string;
	clips_metadata: ClipsMetadata;
	comment_count: number;
	taken_at: number;
	caption: Caption;
	media_type: number;
	commenting_disabled_for_viewer: boolean | null;
	can_reshare: boolean | null;
	can_viewer_reshare: boolean;
	audience: string | null;
	ig_media_sharing_disabled: boolean;
	carousel_media: any[] | null;
	image_versions2: ImageVersions2;
	media_overlay_info: any | null;
	share_urls: any | null;
	saved_collection_ids: string[] | null;
	has_viewer_saved: boolean | null;
	original_height: number;
	original_width: number;
	is_dash_eligible: number;
	number_of_qualities: number;
	video_dash_manifest: string;
	video_versions: VideoVersion[];
	has_audio: boolean;
	creative_config: any | null;
	usertags: any | null;
	location: any | null;
	clips_attribution_info: any | null;
	invited_coauthor_producers: any[];
	carousel_media_count: number | null;
	preview: any | null;
	__typename: string;
}

interface User {
	pk: string;
	username: string;
	profile_pic_url: string;
	id: string;
	is_verified: boolean;
	is_unpublished: boolean;
	is_private: boolean;
	friendship_status: any | null;
}

interface Owner {
	pk: string;
	username: string;
	id: string;
}

interface ClipsMetadata {
	music_info: any | null;
	original_sound_info: OriginalSoundInfo;
}

interface OriginalSoundInfo {
	audio_asset_id: string;
	ig_artist: IGArtist;
	consumption_info: ConsumptionInfo;
	original_audio_title: string;
	is_explicit: boolean;
}

interface IGArtist {
	profile_pic_url: string;
	id: string;
	username: string;
}

interface ConsumptionInfo {
	should_mute_audio_reason_type: any | null;
	is_trending_in_clips: boolean;
}

interface Caption {
	text: string;
	pk: string;
	has_translation: boolean | null;
}

interface ImageVersions2 {
	candidates: Candidate[];
}

interface Candidate {
	height: number;
	url: string;
	width: number;
}

interface VideoVersion {
	type: number;
	url: string;
}

interface IHeaders {
	Accept: string;
	"Accept-Language": string;
	"Cache-Control": string;
	Dnt: string;
	Dpr: string;
	Pragma: string;
	Priority: string;
	"Sec-Ch-Prefers-Color-Scheme": string;
	"Sec-Ch-Ua": string;
	"Sec-Ch-Ua-Full-Version-List": string;
	"Sec-Ch-Ua-Mobile": string;
	"Sec-Ch-Ua-Model": string;
	"Sec-Ch-Ua-Platform": string;
	"Sec-Ch-Ua-Platform-Version": string;
	"Sec-Fetch-Dest": string;
	"Sec-Fetch-Mode": string;
	"Sec-Fetch-Site": string;
	"Sec-Fetch-User": string;
	"Upgrade-Insecure-Requests": string;
	"User-Agent": string;
	"Viewport-Width": string;
	cookie: string;
}

interface IRaw {
	bytes: string;
}

export interface InstagramJsonResponse {
	code: string;
	pk: string;
	actor_fbid: any;
	has_liked: boolean;
	comments_disabled: any;
	like_count: number;
	user: IUser;
	product_type: string;
	view_count: any;
	like_and_view_counts_disabled: boolean;
	owner: IUser;
	id: string;
	organic_tracking_token: string;
	clips_metadata: IClipsMetadata;
	comment_count: number;
	taken_at: number;
	caption: ICaption;
	media_type: number;
	commenting_disabled_for_viewer: any;
	can_reshare: any;
	can_viewer_reshare: boolean;
	audience: any;
	ig_media_sharing_disabled: boolean;
	inventory_source: string;
	logging_info_token: string;
	carousel_media: any;
	image_versions2: IImageVersions2;
	media_overlay_info: any;
	share_urls: any;
	saved_collection_ids: any;
	has_viewer_saved: any;
	original_height: number;
	original_width: number;
	is_dash_eligible: number;
	number_of_qualities: number;
	video_dash_manifest: string;
	video_versions: IVideoVersion[];
	has_audio: boolean;
	creative_config: any;
	usertags: any;
	location: any;
	clips_attribution_info: any;
	invited_coauthor_producers: any[];
	carousel_media_count: any;
	preview: any;
	headers: IHeaders;
	raw: IRaw;
}
