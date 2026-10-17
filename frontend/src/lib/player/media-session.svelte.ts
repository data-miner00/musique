import { SEEK_STEP_SEC, type PlayerStore } from './store.svelte';

// Connects the player to the OS media controls: hardware media keys and, on a
// phone, the lock-screen controls. Call during component initialisation.
export function connectMediaSession(player: PlayerStore) {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
	const session = navigator.mediaSession;

	const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
		['play', () => player.play()],
		['pause', () => player.pause()],
		['previoustrack', () => player.prevTrack()],
		['nexttrack', () => player.nextTrack()],
		['seekbackward', (d) => player.seekBy(-(d.seekOffset ?? SEEK_STEP_SEC))],
		['seekforward', (d) => player.seekBy(d.seekOffset ?? SEEK_STEP_SEC)],
		[
			'seekto',
			(d) => {
				const duration = player.currentTrack.durationSec;
				if (d.seekTime != null && duration > 0) player.seek(d.seekTime / duration);
			}
		]
	];
	for (const [action, handler] of handlers) {
		try {
			session.setActionHandler(action, handler);
		} catch {
			// This browser doesn't offer the action.
		}
	}

	$effect(() => {
		const track = player.currentTrack;
		session.metadata = track.id
			? new MediaMetadata({ title: track.title, artist: track.artist, album: track.album })
			: null;
	});

	$effect(() => {
		session.playbackState = !player.currentTrackId
			? 'none'
			: player.isPlaying
				? 'playing'
				: 'paused';
	});
}
