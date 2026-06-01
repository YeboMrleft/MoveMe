export const formatScheduledTime = (ts: number): string => {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const time = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Tomorrow at ${time}`;
  const dayLabel = date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayLabel} at ${time}`;
};

export const isScheduledInFuture = (when: 'now' | number): boolean =>
  when !== 'now' && (when as number) > Date.now();
