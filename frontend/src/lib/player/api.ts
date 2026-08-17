import { hueForId } from './format';
import type { Playlist, Track } from './types';

const API_BASE = 'http://localhost:8000';

type TrackDto = {
	id: string;
	title: string;
	artist: string;
	album: string;
	track_number: number | null;
	duration: number;
	playlist_id: string;
};

type PlaylistDto = {
	id: string;
	name: string;
	track_count: number;
};

function songLabel(count: number): string {
	return `${count} song${count === 1 ? '' : 's'}`;
}

function toTrack(dto: TrackDto): Track {
	return {
		id: dto.id,
		title: dto.title,
		artist: dto.artist,
		album: dto.album,
		durationSec: dto.duration,
		playlistId: dto.playlist_id,
		streamUrl: `${API_BASE}/stream/${dto.id}`,
		hue: hueForId(dto.id)
	};
}

function toPlaylist(dto: PlaylistDto): Playlist {
	return {
		id: dto.id,
		name: dto.name,
		desc: songLabel(dto.track_count),
		hue: hueForId(dto.id)
	};
}

export async function fetchTracks(): Promise<Track[]> {
	const res = await fetch(`${API_BASE}/tracks`);
	if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.status}`);
	const dtos: TrackDto[] = await res.json();
	return dtos.map(toTrack);
}

export async function fetchPlaylists(): Promise<Playlist[]> {
	const res = await fetch(`${API_BASE}/playlists`);
	if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.status}`);
	const dtos: PlaylistDto[] = await res.json();
	return dtos.map(toPlaylist);
}

export { songLabel };
