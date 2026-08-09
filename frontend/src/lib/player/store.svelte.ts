import { browser } from '$app/environment';
import { LYRICS, PLAYLISTS, TRACKS_BY_PLAYLIST } from './data';
import type { Screen, Track } from './types';

function clamp01(n: number) {
	return Math.min(1, Math.max(0, n));
}

class PlayerStore {
	screen = $state<Screen>('home');
	nowPlayingOpen = $state(false);
	activePlaylistId = $state('p1');
	currentTrackId = $state('t1');

	isPlaying = $state(true);
	progress = $state(0.35);
	volume = $state(0.7);

	showLyrics = $state(false);
	showQueue = $state(false);
	shuffleOn = $state(false);
	repeatOn = $state(false);

	likedIds = $state<Record<string, boolean>>({ t2: true, t5: true });

	playlists = PLAYLISTS;

	tracks = $derived(TRACKS_BY_PLAYLIST[this.activePlaylistId] ?? TRACKS_BY_PLAYLIST.p1);
	activePlaylist = $derived(PLAYLISTS.find((p) => p.id === this.activePlaylistId) ?? PLAYLISTS[0]);
	currentTrack = $derived<Track>(
		this.tracks.find((t) => t.id === this.currentTrackId) ?? this.tracks[0]
	);

	elapsedLabel = $derived.by(() => {
		const [dm, ds] = this.currentTrack.duration.split(':').map(Number);
		const totalSec = dm * 60 + ds;
		const curSec = Math.floor(this.progress * totalSec);
		return Math.floor(curSec / 60) + ':' + String(curSec % 60).padStart(2, '0');
	});

	activeLyricIndex = $derived(Math.floor(this.progress * LYRICS.length));
	lyrics = LYRICS;

	visualizerBars = $derived.by(() =>
		Array.from(
			{ length: 24 },
			(_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.4 + this.progress * 30)) * 80)
		)
	);

	constructor() {
		if (browser) {
			const timer = setInterval(() => {
				if (this.isPlaying) {
					this.progress = this.progress >= 1 ? 0 : this.progress + 0.003;
				}
			}, 300);
			// Store is a module-level singleton for the lifetime of the tab; no teardown needed.
			void timer;
		}
	}

	isLiked(trackId: string) {
		return !!this.likedIds[trackId];
	}

	goHome() {
		this.screen = 'home';
	}

	goSearch() {
		this.screen = 'search';
	}

	goLibrary() {
		this.screen = 'library';
	}

	goNowPlaying() {
		this.nowPlayingOpen = true;
	}

	closeNowPlaying() {
		this.nowPlayingOpen = false;
	}

	selectPlaylist(id: string) {
		this.activePlaylistId = id;
		this.screen = 'playlist';
	}

	togglePlay() {
		this.isPlaying = !this.isPlaying;
	}

	playTrack(id: string) {
		this.currentTrackId = id;
		this.isPlaying = true;
		this.progress = 0.02;
	}

	nextTrack() {
		const list = this.tracks;
		const idx = list.findIndex((t) => t.id === this.currentTrackId);
		this.currentTrackId = list[(idx + 1) % list.length].id;
		this.progress = 0.02;
	}

	prevTrack() {
		const list = this.tracks;
		const idx = list.findIndex((t) => t.id === this.currentTrackId);
		this.currentTrackId = list[(idx - 1 + list.length) % list.length].id;
		this.progress = 0.02;
	}

	toggleLike(id: string) {
		this.likedIds = { ...this.likedIds, [id]: !this.likedIds[id] };
	}

	toggleLyrics() {
		this.showLyrics = !this.showLyrics;
		if (this.showLyrics) this.showQueue = false;
	}

	toggleQueue() {
		this.showQueue = !this.showQueue;
		if (this.showQueue) this.showLyrics = false;
	}

	toggleShuffle() {
		this.shuffleOn = !this.shuffleOn;
	}

	toggleRepeat() {
		this.repeatOn = !this.repeatOn;
	}

	seek(ratio: number) {
		this.progress = clamp01(ratio);
	}

	setVolume(ratio: number) {
		this.volume = clamp01(ratio);
	}
}

export const player = new PlayerStore();
