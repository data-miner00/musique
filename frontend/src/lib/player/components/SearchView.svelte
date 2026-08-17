<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import { formatTime } from '../format';
</script>

<div class="flex flex-col gap-5">
	<div class="text-[22px] font-extrabold text-ink lg:text-[26px]">Search</div>
	<div class="flex max-w-[420px] items-center gap-2.5 rounded-[10px] bg-white/6 px-4 py-3">
		<Icon name="search" size={16} class="text-ink-faint" />
		<input
			type="text"
			bind:value={player.searchQuery}
			placeholder="Songs, artists, albums..."
			class="w-full bg-transparent text-sm text-ink-2 placeholder:text-ink-dimmer focus:outline-none"
		/>
	</div>

	{#if player.searchQuery.trim() === ''}
		<div class="text-[13px] text-ink-faint">Start typing to search your library.</div>
	{:else if player.searchResults.length === 0}
		<div class="text-[13px] text-ink-faint">No matches for "{player.searchQuery}".</div>
	{:else}
		<div class="flex flex-col gap-0.5">
			{#each player.searchResults as t (t.id)}
				<div
					onclick={() => player.playTrack(t.id)}
					onkeydown={(e) => e.key === 'Enter' && player.playTrack(t.id)}
					role="button"
					tabindex="0"
					class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-white/5"
				>
					<Cover hue={t.hue} size={42} />
					<div class="flex min-w-0 flex-1 flex-col">
						<span
							class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap"
							style={t.id === player.currentTrackId
								? 'color: var(--color-accent)'
								: 'color: var(--color-ink-3)'}>{t.title}</span
						>
						<span class="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-ink-dimmer"
							>{t.artist} &middot; {t.album}</span
						>
					</div>
					<span class="flex-shrink-0 text-xs text-ink-dimmer">{formatTime(t.durationSec)}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
