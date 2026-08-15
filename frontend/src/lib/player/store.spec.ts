import { describe, it, expect } from 'vitest';
import { PlayerStore } from './store.svelte';

describe('PlayerStore', () => {
	it('playTrack starts playback of the given track from the beginning', () => {
		const store = new PlayerStore();

		store.playTrack('t3');

		expect(store.currentTrackId).toBe('t3');
		expect(store.isPlaying).toBe(true);
		expect(store.progress).toBe(0.02);
	});

	it('nextTrack wraps around from the last track to the first', () => {
		const store = new PlayerStore();
		store.playTrack('t8');

		store.nextTrack();

		expect(store.currentTrackId).toBe('t1');
	});

	it('prevTrack wraps around from the first track to the last', () => {
		const store = new PlayerStore();
		store.playTrack('t1');

		store.prevTrack();

		expect(store.currentTrackId).toBe('t8');
	});

	it('toggleLike flips the liked state for a track', () => {
		const store = new PlayerStore();
		expect(store.isLiked('t1')).toBe(false);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(true);

		store.toggleLike('t1');
		expect(store.isLiked('t1')).toBe(false);
	});

	it('seek clamps ratios outside 0..1', () => {
		const store = new PlayerStore();

		store.seek(-0.5);
		expect(store.progress).toBe(0);

		store.seek(1.5);
		expect(store.progress).toBe(1);
	});

	it('setVolume clamps ratios outside 0..1', () => {
		const store = new PlayerStore();

		store.setVolume(-0.5);
		expect(store.volume).toBe(0);

		store.setVolume(1.5);
		expect(store.volume).toBe(1);
	});
});
