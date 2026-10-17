import { describe, it, expect } from 'vitest';
import { shortcutFor, type ShortcutAction } from './shortcuts';

type KeyInput = Parameters<typeof shortcutFor>[0];

function press(key: string, overrides: Partial<KeyInput> = {}): KeyInput {
	return {
		key,
		shiftKey: false,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		target: null,
		...overrides
	};
}

// Stands in for a focused element, without needing a DOM.
function focused(tagName: string, role: string | null = null): EventTarget {
	return { tagName, getAttribute: () => role } as unknown as EventTarget;
}

describe('shortcutFor', () => {
	it('maps each key to its action', () => {
		const shift = { shiftKey: true };
		const cases: [KeyInput, ShortcutAction | null][] = [
			[press(' '), 'togglePlay'],
			[press('ArrowLeft'), 'seekBack'],
			[press('ArrowRight'), 'seekForward'],
			[press('ArrowLeft', shift), 'prevTrack'],
			[press('ArrowRight', shift), 'nextTrack'],
			[press('ArrowUp', shift), 'volumeUp'],
			[press('ArrowDown', shift), 'volumeDown'],
			[press('m'), 'toggleMute'],
			[press('S', shift), 'toggleShuffle'],
			[press('r'), 'cycleRepeat'],
			[press('/'), 'focusSearch'],
			[press('?', shift), 'toggleHelp'],
			[press('Escape'), 'escape'],
			// Plain up and down keep scrolling; other keys are not shortcuts.
			[press('ArrowUp'), null],
			[press('ArrowDown'), null],
			[press('x'), null]
		];

		for (const [event, action] of cases) {
			expect(shortcutFor(event), `key "${event.key}"`).toBe(action);
		}
	});

	it('is ignored while typing in a text field, except Escape', () => {
		const target = focused('INPUT');

		expect(shortcutFor(press(' ', { target }))).toBeNull();
		expect(shortcutFor(press('s', { target }))).toBeNull();
		expect(shortcutFor(press('Escape', { target }))).toBe('escape');
	});

	it('is ignored when Ctrl, Alt or Meta is held', () => {
		expect(shortcutFor(press('r', { ctrlKey: true }))).toBeNull();
		expect(shortcutFor(press('ArrowLeft', { altKey: true }))).toBeNull();
		expect(shortcutFor(press('s', { metaKey: true }))).toBeNull();
	});

	it('leaves plain left and right to a focused slider, but not Shift + arrows', () => {
		const target = focused('DIV', 'slider');

		expect(shortcutFor(press('ArrowRight', { target }))).toBeNull();
		expect(shortcutFor(press('ArrowRight', { target, shiftKey: true }))).toBe('nextTrack');
	});
});
