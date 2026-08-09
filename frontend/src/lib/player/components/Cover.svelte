<script lang="ts">
	let {
		hue,
		size,
		rounded = true,
		class: className = ''
	}: { hue: number; size: number | string; rounded?: boolean; class?: string } = $props();

	const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

	let radius = $derived(
		!rounded ? '0px' : typeof size === 'number' && size <= 100 ? '6px' : '16px'
	);
	let stripe = $derived(typeof size === 'number' ? Math.max(6, size / 10) : 14);
	let stripe2 = $derived(typeof size === 'number' ? Math.max(12, size / 5) : 28);
</script>

<div
	class="flex-shrink-0 {className}"
	style="
		width:{px(size)}; height:{px(size)}; border-radius:{radius};
		background: repeating-linear-gradient(135deg, oklch(32% 0.05 {hue}), oklch(32% 0.05 {hue}) {stripe}px, oklch(22% 0.04 {hue}) {stripe}px, oklch(22% 0.04 {hue}) {stripe2}px);
	"
></div>
