export function generateICS(event: {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  referenceCode: string;
}): string {
  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ResidenceHub//Reservation//EN",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}\\nRef: ${event.referenceCode}`,
    `LOCATION:${event.location}`,
    `UID:${event.referenceCode}@residencehub`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
