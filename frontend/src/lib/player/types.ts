export type Playlist = {
	id: string;
	name: string;
	desc: string;
	hue: number;
};

export type Track = {
	id: string;
	title: string;
	artist: string;
	album: string;
	durationSec: number;
	playlistId: string;
	streamUrl: string;
	hue: number;
};

export type Screen = 'home' | 'search' | 'library' | 'playlist';

export type RepeatMode = 'off' | 'all' | 'one';

// Where the current queue was captured from: a playlist, or the search results.
export type QueueSource = { id: string; name: string };
