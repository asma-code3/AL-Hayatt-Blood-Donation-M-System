export const nextSequenceId = (items = [], key, prefix, start = 1001) => {
  if (items.length === 0) {
    return `${prefix}-${start}`;
  }

  const maxValue = items.reduce((max, item) => {
    const raw = item[key] || '';
    const numeric = Number(String(raw).split('-')[1] || 0);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, start - 1);

  return `${prefix}-${maxValue + 1}`;
};

export const nextNumericId = (items = []) =>
  items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

export const nextModelNumericId = async (Model) => {
  const latest = await Model.findOne().sort({ id: -1 }).select({ id: 1, _id: 0 }).lean();
  return Number(latest?.id || 0) + 1;
};

export const nextModelSequenceId = async (Model, key, prefix, start = 1001) => {
  const latest = await Model.findOne().sort({ id: -1 }).select({ [key]: 1, _id: 0 }).lean();
  const numeric = Number(String(latest?.[key] || '').split('-')[1] || start - 1);
  return `${prefix}-${numeric + 1}`;
};
