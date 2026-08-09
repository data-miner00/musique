<script lang="ts">
	export type IconName =
		| 'search'
		| 'expand'
		| 'chevron-down'
		| 'prev'
		| 'next'
		| 'volume'
		| 'shuffle'
		| 'repeat'
		| 'lyrics'
		| 'queue'
		| 'home'
		| 'library'
		| 'heart'
		| 'heart-filled'
		| 'play'
		| 'pause';

	let {
		name,
		size = 16,
		class: className = ''
	}: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	class={className}
	fill="none"
	aria-hidden="true"
>
	{#if name === 'search'}
		<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
		<path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	{:else if name === 'expand'}
		<path
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
		/>
	{:else if name === 'chevron-down'}
		<path
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M6 9l6 6 6-6"
		/>
	{:else if name === 'prev'}
		<path fill="currentColor" d="M6 6h2v12H6zM19 6l-9 6 9 6z" />
	{:else if name === 'next'}
		<path fill="currentColor" d="M16 6h2v12h-2zM5 6l9 6-9 6z" />
	{:else if name === 'volume'}
		<path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />
		<path
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			d="M16.5 8.5a5 5 0 010 7"
		/>
	{:else if name === 'shuffle'}
		<path
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M4 6h3l9 12h4M4 18h3l3-4M16 6h4M17 4v4h-4"
		/>
	{:else if name === 'repeat'}
		<path
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M4 8a4 4 0 014-4h11M19 5v4M20 16a4 4 0 01-4 4H5M5 19v-4"
		/>
	{:else if name === 'lyrics'}
		<path
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			d="M5 6h14M5 12h14M5 18h9"
		/>
	{:else if name === 'queue'}
		<path
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			d="M4 6h11M4 12h11M4 18h7"
		/>
		<path stroke="currentColor" stroke-width="1.8" d="M17 9l3 3-3 3" />
	{:else if name === 'home'}
		<path
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linejoin="round"
			d="M4 11l8-6 8 6v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"
		/>
	{:else if name === 'library'}
		<rect x="4" y="4" width="4" height="16" fill="currentColor" />
		<rect x="10" y="4" width="4" height="16" fill="currentColor" />
		<rect x="16" y="6" width="4" height="12" fill="currentColor" />
	{:else if name === 'heart'}
		<path
			stroke="currentColor"
			stroke-width="1.6"
			d="M12 21s-7.5-4.7-10-9.4C.5 8.1 2.4 4 6.4 4c2 0 3.6 1 5.6 3 2-2 3.6-3 5.6-3 4 0 5.9 4.1 4.4 7.6C19.5 16.3 12 21 12 21z"
		/>
	{:else if name === 'heart-filled'}
		<path
			fill="currentColor"
			d="M12 21s-7.5-4.7-10-9.4C.5 8.1 2.4 4 6.4 4c2 0 3.6 1 5.6 3 2-2 3.6-3 5.6-3 4 0 5.9 4.1 4.4 7.6C19.5 16.3 12 21 12 21z"
		/>
	{:else if name === 'play'}
		<path fill="currentColor" d="M8 5v14l11-7z" />
	{:else if name === 'pause'}
		<path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" />
	{/if}
</svg>
