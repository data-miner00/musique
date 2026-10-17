import { browser } from '$app/environment';
import { fetchPlaylists, fetchTracks, songLabel } from './api';
import { LYRICS } from './data';
import { formatTime, hueForId } from './format';
import type { Playlist, QueueSource, RepeatMode, Screen, Track } from './types';

export const ALL_TRACKS_PLAYLIST_ID = '__all-tracks__';

const SEARCH_SOURCE: QueueSource = { id: '__search__', name: 'Search results' };

export const SEEK_STEP_SEC = 5;
export const VOLUME_STEP = 0.05;
// "Previous" restarts the current song once it is further in than this.
const PREV_RESTART_SEC = 3;

const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one'];

// Remembered state lives under two keys so the frequent position write stays
// small however long the queue is.
const QUEUE_KEY = 'musique:queue';
const PLAYBACK_KEY = 'musique:playback';
// While playing, the position is written to storage this often.
const SAVE_EVERY_SEC = 5;

type StateStorage = Pick<Storage, 'getItem' | 'setItem'>;

type SavedQueue = { queueIds: string[]; orderIds: string[]; source: QueueSource | null };

type SavedPlayback = {
	currentId: string | null;
	positionSec: number;
	volume: number;
	muted: boolean;
	shuffleOn: boolean;
	repeatMode: RepeatMode;
};

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

