export function convertBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (!bytes || bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

export function shortAddr(addr) {
  if (!addr) return '0x0000…0000';
  return addr.substring(0, 6) + '…' + addr.substring(38, 42);
}

export function formatTime(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString();
}

export function getFileIcon(type) {
  if (!type) return '📄';
  if (type.startsWith('image/'))      return '🖼️';
  if (type.startsWith('video/'))      return '🎬';
  if (type.startsWith('audio/'))      return '🎵';
  if (type === 'application/pdf')     return '📑';
  if (type.startsWith('text/'))       return '📝';
  if (type.includes('zip') || type.includes('tar')) return '🗜️';
  return '📦';
}
