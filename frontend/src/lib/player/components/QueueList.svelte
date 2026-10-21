<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
</script>

{#if player.queueSource}
	<span class="mb-1.5 px-2 text-xs text-ink-dimmer">
		Playing from <span class="font-semibold text-ink-3">{player.queueSource.name}</span>
	</span>
{/if}
{#each player.upNext as t (t.id)}
	<button
		onclick={() => player.playFromQueue(t.id)}
		class="flex items-center gap-3 rounded-lg p-2 text-left"
	>
		<Cover hue={t.hue} size={40} />
		<div class="flex min-w-0 flex-col">
			<span
				class="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-ink-3"
				>{t.title}</span
			>
			<span class="text-xs text-ink-dimmer">{t.artist}</span>
		</div>
	</button>
{:else}
	<span class="px-2 py-1 text-[13px] text-ink-faint">Nothing up next.</span>
{/each}
