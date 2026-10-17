<script lang="ts">
	import { SHORTCUT_HELP } from '../shortcuts';
	import { player } from '../store.svelte';
	import Icon from './Icon.svelte';

	let closeButton = $state<HTMLButtonElement>();

	// Move focus into the dialog while it is open, and hand it back afterwards.
	$effect(() => {
		const previous = document.activeElement;
		closeButton?.focus();
		return () => {
			if (previous instanceof HTMLElement) previous.focus();
		};
	});
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-6">
	<button
		onclick={() => player.closeShortcuts()}
		class="absolute inset-0 cursor-default bg-black/60"
		aria-label="Close keyboard shortcuts"
		tabindex="-1"
	></button>
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
		class="relative max-h-full w-full max-w-[460px] overflow-y-auto rounded-2xl border border-white/8 bg-panel p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
	>
		<div class="flex items-center justify-between">
			<h2 id="shortcuts-title" class="text-base font-bold text-ink">Keyboard shortcuts</h2>
			<button
				bind:this={closeButton}
				onclick={() => player.closeShortcuts()}
				class="rounded-md p-1"
				aria-label="Close"
			>
				<Icon name="close" size={16} class="text-ink-dim" />
			</button>
		</div>
		{#each SHORTCUT_HELP as group (group.title)}
			<div class="mt-5 mb-1.5 text-[11px] font-bold tracking-[1px] text-ink-faint uppercase">
				{group.title}
			</div>
			{#each group.rows as row (row.label)}
				<div class="flex items-center justify-between gap-4 py-1.5">
					<span class="text-[13px] text-ink-3">{row.label}</span>
					<span class="flex flex-shrink-0 items-center gap-1.5">
						{#each row.keys as key, i (key)}
							{#if i > 0}<span class="text-xs text-ink-faint">/</span>{/if}
							<kbd
								class="rounded-md border border-white/12 bg-white/6 px-1.5 py-0.5 font-sans text-xs text-ink-2"
								>{key}</kbd
							>
						{/each}
					</span>
				</div>
			{/each}
		{/each}
	</div>
</div>
