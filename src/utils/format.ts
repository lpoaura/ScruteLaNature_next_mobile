export function formatDuration(minutes: number | string | null | undefined): string {
  if (minutes == null) return '?';
  const mins = Number(minutes);
  if (isNaN(mins)) return '?';
  
  if (mins < 60) return `${mins} min`;
  
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h${remainingMins.toString().padStart(2, '0')}`;
}