function browserStorage(): StateStorage | null {
	if (!browser) return null;
	try {
		return window.localStorage;
	} catch {
		// Reading the property throws when the browser blocks storage.
		return null;
	}
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
	muted = $state(false);

	showLyrics = $state(false);
	showQueue = $state(false);
	showShortcuts = $state(false);
	shuffleOn = $state(false);
	repeatMode = $state<RepeatMode>('off');

	// Tracks in the order they will play; shuffled while shuffle is on.
	queue = $state<Track[]>([]);
	queueSource = $state<QueueSource | null>(null);

	likedIds = $state<Record<string, boolean>>({});

	#audio: HTMLAudioElement | null = null;
	#random: () => number;
	#storage: StateStorage | null;
	// The captured list in its original order, for turning shuffle back off.
	#queueOrder: Track[] = [];
	// Nothing is written to storage until the saved state has been read back,
	// so a reload during start-up can't replace it with defaults.
	#restored = false;
	#lastSavedSec = 0;

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
		random = Math.random,
		storage = browserStorage()
	}: {
		audio?: HTMLAudioElement;
		random?: () => number;
		storage?: StateStorage | null;
	} = {}) {
		this.#audio = audio ?? (browser ? new Audio() : null);
		this.#random = random;
		this.#storage = storage;
		if (this.#audio) {
			this.#audio.volume = this.volume;
			this.#audio.addEventListener('timeupdate', () => this.#onTimeUpdate());
			this.#audio.addEventListener('ended', () => this.#onEnded());
		}
		if (browser) {
			// The last chances to record the position before the tab goes away.
			window.addEventListener('pagehide', () => this.#savePlayback());
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') this.#savePlayback();
			});
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
			this.restoreSaved();
		} catch (err) {
			console.error('Failed to load library from backend', err);
		}
	}

	// Brings back what the last session left in storage. Runs once the library
	// has loaded, because saved track ids are resolved against it.
	restoreSaved() {
		const playback = this.#read<Partial<SavedPlayback>>(PLAYBACK_KEY);
		const saved = this.#read<Partial<SavedQueue>>(QUEUE_KEY);
		this.#restored = true;

		if (playback) {
			if (typeof playback.volume === 'number') this.volume = clamp01(playback.volume);
			this.muted = playback.muted === true;
			this.shuffleOn = playback.shuffleOn === true;
			if (REPEAT_MODES.includes(playback.repeatMode as RepeatMode)) {
				this.repeatMode = playback.repeatMode as RepeatMode;
			}
			if (this.#audio) {
				this.#audio.volume = this.volume;
				this.#audio.muted = this.muted;
			}
		}

		// Tracks that have left the library since are dropped.
		const all = this.tracksByPlaylist[ALL_TRACKS_PLAYLIST_ID] ?? [];
		const byId: Record<string, Track> = Object.fromEntries(all.map((t) => [t.id, t]));
		const resolve = (ids: unknown) =>
			Array.isArray(ids) ? ids.flatMap((id) => byId[id] ?? []) : [];

		const queue = resolve(saved?.queueIds);
		if (queue.length === 0) return;
		const order = resolve(saved?.orderIds);
		const source = saved?.source;

		this.queue = queue;
		this.#queueOrder = order.length === queue.length ? order : [...queue];
		this.queueSource =
			source && typeof source.id === 'string' && typeof source.name === 'string'
				? { id: source.id, name: source.name }
				: null;

		const current = queue.find((t) => t.id === playback?.currentId);
		const track = current ?? queue[0];
		const positionSec =
			current && typeof playback?.positionSec === 'number' ? Math.max(0, playback.positionSec) : 0;

		this.currentTrackId = track.id;
		this.isPlaying = false;
		this.progress = track.durationSec > 0 ? clamp01(positionSec / track.durationSec) : 0;
		this.#lastSavedSec = positionSec;
		if (this.#audio) {
			this.#audio.src = track.streamUrl;
			this.#audio.currentTime = positionSec;
		}
	}

	#read<T>(key: string): T | null {
		try {
			const raw = this.#storage?.getItem(key);
			return raw ? (JSON.parse(raw) as T) : null;
		} catch {
			return null;
		}
	}

	#write(key: string, value: unknown) {
		if (!this.#restored) return;
		try {
			this.#storage?.setItem(key, JSON.stringify(value));
		} catch {
			// Storage is full or blocked; the player works without remembering.
		}
	}

	#saveQueue() {
		const saved: SavedQueue = {
			queueIds: this.queue.map((t) => t.id),
			orderIds: this.#queueOrder.map((t) => t.id),
			source: this.queueSource
		};
		this.#write(QUEUE_KEY, saved);
	}

	#savePlayback() {
		const positionSec = this.progress * this.#duration();
		const saved: SavedPlayback = {
			currentId: this.currentTrackId,
			positionSec,
			volume: this.volume,
			muted: this.muted,
			shuffleOn: this.shuffleOn,
			repeatMode: this.repeatMode
		};
		this.#lastSavedSec = positionSec;
		this.#write(PLAYBACK_KEY, saved);
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
		if (Math.abs(this.#audio.currentTime - this.#lastSavedSec) >= SAVE_EVERY_SEC) {
			this.#savePlayback();
		}
	}

	#onEnded() {
		if (this.repeatMode === 'one') {
			this.seek(0);
			this.#startAudio();
		} else {
			this.nextTrack();
		}
	}

	#startAudio() {
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
			this.#startAudio();
		}
		this.#savePlayback();
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
		this.#savePlayback();
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
		this.#saveQueue();
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
			this.#saveQueue();
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

	play() {
		if (!this.currentTrackId) return;
		this.isPlaying = true;
		this.#startAudio();
	}

	pause() {
		if (!this.currentTrackId) return;
		this.isPlaying = false;
		this.#audio?.pause();
		this.#savePlayback();
	}

	togglePlay() {
		if (this.isPlaying) this.pause();
		else this.play();
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

	toggleShortcuts() {
		this.showShortcuts = !this.showShortcuts;
	}

	closeShortcuts() {
		this.showShortcuts = false;
	}

	toggleShuffle() {
		this.shuffleOn = !this.shuffleOn;
		const current = this.queue[this.queueIndex];
		if (current) {
			this.queue = this.shuffleOn ? this.#shuffledAround(current) : [...this.#queueOrder];
			this.#saveQueue();
		}
		this.#savePlayback();
	}

	cycleRepeat() {
		const next = REPEAT_MODES.indexOf(this.repeatMode) + 1;
		this.repeatMode = REPEAT_MODES[next % REPEAT_MODES.length];
		this.#savePlayback();
	}

	previewSeek(ratio: number | null) {
		this.scrubRatio = ratio === null || !this.currentTrackId ? null : clamp01(ratio);
	}

	seek(ratio: number) {
		if (!this.currentTrackId) return;
		this.progress = clamp01(ratio);
		this.scrubRatio = null;
		if (this.#audio) this.#audio.currentTime = this.progress * this.#duration();
		this.#savePlayback();
	}

	seekBy(seconds: number) {
		const duration = this.#duration();
		if (duration > 0) this.seek(this.progress + seconds / duration);
	}

	// Changing the volume always unmutes.
	setVolume(ratio: number) {
		this.volume = clamp01(ratio);
		this.muted = false;
		if (this.#audio) {
			this.#audio.volume = this.volume;
			this.#audio.muted = false;
		}
		this.#savePlayback();
	}

	nudgeVolume(delta: number) {
		this.setVolume(Math.round((this.volume + delta) * 100) / 100);
	}

	// Mute leaves the level alone, so unmuting returns to it.
	toggleMute() {
		this.muted = !this.muted;
		if (this.#audio) this.#audio.muted = this.muted;
		this.#savePlayback();
	}
}

export const player = new PlayerStore();
