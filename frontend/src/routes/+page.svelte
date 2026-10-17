<script lang="ts">
	import { tick } from 'svelte';
	import HomeView from '$lib/player/components/HomeView.svelte';
	import Icon from '$lib/player/components/Icon.svelte';
	import LibraryView from '$lib/player/components/LibraryView.svelte';
	import MobileMiniPlayer from '$lib/player/components/MobileMiniPlayer.svelte';
	import MobileNav from '$lib/player/components/MobileNav.svelte';
	import NowPlayingBar from '$lib/player/components/NowPlayingBar.svelte';
	import NowPlayingOverlay from '$lib/player/components/NowPlayingOverlay.svelte';
	import PlaylistView from '$lib/player/components/PlaylistView.svelte';
	import SearchView from '$lib/player/components/SearchView.svelte';
	import ShortcutsPanel from '$lib/player/components/ShortcutsPanel.svelte';
	import Sidebar from '$lib/player/components/Sidebar.svelte';
	import { connectMediaSession } from '$lib/player/media-session.svelte';
	import { shortcutFor, type ShortcutAction } from '$lib/player/shortcuts';
	import { player, SEEK_STEP_SEC, VOLUME_STEP } from '$lib/player/store.svelte';

	connectMediaSession(player);

	// A held key repeats; only these make sense repeated.
	const REPEATABLE: ShortcutAction[] = ['seekBack', 'seekForward', 'volumeUp', 'volumeDown'];

	async function focusSearch() {
		player.closeShortcuts();
		player.closeNowPlaying();
		player.goSearch();
		await tick();
		document.getElementById('search-input')?.focus();
	}

	const actions: Record<ShortcutAction, () => void> = {
		togglePlay: () => player.togglePlay(),
		seekBack: () => player.seekBy(-SEEK_STEP_SEC),
		seekForward: () => player.seekBy(SEEK_STEP_SEC),
		prevTrack: () => player.prevTrack(),
		nextTrack: () => player.nextTrack(),
		volumeUp: () => player.nudgeVolume(VOLUME_STEP),
		volumeDown: () => player.nudgeVolume(-VOLUME_STEP),
		toggleMute: () => player.toggleMute(),
		toggleShuffle: () => player.toggleShuffle(),
		cycleRepeat: () => player.cycleRepeat(),
		focusSearch: () => void focusSearch(),
		toggleHelp: () => player.toggleShortcuts(),
		escape: () => {
			if (player.showShortcuts) player.closeShortcuts();
			else player.closeNowPlaying();
		}
	};

	function onKeydown(e: KeyboardEvent) {
		const action = shortcutFor(e);
		if (!action) return;
		// Otherwise the key would also scroll the page, press the focused
		// button or open the browser's quick find.
		if (action !== 'escape') e.preventDefault();
		if (e.repeat && !REPEATABLE.includes(action)) return;
		actions[action]();
	}

	// A focused button is pressed by Space on key-up, so block that too.
	function onKeyup(e: KeyboardEvent) {
		if (shortcutFor(e) === 'togglePlay') e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

<div
	class="flex h-screen flex-col"
	style="background:
		radial-gradient(ellipse 1200px 700px at 15% -10%, oklch(26% 0.06 300 / 0.55), transparent 60%),
		radial-gradient(ellipse 1000px 600px at 100% 0%, oklch(24% 0.07 85 / 0.35), transparent 55%),
		var(--color-app-bg);"
>
	<div class="flex flex-shrink-0 items-center gap-3.5 px-5 pt-5 pb-3 lg:px-8">
		<span class="text-[15px] font-extrabold tracking-[3px] text-ink-2">MUSIQUE</span>
		<button
			onclick={() => player.toggleShortcuts()}
			class="ml-auto hidden p-1 lg:block"
			aria-label="Keyboard shortcuts"
		>
			<Icon name="keyboard" size={18} class="text-ink-dim" />
		</button>
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

{#if player.showShortcuts}
	<ShortcutsPanel />
{/if}
