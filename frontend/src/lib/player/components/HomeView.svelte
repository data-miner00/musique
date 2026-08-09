<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
</script>

<div class="flex flex-col gap-7">
	<div class="text-[22px] font-extrabold text-ink lg:text-[26px]">Good evening</div>

	<!-- Mobile: single list -->
	<div class="flex flex-col gap-2.5 lg:hidden">
		{#each player.playlists as pl (pl.id)}
			<button
				onclick={() => player.selectPlaylist(pl.id)}
				class="flex items-center gap-3.5 rounded-[10px] px-2.5 py-2.5 text-left"
				style="background: rgba(255,255,255,0.045)"
			>
				<Cover hue={pl.hue} size={52} />
				<div class="flex flex-col">
					<span class="text-sm font-bold text-ink-2">{pl.name}</span>
					<span class="text-xs text-ink-dim">{pl.desc}</span>
				</div>
			</button>
		{/each}
	</div>

	<!-- Desktop: sectioned grid + rail -->
	<div class="hidden lg:block">
		<div class="mb-3.5 text-base font-bold text-ink-2">Jump back in</div>
		<div class="grid grid-cols-3 gap-3.5">
			{#each player.playlists as pl (pl.id)}
				<button
					onclick={() => player.selectPlaylist(pl.id)}
					class="flex items-center gap-3.5 rounded-lg bg-white/4 p-2 text-left"
				>
					<Cover hue={pl.hue} size={56} />
					<span class="text-sm font-bold text-ink-2">{pl.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="hidden lg:block">
		<div class="mb-3.5 text-base font-bold text-ink-2">Made for you</div>
		<div class="flex gap-[18px] overflow-x-auto pb-2">
			{#each player.playlists as pl (pl.id)}
				<button
					onclick={() => player.selectPlaylist(pl.id)}
					class="flex w-[150px] flex-shrink-0 flex-col gap-2.5 text-left"
				>
					<Cover hue={pl.hue} size={150} />
					<div class="text-[13px] font-bold text-ink-3">{pl.name}</div>
					<div class="text-[11px] text-ink-faint">{pl.desc}</div>
				</button>
			{/each}
		</div>
	</div>
</div>
