const COLLECTION_PREFIX = 'action_plans_v2_';
const LEGACY_UPDATED_PREFIX = 'ap_updated_';
const PERIOD_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const safeKpi = (kpiKey) => kpiKey || 'kpi';
const safeYear = (selectedYear) => selectedYear || 'Y26';
const collectionKey = (kpiKey, selectedYear) =>
  `${COLLECTION_PREFIX}${safeKpi(kpiKey)}_${safeYear(selectedYear)}`;

const readCollection = (kpiKey, selectedYear, storage) => {
  try {
    const parsed = JSON.parse(storage.getItem(collectionKey(kpiKey, selectedYear)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const sortPlans = (plans) => plans.sort((a, b) => {
  const periodDifference = PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period);
  if (periodDifference !== 0) return periodDifference;
  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
});

export const getActionPlans = (kpiKey, selectedYear, storage = localStorage) => {
  const kpi = safeKpi(kpiKey);
  const year = safeYear(selectedYear);
  const plans = readCollection(kpi, year, storage)
    .filter((plan) => plan?.id && plan?.period && String(plan.notes || '').trim())
    .map((plan) => ({ ...plan, notes: String(plan.notes).trim(), legacy: false }));

  const legacyPrefix = `ap_${kpi}_${year}_`;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(legacyPrefix)) continue;
    const notes = storage.getItem(key)?.trim();
    if (!notes) continue;
    const period = key.slice(legacyPrefix.length);
    plans.push({
      id: `legacy:${key}`,
      period,
      notes,
      updatedAt: storage.getItem(`${LEGACY_UPDATED_PREFIX}${kpi}_${year}_${period}`),
      createdAt: '',
      legacy: true,
      legacyKey: key,
    });
  }

  return sortPlans(plans);
};

export const addActionPlan = (
  kpiKey,
  selectedYear,
  period,
  notes,
  storage = localStorage,
  now = new Date().toISOString(),
  id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
) => {
  const trimmedNotes = String(notes || '').trim();
  if (!trimmedNotes) throw new Error('O plano de ação não pode ficar vazio.');

  const plans = readCollection(kpiKey, selectedYear, storage);
  const plan = { id, period, notes: trimmedNotes, createdAt: now, updatedAt: now };
  storage.setItem(collectionKey(kpiKey, selectedYear), JSON.stringify([...plans, plan]));
  return plan;
};

export const removeActionPlan = (kpiKey, selectedYear, plan, storage = localStorage) => {
  if (plan.legacy && plan.legacyKey) {
    storage.removeItem(plan.legacyKey);
    storage.removeItem(
      `${LEGACY_UPDATED_PREFIX}${safeKpi(kpiKey)}_${safeYear(selectedYear)}_${plan.period}`
    );
    return;
  }

  const plans = readCollection(kpiKey, selectedYear, storage);
  storage.setItem(
    collectionKey(kpiKey, selectedYear),
    JSON.stringify(plans.filter((candidate) => candidate.id !== plan.id))
  );
};
