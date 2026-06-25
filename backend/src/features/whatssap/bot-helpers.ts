export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function generateSlots(
  start: string,
  end: string,
  duration: number,
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  let current = timeToMin(start);
  const endMin = timeToMin(end);
  while (current + duration <= endMin) {
    slots.push({
      startTime: minToTime(current),
      endTime: minToTime(current + duration),
    });
    current += duration;
  }
  return slots;
}
