import { describe, it, expect } from 'vitest';
import { PlayerStore, ALL_TRACKS_PLAYLIST_ID } from './store.svelte';
import type { Track } from './types';

type FakeAudio = HTMLAudioElement & { fire: (type: string) => void };

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

function fakeAudio(duration: number): FakeAudio {
	const listeners: Record<string, () => void> = {};
	return {
		currentTime: 0,
		duration,
		volume: 1,
		src: '',
		addEventListener: (type: string, listener: () => void) => {
			listeners[type] = listener;
		},
		fire: (type: string) => listeners[type]?.(),
		play: () => Promise.resolve(),
		pause: () => {}
	} as unknown as FakeAudio;
}

function storeWithLibrary(options: ConstructorParameters<typeof PlayerStore>[0] = {}): PlayerStore {
	const store = new PlayerStore(options);
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

const ids = (tracks: Track[]) => tracks.map((t) => t.id);

describe('PlayerStore', () => {
	it('playTrack starts playback of the given track from the beginning', () => {
		const store = storeWithLibrary();

		store.playTrack('t2');

		expect(store.currentTrackId).toBe('t2');
		expect(store.isPlaying).toBe(true);
		expect(store.progress).toBe(0);
	});

	it('currentTrack reflects the actually-playing track even after browsing to a different playlist', () => {
		const store = storeWithLibrary();
		store.playTrack('t2');

		store.selectPlaylist('p2');

		expect(store.currentTrack.id).toBe('t2');
	});

	describe('queue', () => {
		it('playTrack captures the list on screen as the queue', () => {
			const store = storeWithLibrary();

			store.playTrack('t2');

			expect(ids(store.queue)).toEqual(['t1', 't2', 't3']);
			expect(ids(store.upNext)).toEqual(['t3']);
			expect(store.queueSource).toEqual({ id: 'p1', name: 'Folder One' });
		});

		it('next keeps following the queue after browsing elsewhere', () => {
			const store = storeWithLibrary();
			store.playTrack('t1');

			store.selectPlaylist('p2');
			store.nextTrack();
			expect(store.currentTrackId).toBe('t2');

			store.goSearch();
			store.nextTrack();
			expect(store.currentTrackId).toBe('t3');
		});

		it('playing from search captures the results at that moment', () => {
			const store = storeWithLibrary();
			store.goSearch();
			store.searchQuery = 'title';
			store.playTrack('t2');

			store.searchQuery = 'nova';
			store.nextTrack();

			expect(store.currentTrackId).toBe('t3');
			expect(store.queueSource?.name).toBe('Search results');
		});

		it('plays the next track in the queue when a song ends', () => {
			const audio = fakeAudio(200);
			const store = storeWithLibrary({ audio });
			store.playTrack('t1');

			audio.fire('ended');

			expect(store.currentTrackId).toBe('t2');
			expect(store.isPlaying).toBe(true);
		});

		it('playFromQueue jumps within the queue without rebuilding it', () => {
			const store = storeWithLibrary();
			store.playTrack('t1');
			store.selectPlaylist('p2');

			store.playFromQueue('t3');

			expect(store.currentTrackId).toBe('t3');
			expect(ids(store.queue)).toEqual(['t1', 't2', 't3']);
		});

		it('toggleActivePlaylist starts the browsed playlist, then pauses it', () => {
			const store = storeWithLibrary();

			store.toggleActivePlaylist();
			expect(store.currentTrackId).toBe('t1');
			expect(store.activePlaylistPlaying).toBe(true);

			store.toggleActivePlaylist();
			expect(store.currentTrackId).toBe('t1');
			expect(store.isPlaying).toBe(false);

			store.selectPlaylist('p2');
			store.toggleActivePlaylist();
			expect(store.currentTrackId).toBe('t4');
			expect(store.isPlaying).toBe(true);
		});
	});

	describe('repeat', () => {
		it('cycleRepeat steps through off, all and one', () => {
			const store = storeWithLibrary();
			expect(store.repeatMode).toBe('off');

			store.cycleRepeat();
			expect(store.repeatMode).toBe('all');

			store.cycleRepeat();
			expect(store.repeatMode).toBe('one');

			store.cycleRepeat();
			expect(store.repeatMode).toBe('off');
		});

		it('off: next on the last track rests on the first track, paused', () => {
			const audio = fakeAudio(200);
			const store = storeWithLibrary({ audio });
			store.playTrack('t3');

			store.nextTrack();

			expect(store.currentTrackId).toBe('t1');
			expect(store.isPlaying).toBe(false);
			expect(store.progress).toBe(0);
			expect(audio.src).toBe('http://localhost:8000/stream/t1');
		});

		it('off: previous on the first track restarts it', () => {
			const store = storeWithLibrary();
			store.playTrack('t1');

			store.prevTrack();

			expect(store.currentTrackId).toBe('t1');
			expect(store.isPlaying).toBe(true);
		});

		it('all: next and previous wrap around the queue', () => {
			const store = storeWithLibrary();
			store.cycleRepeat();
			store.playTrack('t3');

			store.nextTrack();
			expect(store.currentTrackId).toBe('t1');

			store.prevTrack();
			expect(store.currentTrackId).toBe('t3');
		});

		it('one: the song restarts when it ends, but next still moves on', () => {
			const audio = fakeAudio(200);
			const store = storeWithLibrary({ audio });
			store.cycleRepeat();
			store.cycleRepeat();
			store.playTrack('t1');
			audio.currentTime = 200;

			audio.fire('ended');
			expect(store.currentTrackId).toBe('t1');
			expect(audio.currentTime).toBe(0);

			store.nextTrack();
			expect(store.currentTrackId).toBe('t2');
			expect(store.repeatMode).toBe('one');
		});
	});

	it('previous restarts the current song when more than 3 seconds in', () => {
		const store = storeWithLibrary();
		store.playTrack('t2');
		store.seek(0.5);

		store.prevTrack();
		expect(store.currentTrackId).toBe('t2');
		expect(store.progress).toBe(0);

		store.prevTrack();
		expect(store.currentTrackId).toBe('t1');
	});

	describe('shuffle', () => {
		it('puts the current song first and plays every other track once', () => {
			const store = storeWithLibrary({ random: () => 0 });
			store.playTrack('t2');

			store.toggleShuffle();

			expect(ids(store.queue)).toEqual(['t2', 't3', 't1']);
			store.nextTrack();
			expect(store.currentTrackId).toBe('t3');
			store.nextTrack();
			expect(store.currentTrackId).toBe('t1');
		});

		it('turning it off carries on from the current song in the original order', () => {
			const store = storeWithLibrary({ random: () => 0 });
			store.playTrack('t2');
			store.toggleShuffle();

			store.toggleShuffle();

			expect(ids(store.queue)).toEqual(['t1', 't2', 't3']);
			store.nextTrack();
			expect(store.currentTrackId).toBe('t3');
		});

		it('with repeat all, a new lap never opens with the song that just finished', () => {
			// With random() === 0 the fresh order would open with t2, the song
			// that just finished, so the store has to move it off the front.
			const store = storeWithLibrary({ random: () => 0 });
			store.toggleShuffle();
			store.cycleRepeat();
			store.playTrack('t1');
			expect(ids(store.queue)).toEqual(['t1', 't3', 't2']);
			store.nextTrack();
			store.nextTrack();

			store.nextTrack();

			expect(store.currentTrackId).toBe('t3');
			expect(ids(store.queue).sort()).toEqual(['t1', 't2', 't3']);
		});
	});

	it('toggleLike flips the liked state for a track', () => {
		const store = storeWithLibrary();
		expect(store.isLiked('t1')).toBe(false);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(true);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(false);
	});

	it('seek moves the audio to the matching position in the track', () => {
		const audio = fakeAudio(200);
		const store = storeWithLibrary({ audio });
		store.playTrack('t1');

		store.seek(0.5);

		expect(audio.currentTime).toBe(100);
		expect(store.progress).toBe(0.5);
	});

	it('seek does nothing when no track is loaded', () => {
		const audio = fakeAudio(200);
		const store = storeWithLibrary({ audio });

		store.seek(0.5);

		expect(audio.currentTime).toBe(0);
		expect(store.progress).toBe(0);
	});

	it('seek clamps ratios outside 0..1', () => {
		const store = storeWithLibrary();
		store.playTrack('t1');

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
