<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
</script>

<div
	role="button"
	tabindex="0"
	onclick={() => player.goNowPlaying()}
	onkeydown={(e) => e.key === 'Enter' && player.goNowPlaying()}
	class="mx-3 mb-2 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-xl bg-white/7 px-2.5 py-2 text-left lg:hidden"
>
	<Cover hue={player.currentTrack.hue} size={40} />
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="overflow-hidden text-[13px] font-bold text-ellipsis whitespace-nowrap text-ink-2"
			>{player.currentTrack.title}</span
		>
		<span class="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-dimmer"
			>{player.currentTrack.artist}</span
		>
	</div>
	<button
		onclick={(e) => {
			e.stopPropagation();
			player.togglePlay();
		}}
		class="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-ink"
		aria-label={player.isPlaying ? 'Pause' : 'Play'}
	>
		<Icon name={player.isPlaying ? 'pause' : 'play'} size={14} class="text-panel-2" />
	</button>
</div>
