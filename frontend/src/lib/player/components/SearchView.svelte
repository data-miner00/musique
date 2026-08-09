<script lang="ts">
	import Icon from './Icon.svelte';
</script>

<div class="flex flex-col gap-5">
	<div class="text-[22px] font-extrabold text-ink lg:text-[26px]">Search</div>
	<div class="flex max-w-[420px] items-center gap-2.5 rounded-[10px] bg-white/6 px-4 py-3">
		<Icon name="search" size={16} class="text-ink-faint" />
		<span class="text-sm text-ink-dimmer">Songs, artists, playlists...</span>
	</div>
	<div class="text-[13px] text-ink-faint">
		Search isn't wired up yet — the library index lands in a later phase.
	</div>
</div>
