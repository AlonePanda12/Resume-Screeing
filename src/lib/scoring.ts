// Simple, transparent resume scoring
export type ScoreReasons = {
  matchedSkills: string[];
  missingMust: string[];
  estYears: number;
};

export function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+.# ]+/g, " ");
}

function wordHit(text: string, word: string) {
  const t = normalize(text);
  const w = normalize(word).replace(/\s+/g, " ").trim();
  return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t);
}

export function estimateYears(text: string) {
  const m = normalize(text).match(/(\d+)\s*(?:\+?\s*)?(?:years?|yrs?)/g) || [];
  const nums = m.map(x => parseInt(x)).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) : 0;
}

/**
 * @param jdSkills e.g. ["react","typescript","css","git"]
 * @param must e.g. ["react","typescript"]
 * @returns score 0..1 and reasons
 */
export function scoreResume(
  jdText: string,
  resumeText: string,
  jdSkills?: string[],
  must: string[] = []
) {
  const baseSkills =
    jdSkills && jdSkills.length
      ? jdSkills
      : Array.from(
          new Set(
            normalize(jdText)
              .split(/[,\n/]/)
              .map(s => s.trim())
              .filter(s => s.length > 2 && s.length < 24)
          )
        );

  const hits = baseSkills.filter((s) => wordHit(resumeText, s));
  const coverage = hits.length / Math.max(baseSkills.length, 1);

  const years = estimateYears(resumeText);
  const expScore = Math.min(years / 8, 1); // cap at ~8 yrs

  const eduPresent = /b\.?tech|be |m\.?tech|mca|bsc|computer science|cse/i.test(resumeText);
  const eduScore = eduPresent ? 1 : 0;

  const missingMust = must.filter(m => !wordHit(resumeText, m));
  const penalty = Math.min(0.25, 0.05 * missingMust.length);

  let final =
    0.60 * coverage +
    0.25 * expScore +
    0.10 * eduScore -
    penalty;

  final = Math.max(0, Math.min(1, final));

  const reasons: ScoreReasons = {
    matchedSkills: hits.slice(0, 20),
    missingMust,
    estYears: years,
  };

  return { score: Number(final.toFixed(3)), reasons };
}
