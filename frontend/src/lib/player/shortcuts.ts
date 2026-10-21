export type ShortcutAction =
	| 'togglePlay'
	| 'seekBack'
	| 'seekForward'
	| 'prevTrack'
	| 'nextTrack'
	| 'volumeUp'
	| 'volumeDown'
	| 'toggleMute'
	| 'toggleShuffle'
	| 'cycleRepeat'
	| 'focusSearch'
	| 'toggleHelp'
	| 'escape';

type KeyInput = Pick<
	KeyboardEvent,
	'key' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'
>;

function focusKind(target: EventTarget | null) {
	const el = target as Partial<HTMLElement> | null;
	const tag = el?.tagName ?? '';
	return {
		typing:
			tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable === true,
		slider: el?.getAttribute?.('role') === 'slider'
	};
}

// The app-wide shortcut a key press stands for, or null when it should be
// left to the browser or to the focused element.
export function shortcutFor(e: KeyInput): ShortcutAction | null {
	if (e.key === 'Escape') return 'escape';
	if (e.ctrlKey || e.altKey || e.metaKey) return null;

	const { typing, slider } = focusKind(e.target);
	if (typing) return null;

	switch (e.key) {
		case ' ':
			return 'togglePlay';
		// A focused seek or volume bar handles its own plain left and right.
		case 'ArrowLeft':
			return e.shiftKey ? 'prevTrack' : slider ? null : 'seekBack';
		case 'ArrowRight':
			return e.shiftKey ? 'nextTrack' : slider ? null : 'seekForward';
		// Plain up and down are left alone so they keep scrolling lists.
		case 'ArrowUp':
			return e.shiftKey ? 'volumeUp' : null;
		case 'ArrowDown':
			return e.shiftKey ? 'volumeDown' : null;
		case '/':
			return 'focusSearch';
		case '?':
			return 'toggleHelp';
	}

	switch (e.key.toLowerCase()) {
		case 'm':
			return 'toggleMute';
		case 's':
			return 'toggleShuffle';
		case 'r':
			return 'cycleRepeat';
	}

	return null;
}

// What the help panel lists. Each row's `keys` are alternatives.
export const SHORTCUT_HELP: { title: string; rows: { keys: string[]; label: string }[] }[] = [
	{
		title: 'Playback',
		rows: [
			{ keys: ['Space'], label: 'Play or pause' },
			{ keys: ['←', '→'], label: 'Seek back or forward 5 seconds' },
			{ keys: ['Shift + ←', 'Shift + →'], label: 'Previous or next track' },
			{ keys: ['S'], label: 'Shuffle on or off' },
			{ keys: ['R'], label: 'Repeat: off, all, one' }
		]
	},
	{
		title: 'Volume',
		rows: [
			{ keys: ['Shift + ↑', 'Shift + ↓'], label: 'Volume up or down' },
			{ keys: ['M'], label: 'Mute or unmute' }
		]
	},
	{
		title: 'Navigation',
		rows: [
			{ keys: ['/'], label: 'Search' },
			{ keys: ['?'], label: 'Show or hide this panel' },
			{ keys: ['Esc'], label: 'Close this panel or the full-screen view' }
		]
	}
];
