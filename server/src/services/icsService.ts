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

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

export function generateIcs(projectTitle: string, items: CalendarItem[]) {
  const rows: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GuideForge//MVP//EN', 'CALSCALE:GREGORIAN'];

  for (const item of items) {
    const start = new Date(`${item.start_date}T${item.start_time ?? '09:00'}:00Z`);
    const end = new Date(start.getTime() + (item.duration_minutes ?? 30) * 60_000);
    rows.push('BEGIN:VEVENT');
    rows.push(`UID:${crypto.randomUUID()}@guideforge.local`);
    rows.push(`DTSTAMP:${fmt(new Date())}`);
    rows.push(`DTSTART:${fmt(start)}`);
    rows.push(`DTEND:${fmt(end)}`);
    rows.push(`SUMMARY:${item.title}`);
    if (item.description) rows.push(`DESCRIPTION:${item.description.replace(/\n/g, '\\n')}`);

    if (item.recurrence_type && item.recurrence_type !== 'none') {
      const freq = item.recurrence_type.toUpperCase();
      let rule = `RRULE:FREQ=${freq}`;
      if (item.recurrence_count) rule += `;COUNT=${item.recurrence_count}`;
      if (item.recurrence_end_date) rule += `;UNTIL=${item.recurrence_end_date.replace(/-/g, '')}T235959Z`;
      if (item.recurrence_type === 'weekly' && item.weekdays_json) {
        const weekdays = JSON.parse(item.weekdays_json).join(',');
        if (weekdays) rule += `;BYDAY=${weekdays}`;
      }
      rows.push(rule);
    }

    if (item.reminder_minutes) {
      rows.push('BEGIN:VALARM');
      rows.push(`TRIGGER:-PT${item.reminder_minutes}M`);
      rows.push('ACTION:DISPLAY');
      rows.push(`DESCRIPTION:Reminder: ${item.title}`);
      rows.push('END:VALARM');
    }
    rows.push('END:VEVENT');
  }

  rows.push('END:VCALENDAR');
  return rows.join('\r\n');
}
