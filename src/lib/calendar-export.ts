export interface ScheduledPlan {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_cuisine?: string;
  activity_name: string;
  activity_address?: string;
  activity_category?: string;
  confirmation_numbers?: {
    restaurant?: string;
    activity?: string;
  };
}

export function generateICSFile(plan: ScheduledPlan): string {
  // Parse date without timezone issues
  const [year, month, day] = plan.scheduled_date.split('-').map(Number);
  const [hours, minutes] = plan.scheduled_time.split(':').map(Number);
  const dateTime = new Date(year, month - 1, day, hours, minutes);
  
  // Format date for ICS as UTC (YYYYMMDDTHHMMSSZ)
  const formatICSDateUTC = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startTime = formatICSDateUTC(dateTime);
  
  // Add 4 hours for duration (dinner + activity + travel)
  const endDate = new Date(dateTime.getTime() + 4 * 60 * 60 * 1000);
  const endTime = formatICSDateUTC(endDate);

  // Build description
  let description = `Tonight's Plan\\n\\n`;
  description += `🍽️ Dinner: ${plan.restaurant_name}`;
  if (plan.restaurant_cuisine) description += ` (${plan.restaurant_cuisine})`;
  if (plan.restaurant_address) description += `\\n   ${plan.restaurant_address}`;
  if (plan.confirmation_numbers?.restaurant) {
    description += `\\n   Confirmation: ${plan.confirmation_numbers.restaurant}`;
  }
  
  description += `\\n\\n🎭 Activity: ${plan.activity_name}`;
  if (plan.activity_category) description += ` (${plan.activity_category})`;
  if (plan.activity_address) description += `\\n   ${plan.activity_address}`;
  if (plan.confirmation_numbers?.activity) {
    description += `\\n   Confirmation: ${plan.confirmation_numbers.activity}`;
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Andate//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${plan.id}@andate.app`,
    `DTSTAMP:${formatICSDateUTC(new Date())}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${plan.restaurant_name} + ${plan.activity_name}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${plan.restaurant_address || plan.restaurant_name}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Plans tomorrow!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Plans in 2 hours!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
