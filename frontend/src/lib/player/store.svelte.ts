import { browser } from '$app/environment';
import { fetchPlaylists, fetchTracks, songLabel } from './api';
import { LYRICS } from './data';
import { formatTime, hueForId } from './format';
import type { Playlist, Screen, Track } from './types';

export const ALL_TRACKS_PLAYLIST_ID = '__all-tracks__';

const EMPTY_TRACK: Track = {
	id: '',
	title: '',
	artist: '',
	album: '',
	durationSec: 0,
	playlistId: '',
	streamUrl: '',
	hue: 0
};

const EMPTY_PLAYLIST: Playlist = { id: '', name: '', desc: '', hue: 0 };

function clamp01(n: number) {
	return Math.min(1, Math.max(0, n));
}

export class PlayerStore {
	screen = $state<Screen>('home');
	nowPlayingOpen = $state(false);
	playlists = $state<Playlist[]>([]);
	tracksByPlaylist = $state<Record<string, Track[]>>({});
	activePlaylistId = $state(ALL_TRACKS_PLAYLIST_ID);
	currentTrackId = $state<string | null>(null);
	searchQuery = $state('');

	isPlaying = $state(false);
	progress = $state(0);
	volume = $state(0.7);

	showLyrics = $state(false);
	showQueue = $state(false);
	shuffleOn = $state(false);
	repeatOn = $state(false);

	likedIds = $state<Record<string, boolean>>({});

	#audio: HTMLAudioElement | null = null;

	searchResults = $derived.by(() => {
		const query = this.searchQuery.trim().toLowerCase();
		if (!query) return [];
		const all = this.tracksByPlaylist[ALL_TRACKS_PLAYLIST_ID] ?? [];
		return all.filter(
			(t) =>
				t.title.toLowerCase().includes(query) ||
				t.artist.toLowerCase().includes(query) ||
				t.album.toLowerCase().includes(query)
		);
	});

	tracks = $derived(
		this.screen === 'search'
			? this.searchResults
			: (this.tracksByPlaylist[this.activePlaylistId] ?? [])
	);

	activePlaylist = $derived(
		this.playlists.find((p) => p.id === this.activePlaylistId) ?? EMPTY_PLAYLIST
	);

	currentTrack = $derived(
		(this.tracksByPlaylist[ALL_TRACKS_PLAYLIST_ID] ?? []).find(
			(t) => t.id === this.currentTrackId
		) ?? EMPTY_TRACK
	);

	elapsedLabel = $derived.by(() => formatTime(this.progress * this.currentTrack.durationSec));

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
			this.#audio = new Audio();
			this.#audio.volume = this.volume;
			this.#audio.addEventListener('timeupdate', () => this.#onTimeUpdate());
			this.#audio.addEventListener('ended', () => this.nextTrack());
			void this.loadLibrary();
		}
	}

	async loadLibrary() {
		try {
			const [playlists, tracks] = await Promise.all([fetchPlaylists(), fetchTracks()]);

			const grouped: Record<string, Track[]> = {};
			for (const track of tracks) {
				(grouped[track.playlistId] ??= []).push(track);
			}
			grouped[ALL_TRACKS_PLAYLIST_ID] = tracks;

			const allTracksPlaylist: Playlist = {
				id: ALL_TRACKS_PLAYLIST_ID,
				name: 'All Tracks',
				desc: songLabel(tracks.length),
				hue: hueForId(ALL_TRACKS_PLAYLIST_ID)
			};

			this.tracksByPlaylist = grouped;
			this.playlists = [allTracksPlaylist, ...playlists];
		} catch (err) {
			console.error('Failed to load library from backend', err);
		}
	}

	#onTimeUpdate() {
		if (!this.#audio) return;
		const duration = this.#audio.duration || this.currentTrack.durationSec;
		this.progress = duration > 0 ? clamp01(this.#audio.currentTime / duration) : 0;
	}

	#startPlayback(track: Track) {
		this.currentTrackId = track.id;
		this.progress = 0;
		this.isPlaying = true;
		if (this.#audio) {
			this.#audio.src = track.streamUrl;
			void this.#audio.play().catch(() => {
				// Playback can be rejected before a user gesture unlocks audio;
				// the transport controls remain usable and reflect real state either way.
			});
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
		if (!this.currentTrackId) return;
		this.isPlaying = !this.isPlaying;
		if (this.#audio) {
			if (this.isPlaying) void this.#audio.play();
			else this.#audio.pause();
		}
	}

	playTrack(id: string) {
		const track = this.tracks.find((t) => t.id === id);
		if (track) this.#startPlayback(track);
	}

	nextTrack() {
		const list = this.tracks;
		if (list.length === 0) return;
		const idx = list.findIndex((t) => t.id === this.currentTrackId);
		this.#startPlayback(list[(idx + 1) % list.length]);
	}

	prevTrack() {
		const list = this.tracks;
		if (list.length === 0) return;
		const idx = list.findIndex((t) => t.id === this.currentTrackId);
		this.#startPlayback(list[(idx - 1 + list.length) % list.length]);
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
		// Scrubbing isn't wired to real playback yet (no HTTP Range support on
		// the stream endpoint) - this only nudges the displayed position, which
		// self-corrects from the next `timeupdate` while a track is playing.
		this.progress = clamp01(ratio);
	}

	setVolume(ratio: number) {
		this.volume = clamp01(ratio);
		if (this.#audio) this.#audio.volume = this.volume;
	}
}

export const player = new PlayerStore();
