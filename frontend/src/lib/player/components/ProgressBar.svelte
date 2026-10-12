<script lang="ts">
	let {
		value,
		onSeek,
		onPreview,
		step = 0.02,
		live = false,
		height = 4,
		fillColor = 'var(--color-ink-3)'
	}: {
		value: number;
		onSeek: (ratio: number) => void;
		// Called with the pointer position while dragging, then with null once
		// the drag ends. Unused when `live`, where every move calls `onSeek`.
		onPreview?: (ratio: number | null) => void;
		step?: number;
		live?: boolean;
		height?: number;
		fillColor?: string;
	} = $props();

	let dragging = $state(false);

	function ratioAt(e: PointerEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
	}

	function dragTo(e: PointerEvent) {
		if (live) onSeek(ratioAt(e));
		else onPreview?.(ratioAt(e));
	}

	function startDrag(e: PointerEvent) {
		if (e.button !== 0) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		dragging = true;
		dragTo(e);
	}

	function moveDrag(e: PointerEvent) {
		if (dragging) dragTo(e);
	}

	function endDrag(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		onSeek(ratioAt(e));
		onPreview?.(null);
	}

	function cancelDrag() {
		dragging = false;
		onPreview?.(null);
	}

	function seekFromKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') onSeek(value + step);
		else if (e.key === 'ArrowLeft') onSeek(value - step);
	}
</script>

<div
	role="slider"
	tabindex="0"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(value * 100)}
	onpointerdown={startDrag}
	onpointermove={moveDrag}
	onpointerup={endDrag}
	onpointercancel={cancelDrag}
	onkeydown={seekFromKey}
	class="group flex h-4 flex-1 cursor-pointer touch-none items-center"
>
	<div class="relative w-full rounded-full bg-white/15" style="height:{height}px">
		<div
			class="absolute top-0 left-0 h-full rounded-full"
			style="width:{value * 100}%; background:{fillColor}"
		></div>
		<div
			class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full {dragging
				? 'opacity-100'
				: 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}"
			style="left:{value * 100}%; background:{fillColor}"
		></div>
	</div>
</div>
