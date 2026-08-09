<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import ProgressBar from './ProgressBar.svelte';

	let bg1 = $derived(`oklch(24% 0.06 ${player.currentTrack.hue})`);
	let mobilePanel = $derived<'lyrics' | 'queue' | null>(
		player.showLyrics ? 'lyrics' : player.showQueue ? 'queue' : null
	);
</script>

<div
	class="fixed inset-0 z-50 flex flex-col items-center p-6 lg:p-9"
	style="background: linear-gradient(160deg, {bg1}, oklch(9% 0.01 260) 68%)"
>
	<div class="mb-5 flex w-full max-w-[1360px] flex-shrink-0 items-center justify-between">
		<button
			onclick={() => player.closeNowPlaying()}
			class="flex items-center gap-2 text-[13px] font-semibold text-ink-3"
			aria-label="Minimize now playing"
		>
			<Icon name="chevron-down" size={20} />
			<span class="hidden lg:inline">Minimize</span>
		</button>
		<span class="hidden text-[11px] font-bold tracking-[1.5px] text-ink-dim lg:inline"
			>NOW PLAYING</span
		>
		<span class="text-[10px] font-bold tracking-[1.5px] text-ink-dim lg:hidden"
			>{player.activePlaylist.name}</span
		>
		<div class="flex items-center gap-4">
			<button onclick={() => player.toggleLyrics()} aria-label="Toggle lyrics">
				<Icon name="lyrics" size={18} class={player.showLyrics ? 'text-accent' : 'text-ink-dim'} />
			</button>
			<button onclick={() => player.toggleQueue()} aria-label="Toggle queue">
				<Icon name="queue" size={18} class={player.showQueue ? 'text-accent' : 'text-ink-dim'} />
			</button>
		</div>
	</div>

	<div
		class="flex w-full max-w-[1360px] flex-1 flex-col items-center justify-center gap-7 overflow-y-auto lg:flex-row lg:items-center lg:gap-14 lg:overflow-visible"
	>
		<div class="flex w-full max-w-[420px] flex-shrink-0 flex-col items-center gap-6">
			{#if mobilePanel === null}
				<Cover
					hue={player.currentTrack.hue}
					size="clamp(220px, 55vw, 380px)"
					class="shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
				/>
				<div class="flex h-[26px] items-end gap-[3px]">
					{#each player.visualizerBars as h, i (i)}
						<div
							class="w-[3px] rounded-sm bg-accent transition-[height] duration-300"
							style="height:{h}%; opacity:{player.isPlaying ? 1 : 0.25}"
						></div>
					{/each}
				</div>
			{:else if mobilePanel === 'lyrics'}
				<div class="flex max-h-[42vh] w-full flex-col gap-3.5 overflow-y-auto py-2 lg:hidden">
					{#each player.lyrics as line, i (i)}
						<span
							class="text-[17px] leading-[1.4] font-bold"
							style="color: {i === player.activeLyricIndex
								? 'var(--color-ink)'
								: 'oklch(45% 0.01 260)'}">{line}</span
						>
					{/each}
				</div>
			{:else}
				<div class="flex max-h-[42vh] w-full flex-col gap-1 overflow-y-auto py-2 lg:hidden">
					{#each player.tracks as t (t.id)}
						<button
							onclick={() => player.playTrack(t.id)}
							class="flex items-center gap-3 rounded-lg p-2 text-left"
						>
							<Cover hue={t.hue} size={40} />
							<div class="flex min-w-0 flex-col">
								<span
									class="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap"
									style={t.id === player.currentTrackId
										? 'color: var(--color-accent)'
										: 'color: var(--color-ink-3)'}>{t.title}</span
								>
								<span class="text-xs text-ink-dimmer">{t.artist}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<div class="text-center">
				<div class="text-2xl font-extrabold text-ink lg:text-[28px]">
					{player.currentTrack.title}
				</div>
				<div class="mt-1.5 text-[15px] text-ink-dim">{player.currentTrack.artist}</div>
			</div>

			<div class="flex w-full items-center gap-2.5">
				<span class="w-8 text-right text-[11px] text-ink-dimmer">{player.elapsedLabel}</span>
				<ProgressBar
					value={player.progress}
					onSeek={(r) => player.seek(r)}
					height={5}
					fillColor="var(--color-accent)"
				/>
				<span class="w-8 text-[11px] text-ink-dimmer">{player.currentTrack.duration}</span>
			</div>

			<div class="flex items-center gap-6.5">
				<button onclick={() => player.toggleShuffle()} aria-label="Shuffle">
					<Icon
						name="shuffle"
						size={18}
						class={player.shuffleOn ? 'text-accent' : 'text-ink-dim'}
					/>
				</button>
				<button onclick={() => player.prevTrack()} aria-label="Previous track">
					<Icon name="prev" size={20} class="text-ink-3" />
				</button>
				<button
					onclick={() => player.togglePlay()}
					class="flex h-13 w-13 items-center justify-center rounded-full bg-accent lg:h-[52px] lg:w-[52px]"
					aria-label={player.isPlaying ? 'Pause' : 'Play'}
				>
					<Icon name={player.isPlaying ? 'pause' : 'play'} size={20} class="text-panel-2" />
				</button>
				<button onclick={() => player.nextTrack()} aria-label="Next track">
					<Icon name="next" size={20} class="text-ink-3" />
				</button>
				<button onclick={() => player.toggleRepeat()} aria-label="Repeat">
					<Icon name="repeat" size={18} class={player.repeatOn ? 'text-accent' : 'text-ink-dim'} />
				</button>
			</div>
		</div>

		{#if player.showLyrics}
			<div class="hidden max-h-[520px] w-[360px] flex-col gap-4.5 overflow-y-auto p-2 lg:flex">
				<span class="text-xs font-bold tracking-wide text-ink-dimmer">LYRICS</span>
				{#each player.lyrics as line, i (i)}
					<span
						class="text-[19px] leading-[1.4] font-bold"
						style="color: {i === player.activeLyricIndex
							? 'var(--color-ink)'
							: 'oklch(45% 0.01 260)'}">{line}</span
					>
				{/each}
			</div>
		{:else if player.showQueue}
			<div class="hidden max-h-[520px] w-[320px] flex-col gap-1 overflow-y-auto p-2 lg:flex">
				<span class="mb-2.5 text-xs font-bold tracking-wide text-ink-dimmer">NEXT UP</span>
				{#each player.tracks as t (t.id)}
					<button
						onclick={() => player.playTrack(t.id)}
						class="flex items-center gap-3 rounded-lg p-2 text-left"
					>
						<Cover hue={t.hue} size={40} />
						<div class="flex min-w-0 flex-col">
							<span
								class="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap"
								style={t.id === player.currentTrackId
									? 'color: var(--color-accent)'
									: 'color: var(--color-ink-3)'}>{t.title}</span
							>
							<span class="text-xs text-ink-dimmer">{t.artist}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
