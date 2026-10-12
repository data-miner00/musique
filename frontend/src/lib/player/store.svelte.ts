import { browser } from '$app/environment';
import { fetchPlaylists, fetchTracks, songLabel } from './api';
import { LYRICS } from './data';
import { formatTime, hueForId } from './format';
import type { Playlist, QueueSource, RepeatMode, Screen, Track } from './types';

export const ALL_TRACKS_PLAYLIST_ID = '__all-tracks__';

const SEARCH_SOURCE: QueueSource = { id: '__search__', name: 'Search results' };

const SEEK_STEP_SEC = 5;
// "Previous" restarts the current song once it is further in than this.
const PREV_RESTART_SEC = 3;

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
	// Position previewed while the seek bar is being dragged; null otherwise.
	scrubRatio = $state<number | null>(null);
	volume = $state(0.7);

	showLyrics = $state(false);
	showQueue = $state(false);
	shuffleOn = $state(false);
	repeatMode = $state<RepeatMode>('off');

	// Tracks in the order they will play; shuffled while shuffle is on.
	queue = $state<Track[]>([]);
	queueSource = $state<QueueSource | null>(null);

	likedIds = $state<Record<string, boolean>>({});

	#audio: HTMLAudioElement | null = null;
	#random: () => number;
	// The captured list in its original order, for turning shuffle back off.
	#queueOrder: Track[] = [];

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

	queueIndex = $derived(this.queue.findIndex((t) => t.id === this.currentTrackId));

	upNext = $derived(this.queueIndex < 0 ? [] : this.queue.slice(this.queueIndex + 1));

	activePlaylistPlaying = $derived(
		this.isPlaying && this.queueSource?.id === this.activePlaylistId
	);

	displayProgress = $derived(this.scrubRatio ?? this.progress);

	elapsedLabel = $derived.by(() =>
		formatTime(this.displayProgress * this.currentTrack.durationSec)
	);

	seekStep = $derived(
		this.currentTrack.durationSec > 0 ? SEEK_STEP_SEC / this.currentTrack.durationSec : 0
	);

	activeLyricIndex = $derived(Math.floor(this.progress * LYRICS.length));
	lyrics = LYRICS;

	visualizerBars = $derived.by(() =>
		Array.from(
			{ length: 24 },
			(_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.4 + this.progress * 30)) * 80)
		)
	);

	constructor({
		audio,
		random = Math.random
	}: { audio?: HTMLAudioElement; random?: () => number } = {}) {
		this.#audio = audio ?? (browser ? new Audio() : null);
		this.#random = random;
		if (this.#audio) {
			this.#audio.volume = this.volume;
			this.#audio.addEventListener('timeupdate', () => this.#onTimeUpdate());
			this.#audio.addEventListener('ended', () => this.#onEnded());
		}
		if (browser) void this.loadLibrary();
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

	#duration() {
		// The element's duration is NaN until metadata has loaded; fall back to
		// the tagged length so an early seek still lands in the right place.
		const real = this.#audio?.duration;
		return real && Number.isFinite(real) ? real : this.currentTrack.durationSec;
	}

	#onTimeUpdate() {
		if (!this.#audio) return;
		const duration = this.#duration();
		this.progress = duration > 0 ? clamp01(this.#audio.currentTime / duration) : 0;
	}

	#onEnded() {
		if (this.repeatMode === 'one') {
			this.seek(0);
			this.#play();
		} else {
			this.nextTrack();
		}
	}

	#play() {
		void this.#audio?.play().catch(() => {
			// Playback can be rejected before a user gesture unlocks audio;
			// the transport controls remain usable and reflect real state either way.
		});
	}

	#startPlayback(track: Track) {
		this.currentTrackId = track.id;
		this.progress = 0;
		this.isPlaying = true;
		if (this.#audio) {
			this.#audio.src = track.streamUrl;
			this.#play();
		}
	}

	// Past the end of the queue with repeat off: rest on the first track, paused.
	#restAtStart() {
		const first = this.queue[0];
		this.currentTrackId = first.id;
		this.progress = 0;
		this.isPlaying = false;
		if (this.#audio) {
			this.#audio.pause();
			this.#audio.src = first.streamUrl;
		}
	}

	#shuffled(list: Track[]): Track[] {
		const out = [...list];
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(this.#random() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	#shuffledAround(first: Track): Track[] {
		return [first, ...this.#shuffled(this.#queueOrder.filter((t) => t.id !== first.id))];
	}

	#setQueue(list: Track[], first: Track, source: QueueSource) {
		this.#queueOrder = [...list];
		this.queue = this.shuffleOn ? this.#shuffledAround(first) : [...list];
		this.queueSource = source;
	}

	// A shuffled queue gets a fresh order each lap, never opening with the
	// song that just finished.
	#startNextLap() {
		if (this.shuffleOn && this.queue.length > 1) {
			const justPlayed = this.queue[this.queue.length - 1];
			const order = this.#shuffled(this.#queueOrder);
			if (order[0].id === justPlayed.id) {
				const j = 1 + Math.floor(this.#random() * (order.length - 1));
				[order[0], order[j]] = [order[j], order[0]];
			}
			this.queue = order;
		}
		this.#startPlayback(this.queue[0]);
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
		if (this.isPlaying) this.#play();
		else this.#audio?.pause();
	}

	// Plays a track from the list on screen, which becomes the queue.
	playTrack(id: string) {
		const list = this.tracks;
		const track = list.find((t) => t.id === id);
		if (!track) return;
		const source =
			this.screen === 'search'
				? SEARCH_SOURCE
				: { id: this.activePlaylist.id, name: this.activePlaylist.name };
		this.#setQueue(list, track, source);
		this.#startPlayback(track);
	}

	playFromQueue(id: string) {
		const track = this.queue.find((t) => t.id === id);
		if (track) this.#startPlayback(track);
	}

	// The Play button on a playlist page: starts that playlist unless it is
	// already the one playing, in which case it pauses or resumes.
	toggleActivePlaylist() {
		if (this.currentTrackId && this.queueSource?.id === this.activePlaylistId) {
			this.togglePlay();
			return;
		}
		const list = this.tracksByPlaylist[this.activePlaylistId] ?? [];
		if (list.length === 0) return;
		const first = this.shuffleOn ? list[Math.floor(this.#random() * list.length)] : list[0];
		this.#setQueue(list, first, {
			id: this.activePlaylist.id,
			name: this.activePlaylist.name
		});
		this.#startPlayback(first);
	}

	nextTrack() {
		if (this.queue.length === 0) return;
		const next = this.queue[this.queueIndex + 1];
		if (next) this.#startPlayback(next);
		else if (this.repeatMode === 'off') this.#restAtStart();
		else this.#startNextLap();
	}

	prevTrack() {
		if (this.queue.length === 0) return;
		const elapsedSec = this.progress * this.#duration();
		if (elapsedSec > PREV_RESTART_SEC) this.seek(0);
		else if (this.queueIndex > 0) this.#startPlayback(this.queue[this.queueIndex - 1]);
		else if (this.repeatMode === 'off') this.seek(0);
		else this.#startPlayback(this.queue[this.queue.length - 1]);
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

	openQueue() {
		this.showQueue = true;
		this.showLyrics = false;
		this.nowPlayingOpen = true;
	}

	toggleShuffle() {
		this.shuffleOn = !this.shuffleOn;
		const current = this.queue[this.queueIndex];
		if (!current) return;
		this.queue = this.shuffleOn ? this.#shuffledAround(current) : [...this.#queueOrder];
	}

	cycleRepeat() {
		const order: RepeatMode[] = ['off', 'all', 'one'];
		this.repeatMode = order[(order.indexOf(this.repeatMode) + 1) % order.length];
	}

	previewSeek(ratio: number | null) {
		this.scrubRatio = ratio === null || !this.currentTrackId ? null : clamp01(ratio);
	}

	seek(ratio: number) {
		if (!this.currentTrackId) return;
		this.progress = clamp01(ratio);
		this.scrubRatio = null;
		if (this.#audio) this.#audio.currentTime = this.progress * this.#duration();
	}

	setVolume(ratio: number) {
		this.volume = clamp01(ratio);
		if (this.#audio) this.#audio.volume = this.volume;
	}
}

export const player = new PlayerStore();
