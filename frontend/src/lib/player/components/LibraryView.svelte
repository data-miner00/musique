<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
</script>

<div class="flex flex-col gap-5">
	<div class="text-[22px] font-extrabold text-ink">Your Library</div>
	<div class="flex flex-col gap-2.5">
		{#each player.playlists as pl (pl.id)}
			<button
				onclick={() => player.selectPlaylist(pl.id)}
				class="flex items-center gap-3.5 rounded-[10px] px-2.5 py-2.5 text-left"
				style="background: rgba(255,255,255,0.045)"
			>
				<Cover hue={pl.hue} size={52} />
				<span class="text-sm font-bold text-ink-2">{pl.name}</span>
			</button>
		{/each}
	</div>
</div>
