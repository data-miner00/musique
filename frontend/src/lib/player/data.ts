import type { Playlist, Track } from './types';

export const PLAYLISTS: Playlist[] = [
	{ id: 'p1', name: 'Focus Flow', desc: 'Deep concentration', hue: 250 },
	{ id: 'p2', name: 'Midnight Drive', desc: 'Late night synths', hue: 300 },
	{ id: 'p3', name: 'Sunday Chill', desc: 'Slow & easy', hue: 85 },
	{ id: 'p4', name: 'Deep Work', desc: 'Instrumental focus', hue: 200 },
	{ id: 'p5', name: 'Retro Wave', desc: '80s inspired', hue: 340 },
	{ id: 'p6', name: 'Golden Hour', desc: 'Warm acoustic', hue: 40 }
];

const FOCUS_FLOW_TRACKS: Track[] = [
	{
		id: 't1',
		title: 'Glass Horizon',
		artist: 'Nova Ridge',
		album: 'Focus Flow',
		duration: '3:42',
		hue: 250
	},
	{
		id: 't2',
		title: 'Static Bloom',
		artist: 'Mira Lowe',
		album: 'Focus Flow',
		duration: '4:05',
		hue: 250
	},
	{
		id: 't3',
		title: 'Quiet Signal',
		artist: 'The Aftertone',
		album: 'Focus Flow',
		duration: '2:58',
		hue: 250
	},
	{
		id: 't4',
		title: 'Paper Cities',
		artist: 'Nova Ridge',
		album: 'Focus Flow',
		duration: '3:21',
		hue: 250
	},
	{
		id: 't5',
		title: 'Slow Current',
		artist: 'Reyes Vale',
		album: 'Focus Flow',
		duration: '3:56',
		hue: 250
	},
	{
		id: 't6',
		title: 'Amber Static',
		artist: 'Mira Lowe',
		album: 'Focus Flow',
		duration: '4:12',
		hue: 250
	},
	{
		id: 't7',
		title: 'Faded Frequencies',
		artist: 'The Aftertone',
		album: 'Focus Flow',
		duration: '3:08',
		hue: 250
	},
	{
		id: 't8',
		title: 'Room Tone',
		artist: 'Reyes Vale',
		album: 'Focus Flow',
		duration: '2:44',
		hue: 250
	}
];

export const TRACKS_BY_PLAYLIST: Record<string, Track[]> = {
	p1: FOCUS_FLOW_TRACKS,
	p2: FOCUS_FLOW_TRACKS,
	p3: FOCUS_FLOW_TRACKS,
	p4: FOCUS_FLOW_TRACKS,
	p5: FOCUS_FLOW_TRACKS,
	p6: FOCUS_FLOW_TRACKS
};

export const LYRICS: string[] = [
	'We were driving north',
	'past the empty signs',
	'counting all the miles',
	'we left behind',
	'Nothing but the static',
	'and the amber light',
	'holding onto nothing',
	'holding on tonight',
	'So play it slow',
	'let the silence go'
];
