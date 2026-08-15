import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProgressBar from './ProgressBar.svelte';

describe('ProgressBar.svelte', () => {
	it('seeks forward and backward with arrow keys', async () => {
		const onSeek = vi.fn();
		render(ProgressBar, { value: 0.5, onSeek });

		const slider = page.getByRole('slider');
		await userEvent.click(slider);

		await userEvent.keyboard('{ArrowRight}');
		expect(onSeek).toHaveBeenCalledWith(0.52);

		await userEvent.keyboard('{ArrowLeft}');
		expect(onSeek).toHaveBeenCalledWith(0.48);
	});

	it('reflects the current value via aria-valuenow', async () => {
		render(ProgressBar, { value: 0.25, onSeek: vi.fn() });

		await expect.element(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
	});
});
