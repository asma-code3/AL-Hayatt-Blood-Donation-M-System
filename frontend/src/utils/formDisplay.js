export const formatTodayLabel = () =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

export const getNextSequenceId = (items = [], key, prefix, start = 1001) => {
  const maxValue = items.reduce((max, item) => {
    const raw = String(item?.[key] || '');
    const numeric = Number(raw.split('-')[1] || 0);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, start - 1);

  return `${prefix}-${maxValue + 1}`;
};

export const getPaddedReference = (count, prefix, start = 1) =>
  `${prefix}-${String(Math.max(count + start, start)).padStart(4, '0')}`;
