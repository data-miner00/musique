<script lang="ts">
	import HomeView from '$lib/player/components/HomeView.svelte';
	import LibraryView from '$lib/player/components/LibraryView.svelte';
	import MobileMiniPlayer from '$lib/player/components/MobileMiniPlayer.svelte';
	import MobileNav from '$lib/player/components/MobileNav.svelte';
	import NowPlayingBar from '$lib/player/components/NowPlayingBar.svelte';
	import NowPlayingOverlay from '$lib/player/components/NowPlayingOverlay.svelte';
	import PlaylistView from '$lib/player/components/PlaylistView.svelte';
	import SearchView from '$lib/player/components/SearchView.svelte';
	import Sidebar from '$lib/player/components/Sidebar.svelte';
	import { player } from '$lib/player/store.svelte';
</script>

<div
	class="flex h-screen flex-col"
	style="background:
		radial-gradient(ellipse 1200px 700px at 15% -10%, oklch(26% 0.06 300 / 0.55), transparent 60%),
		radial-gradient(ellipse 1000px 600px at 100% 0%, oklch(24% 0.07 85 / 0.35), transparent 55%),
		var(--color-app-bg);"
>
	<div class="flex flex-shrink-0 items-center gap-3.5 px-5 pt-5 pb-3 lg:px-8">
		<span class="text-[15px] font-extrabold tracking-[3px] text-ink-2">MUSIQUE</span>
	</div>

	<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
		<Sidebar />

		<div class="min-w-0 flex-1 overflow-y-auto px-5 pt-1 pb-4 lg:px-8 lg:pt-2 lg:pb-10">
			{#if player.screen === 'search'}
				<SearchView />
			{:else if player.screen === 'library'}
				<LibraryView />
			{:else if player.screen === 'playlist'}
				<PlaylistView />
			{:else}
				<HomeView />
			{/if}
		</div>
	</div>

	<MobileMiniPlayer />
	<NowPlayingBar />
	<MobileNav />
</div>

{#if player.nowPlayingOpen}
	<NowPlayingOverlay />
{/if}
