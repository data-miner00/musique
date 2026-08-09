<script lang="ts">
	import { player } from '../store.svelte';
	import Icon from './Icon.svelte';
</script>

<div
	class="flex h-[76px] flex-shrink-0 items-center justify-around border-t border-white/7 pb-3.5 lg:hidden"
>
	<button
		onclick={() => player.goHome()}
		class="flex flex-col items-center gap-1.5"
		class:text-ink-2={player.screen === 'home'}
		class:text-ink-faint={player.screen !== 'home'}
	>
		<Icon name="home" size={22} />
		<span class="text-[10px] font-bold">Home</span>
	</button>
	<button
		onclick={() => player.goSearch()}
		class="flex flex-col items-center gap-1.5"
		class:text-ink-2={player.screen === 'search'}
		class:text-ink-faint={player.screen !== 'search'}
	>
		<Icon name="search" size={20} />
		<span class="text-[10px] font-bold">Search</span>
	</button>
	<button
		onclick={() => player.goLibrary()}
		class="flex flex-col items-center gap-1.5"
		class:text-ink-2={player.screen === 'library'}
		class:text-ink-faint={player.screen !== 'library'}
	>
		<Icon name="library" size={22} />
		<span class="text-[10px] font-bold">Library</span>
	</button>
</div>
