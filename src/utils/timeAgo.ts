const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function timeAgo(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
    if (diff < 28 * 86400) return `${Math.floor(diff / (7 * 86400))}w`;
    const month = MONTHS[date.getMonth()];
    if (date.getFullYear() !== new Date().getFullYear()) {
      return `${month} ${date.getFullYear()}`;
    }
    return `${month} ${date.getDate()}`;
  } catch { return ''; }
}
