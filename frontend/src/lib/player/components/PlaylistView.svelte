<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import { formatTime } from '../format';
</script>

<div class="flex flex-col gap-6">
	<div
		class="flex flex-col items-center gap-3.5 text-center lg:flex-row lg:items-end lg:gap-6 lg:text-left"
	>
		<Cover hue={player.activePlaylist.hue} size="clamp(170px, 40vw, 190px)" />
		<div class="flex flex-col gap-2.5 lg:gap-2.5">
			<span class="hidden text-xs font-bold tracking-[1px] text-ink-dim lg:block">PLAYLIST</span>
			<span class="text-2xl leading-[1.05] font-extrabold text-ink lg:text-[40px]"
				>{player.activePlaylist.name}</span
			>
			<span class="text-[13px] text-ink-dim">{player.activePlaylist.desc}</span>
		</div>
	</div>

	<button
		onclick={() => player.togglePlay()}
		class="mx-auto flex h-13 w-13 items-center justify-center self-center rounded-full bg-accent lg:mx-0 lg:h-14 lg:w-14 lg:self-start"
		aria-label={player.isPlaying ? 'Pause' : 'Play'}
	>
		<Icon name={player.isPlaying ? 'pause' : 'play'} size={18} class="text-panel-2" />
	</button>

	<!-- Mobile track list -->
	<div class="flex flex-col gap-0.5 lg:hidden">
		{#each player.tracks as t (t.id)}
			<div
				onclick={() => player.playTrack(t.id)}
				onkeydown={(e) => e.key === 'Enter' && player.playTrack(t.id)}
				role="button"
				tabindex="0"
				class="flex cursor-pointer items-center gap-3 px-1 py-2.5"
			>
				<Cover hue={t.hue} size={42} />
				<div class="flex min-w-0 flex-1 flex-col">
					<span
						class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap"
						style={t.id === player.currentTrackId
							? 'color: var(--color-accent)'
							: 'color: var(--color-ink-3)'}>{t.title}</span
					>
					<span class="text-xs text-ink-dimmer">{t.artist}</span>
				</div>
				<button
					onclick={(e) => {
						e.stopPropagation();
						player.toggleLike(t.id);
					}}
					class="p-1"
					aria-label={player.isLiked(t.id) ? 'Unlike' : 'Like'}
				>
					<Icon
						name={player.isLiked(t.id) ? 'heart-filled' : 'heart'}
						size={14}
						class={player.isLiked(t.id) ? 'text-rose-400' : 'text-ink-dim'}
					/>
				</button>
			</div>
		{/each}
	</div>

	<!-- Desktop track table -->
	<div class="hidden lg:flex lg:flex-col">
		<div
			class="grid grid-cols-[28px_1fr_120px_60px_40px] gap-4 border-b border-white/8 px-3 py-2 text-[11px] font-bold tracking-[1px] text-ink-faint"
		>
			<span>#</span><span>TITLE</span><span>ALBUM</span><span>TIME</span><span></span>
		</div>
		{#each player.tracks as t, i (t.id)}
			<div
				onclick={() => player.playTrack(t.id)}
				onkeydown={(e) => e.key === 'Enter' && player.playTrack(t.id)}
				role="button"
				tabindex="0"
				class="group grid cursor-pointer grid-cols-[28px_1fr_120px_60px_40px] items-center gap-4 rounded-md px-3 py-2.5 hover:bg-white/5"
			>
				<span
					class="text-[13px]"
					style={t.id === player.currentTrackId
						? 'color: var(--color-accent)'
						: 'color: var(--color-ink-dimmer)'}>{i + 1}</span
				>
				<div class="flex min-w-0 flex-col">
					<span
						class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap"
						style={t.id === player.currentTrackId
							? 'color: var(--color-accent)'
							: 'color: var(--color-ink-3)'}>{t.title}</span
					>
					<span class="text-xs text-ink-dimmer">{t.artist}</span>
				</div>
				<span class="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-ink-dimmer"
					>{t.album}</span
				>
				<span class="text-xs text-ink-dimmer">{formatTime(t.durationSec)}</span>
				<button
					onclick={(e) => {
						e.stopPropagation();
						player.toggleLike(t.id);
					}}
					class="justify-self-end p-1"
					aria-label={player.isLiked(t.id) ? 'Unlike' : 'Like'}
				>
					<Icon
						name={player.isLiked(t.id) ? 'heart-filled' : 'heart'}
						size={15}
						class={player.isLiked(t.id) ? 'text-rose-400' : 'text-ink-dim'}
					/>
				</button>
			</div>
		{/each}
	</div>
</div>
