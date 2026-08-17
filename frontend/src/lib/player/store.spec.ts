import { describe, it, expect } from 'vitest';
import { PlayerStore, ALL_TRACKS_PLAYLIST_ID } from './store.svelte';
import type { Track } from './types';

function makeTrack(id: string, overrides: Partial<Track> = {}): Track {
	return {
		id,
		title: `Title ${id}`,
		artist: 'Some Artist',
		album: 'Some Album',
		durationSec: 200,
		playlistId: 'p1',
		streamUrl: `http://localhost:8000/stream/${id}`,
		hue: 0,
		...overrides
	};
}

function storeWithLibrary(): PlayerStore {
	const store = new PlayerStore();
	const p1Tracks = ['t1', 't2', 't3'].map((id) => makeTrack(id, { playlistId: 'p1' }));
	const p2Tracks = [makeTrack('t4', { playlistId: 'p2', title: 'Midnight Run', artist: 'Nova' })];
	const allTracks = [...p1Tracks, ...p2Tracks];

	store.tracksByPlaylist = {
		p1: p1Tracks,
		p2: p2Tracks,
		[ALL_TRACKS_PLAYLIST_ID]: allTracks
	};
	store.playlists = [
		{ id: ALL_TRACKS_PLAYLIST_ID, name: 'All Tracks', desc: '4 songs', hue: 0 },
		{ id: 'p1', name: 'Folder One', desc: '3 songs', hue: 10 },
		{ id: 'p2', name: 'Folder Two', desc: '1 song', hue: 20 }
	];
	store.activePlaylistId = 'p1';
	return store;
}

describe('PlayerStore', () => {
	it('playTrack starts playback of the given track from the beginning', () => {
		const store = storeWithLibrary();

		store.playTrack('t2');

		expect(store.currentTrackId).toBe('t2');
		expect(store.isPlaying).toBe(true);
		expect(store.progress).toBe(0);
	});

	it('nextTrack wraps around from the last track to the first, within the active playlist', () => {
		const store = storeWithLibrary();
		store.playTrack('t3');

		store.nextTrack();

		expect(store.currentTrackId).toBe('t1');
	});

	it('prevTrack wraps around from the first track to the last, within the active playlist', () => {
		const store = storeWithLibrary();
		store.playTrack('t1');

		store.prevTrack();

		expect(store.currentTrackId).toBe('t3');
	});

	it('currentTrack reflects the actually-playing track even after browsing to a different playlist', () => {
		const store = storeWithLibrary();
		store.playTrack('t2');

		store.selectPlaylist('p2');

		expect(store.currentTrack.id).toBe('t2');
	});

	it('toggleLike flips the liked state for a track', () => {
		const store = storeWithLibrary();
		expect(store.isLiked('t1')).toBe(false);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(true);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(false);
	});

	it('seek clamps ratios outside 0..1', () => {
		const store = storeWithLibrary();

		store.seek(-0.5);
		expect(store.progress).toBe(0);

		store.seek(1.5);
		expect(store.progress).toBe(1);
	});

	it('setVolume clamps ratios outside 0..1', () => {
		const store = storeWithLibrary();

		store.setVolume(-0.5);
		expect(store.volume).toBe(0);

		store.setVolume(1.5);
		expect(store.volume).toBe(1);
	});

	it('searchResults filters the full library by title, artist, or album, case-insensitively', () => {
		const store = storeWithLibrary();

		store.searchQuery = 'NOVA';

		expect(store.searchResults.map((t) => t.id)).toEqual(['t4']);
	});

	it('searchResults is empty when the query is blank', () => {
		const store = storeWithLibrary();

		store.searchQuery = '   ';

		expect(store.searchResults).toEqual([]);
	});
});
