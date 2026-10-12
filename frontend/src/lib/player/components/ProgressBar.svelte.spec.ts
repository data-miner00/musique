import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProgressBar from './ProgressBar.svelte';

describe('ProgressBar.svelte', () => {
	it('seeks forward and backward with arrow keys', async () => {
		const onSeek = vi.fn();
		render(ProgressBar, { value: 0.5, onSeek, step: 0.1 });

		const slider = page.getByRole('slider');
		await userEvent.click(slider);

		await userEvent.keyboard('{ArrowRight}');
		expect(onSeek).toHaveBeenCalledWith(0.6);

		await userEvent.keyboard('{ArrowLeft}');
		expect(onSeek).toHaveBeenCalledWith(0.4);
	});

	it('commits a drag once, at the release position', async () => {
		const onSeek = vi.fn();
		const onPreview = vi.fn();
		render(ProgressBar, { value: 0, onSeek, onPreview });

		const slider = page.getByRole('slider');
		const { width, height } = slider.element().getBoundingClientRect();
		await userEvent.dragAndDrop(slider, slider, {
			sourcePosition: { x: width * 0.25, y: height / 2 },
			targetPosition: { x: width * 0.75, y: height / 2 }
		});

		expect(onSeek).toHaveBeenCalledTimes(1);
		expect(onSeek.mock.calls[0][0]).toBeCloseTo(0.75, 1);
		expect(onPreview).toHaveBeenLastCalledWith(null);
	});

	it('reflects the current value via aria-valuenow', async () => {
		render(ProgressBar, { value: 0.25, onSeek: vi.fn() });

		await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
	});
});
