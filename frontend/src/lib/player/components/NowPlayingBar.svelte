<script lang="ts">
	import { player } from '../store.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import { formatTime } from '../format';
</script>

<div
	class="hidden h-[92px] flex-shrink-0 grid-cols-[280px_1fr_280px] items-center border-t border-white/7 bg-panel-2 px-5 lg:grid"
>
	<div class="flex min-w-0 items-center gap-3">
		<Cover hue={player.currentTrack.hue} size={56} />
		<div class="flex min-w-0 flex-col">
			<span class="overflow-hidden text-[13px] font-bold text-ellipsis whitespace-nowrap text-ink-2"
				>{player.currentTrack.title}</span
			>
			<span class="text-xs text-ink-dimmer">{player.currentTrack.artist}</span>
		</div>
		<button
			onclick={() => player.toggleLike(player.currentTrack.id)}
			class="flex-shrink-0 p-1"
			aria-label={player.isLiked(player.currentTrack.id) ? 'Unlike' : 'Like'}
		>
			<Icon
				name={player.isLiked(player.currentTrack.id) ? 'heart-filled' : 'heart'}
				size={15}
				class={player.isLiked(player.currentTrack.id) ? 'text-rose-400' : 'text-ink-dim'}
			/>
		</button>
	</div>

	<div class="flex w-full flex-col items-center gap-2">
		<div class="flex items-center gap-5">
			<button onclick={() => player.toggleShuffle()} aria-label="Shuffle">
				<Icon name="shuffle" size={18} class={player.shuffleOn ? 'text-accent' : 'text-ink-dim'} />
			</button>
			<button onclick={() => player.prevTrack()} aria-label="Previous track">
				<Icon name="prev" size={20} class="text-ink-3" />
			</button>
			<button
				onclick={() => player.togglePlay()}
				class="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ink"
				aria-label={player.isPlaying ? 'Pause' : 'Play'}
			>
				<Icon name={player.isPlaying ? 'pause' : 'play'} size={16} class="text-panel-2" />
			</button>
			<button onclick={() => player.nextTrack()} aria-label="Next track">
				<Icon name="next" size={20} class="text-ink-3" />
			</button>
			<button onclick={() => player.toggleRepeat()} aria-label="Repeat">
				<Icon name="repeat" size={18} class={player.repeatOn ? 'text-accent' : 'text-ink-dim'} />
			</button>
		</div>
		<div class="flex w-full max-w-[520px] items-center gap-2">
			<span class="w-8 text-right text-[11px] text-ink-dimmer">{player.elapsedLabel}</span>
			<ProgressBar
				value={player.progress}
				onSeek={(r) => player.seek(r)}
				fillColor="var(--color-ink-3)"
			/>
			<span class="w-8 text-[11px] text-ink-dimmer"
				>{formatTime(player.currentTrack.durationSec)}</span
			>
		</div>
	</div>

	<div class="flex items-center justify-end gap-4">
		<button onclick={() => player.toggleLyrics()} class="p-1" aria-label="Toggle lyrics">
			<Icon name="lyrics" size={18} class={player.showLyrics ? 'text-accent' : 'text-ink-dim'} />
		</button>
		<button onclick={() => player.toggleQueue()} class="p-1" aria-label="Toggle queue">
			<Icon name="queue" size={18} class={player.showQueue ? 'text-accent' : 'text-ink-dim'} />
		</button>
		<div class="flex w-[110px] items-center gap-1.5">
			<Icon name="volume" size={16} class="text-ink-dim" />
			<ProgressBar
				value={player.volume}
				onSeek={(r) => player.setVolume(r)}
				fillColor="var(--color-ink-3)"
			/>
		</div>
		<button onclick={() => player.goNowPlaying()} aria-label="Open full now playing view">
			<Icon name="expand" size={16} class="text-ink-3" />
		</button>
	</div>
</div>
