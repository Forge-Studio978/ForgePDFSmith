import crypto from 'node:crypto';

export type CalendarItem = {
  title: string;
  description?: string;
  start_date: string;
  start_time?: string;
  duration_minutes?: number;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string;
  recurrence_count?: number;
  weekdays_json?: string;
  reminder_minutes?: number;
};

const safeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;').trim();
const pad = (n: number) => String(n).padStart(2, '0');
const toIcsUtc = (date: Date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

function parseDateTime(startDate: string, startTime?: string) {
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const time = startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : '09:00';
  if (!dateMatch) return null;
  const dt = new Date(`${startDate}T${time}:00Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function generateIcs(projectTitle: string, items: CalendarItem[]) {
  const rows: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GuideForge//MVP//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${safeText(projectTitle || 'GuideForge Plan')}`];

  for (const item of items) {
    if (!item.title?.trim() || !item.start_date) continue;
    const start = parseDateTime(item.start_date, item.start_time);
    if (!start) continue;

    const duration = Math.max(1, Math.min(24 * 60, Number(item.duration_minutes ?? 30)));
    const end = new Date(start.getTime() + duration * 60_000);

    rows.push('BEGIN:VEVENT');
    rows.push(`UID:${crypto.randomUUID()}@guideforge.local`);
    rows.push(`DTSTAMP:${toIcsUtc(new Date())}`);
    rows.push(`DTSTART:${toIcsUtc(start)}`);
    rows.push(`DTEND:${toIcsUtc(end)}`);
    rows.push(`SUMMARY:${safeText(item.title)}`);
    if (item.description?.trim()) rows.push(`DESCRIPTION:${safeText(item.description)}`);

    if (item.recurrence_type && item.recurrence_type !== 'none') {
      const freq = item.recurrence_type.toUpperCase();
      const parts = [`FREQ=${freq}`];
      if (item.recurrence_count && item.recurrence_count > 0) parts.push(`COUNT=${item.recurrence_count}`);
      if (item.recurrence_end_date && /^\d{4}-\d{2}-\d{2}$/.test(item.recurrence_end_date)) parts.push(`UNTIL=${item.recurrence_end_date.replace(/-/g, '')}T235959Z`);
      if (item.recurrence_type === 'weekly' && item.weekdays_json) {
        try {
          const allowed = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
          const weekdays = JSON.parse(item.weekdays_json).filter((x: string) => allowed.has(x));
          if (weekdays.length) parts.push(`BYDAY=${weekdays.join(',')}`);
        } catch {
          // ignore malformed weekdays
        }
      }
      rows.push(`RRULE:${parts.join(';')}`);
    }

    if (item.reminder_minutes && item.reminder_minutes > 0) {
      rows.push('BEGIN:VALARM');
      rows.push(`TRIGGER:-PT${Math.min(10080, item.reminder_minutes)}M`);
      rows.push('ACTION:DISPLAY');
      rows.push(`DESCRIPTION:${safeText(`Reminder: ${item.title}`)}`);
      rows.push('END:VALARM');
    }

    rows.push('END:VEVENT');
  }

  rows.push('END:VCALENDAR');
  return rows.join('\r\n');
}
