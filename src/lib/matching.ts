export function normalizeSkill(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9+#.]+/g,' ').replace(/\s+/g,' '); }
export function matchSkills(required: string[], available: string[]) {
  const unique = [...new Map<string,string>(required.map(s=>[normalizeSkill(s),s] as [string,string]).filter(([key])=>!!key)).values()];
  const owned = new Set(available.map(normalizeSkill));
  const matched = unique.filter(s=>owned.has(normalizeSkill(s)));
  const missing = unique.filter(s=>!owned.has(normalizeSkill(s)));
  return {score: unique.length ? Math.round(matched.length / unique.length * 100) : 100, matched, missing, total:unique.length};
}
export function projectRank(required: string[], skills: string[], availability?: string) {
  const result = matchSkills(required, skills);
  return result.score + (availability === 'Available' ? 5 : 0);
}
