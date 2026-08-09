<script lang="ts">
	let {
		value,
		onSeek,
		height = 4,
		fillColor = 'var(--color-ink-3)'
	}: {
		value: number;
		onSeek: (ratio: number) => void;
		height?: number;
		fillColor?: string;
	} = $props();

	function seekFromClick(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onSeek((e.clientX - rect.left) / rect.width);
	}

	function seekFromKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') onSeek(value + 0.02);
		else if (e.key === 'ArrowLeft') onSeek(value - 0.02);
	}
</script>

<div
	role="slider"
	tabindex="0"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(value * 100)}
	onclick={seekFromClick}
	onkeydown={seekFromKey}
	class="relative flex-1 cursor-pointer rounded-full bg-white/15"
	style="height:{height}px"
>
	<div
		class="absolute top-0 left-0 h-full rounded-full"
		style="width:{value * 100}%; background:{fillColor}"
	></div>
</div>
