<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
</script>

<div
	class="hidden w-[260px] flex-shrink-0 flex-col gap-[22px] border-r border-white/6 px-4 py-5 lg:flex"
>
	<div class="flex flex-col gap-0.5">
		<button
			onclick={() => player.goHome()}
			class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-bold"
			class:text-ink={player.screen === 'home'}
			class:text-ink-dim={player.screen !== 'home'}
		>
			<span
				class="h-1.5 w-1.5 rounded-full"
				class:bg-accent={player.screen === 'home'}
				class:bg-transparent={player.screen !== 'home'}
			></span>
			Home
		</button>
		<button
			onclick={() => player.goSearch()}
			class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-bold"
			class:text-ink={player.screen === 'search'}
			class:text-ink-dim={player.screen !== 'search'}
		>
			<span
				class="h-1.5 w-1.5 rounded-full"
				class:bg-accent={player.screen === 'search'}
				class:bg-transparent={player.screen !== 'search'}
			></span>
			Search
		</button>
	</div>

	<div class="flex min-h-0 flex-col gap-2.5 overflow-hidden">
		<div class="flex items-center justify-between px-2.5">
			<span class="text-[11px] font-bold tracking-[1.5px] text-ink-faint">PLAYLISTS</span>
		</div>
		<div class="flex flex-col gap-0.5 overflow-y-auto">
			{#each player.playlists as pl (pl.id)}
				<button
					onclick={() => player.selectPlaylist(pl.id)}
					class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left"
					style={player.activePlaylistId === pl.id && player.screen === 'playlist'
						? 'background: rgba(255,255,255,0.06)'
						: ''}
				>
					<Cover hue={pl.hue} size={34} />
					<span
						class="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-ink-2"
						>{pl.name}</span
					>
				</button>
			{/each}
		</div>
	</div>
</div>
