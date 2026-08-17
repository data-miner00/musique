export function formatTime(totalSeconds: number): string {
	const sec = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
	const minutes = Math.floor(sec / 60);
	const seconds = sec % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function hueForId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
}
