/**
 * Parses various LPB date representations into standard ISO 8601 strings.
 */
export function normalizeLpbDate(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return new Date().toISOString();

  if (dateStr instanceof Date) {
    return dateStr.toISOString();
  }

  const str = String(dateStr).trim();

  // Pattern: "10/24/2026 10:53" or "10/24/2026 14:13:00"
  if (str.includes('/')) {
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const month = parseInt(dateParts[0], 10) - 1;
      const day = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);

      let hour = 0;
      let minute = 0;
      let second = 0;

      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10) || 0;
        minute = parseInt(timeParts[1], 10) || 0;
        second = parseInt(timeParts[2], 10) || 0;
      }

      // Check for AM/PM if present
      if (parts[2]) {
        const meridian = parts[2].toUpperCase();
        if (meridian === 'PM' && hour < 12) hour += 12;
        if (meridian === 'AM' && hour === 12) hour = 0;
      }

      const d = new Date(year, month, day, hour, minute, second);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // Fallback direct parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return new Date().toISOString();
}
