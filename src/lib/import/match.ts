import type { Exercise } from "../explorer";

const ALIASES: Record<string, string> = {
  "barbell bench press": "barbell-bench-press-medium-grip",
  "bench press": "barbell-bench-press-medium-grip",
  "flat bench press": "barbell-bench-press-medium-grip",
  "dumbbell bench press": "dumbbell-bench-press",
  "smith machine bench press": "smith-machine-bench-press",
  "incline barbell bench press": "barbell-incline-bench-press-medium-grip",
  "barbell incline bench press": "barbell-incline-bench-press-medium-grip",
  "incline dumbbell bench press": "incline-dumbbell-press",
  "dumbbell incline bench press": "incline-dumbbell-press",
  "smith machine incline bench press": "smith-machine-incline-bench-press",
  "decline barbell bench press": "decline-barbell-bench-press",
  "machine chest press": "machine-bench-press",
  "chest press": "machine-bench-press",
  "machine incline chest press": "leverage-incline-chest-press",
  "iso lateral machine chest press": "leverage-chest-press",
  "band chest press": "machine-bench-press",
  "machine pec deck": "butterfly",
  "pec deck": "butterfly",
  "pec deck fly": "butterfly",
  "machine chest fly": "butterfly",
  "chest fly": "dumbbell-flyes",
  "dumbbell chest fly": "dumbbell-flyes",
  "cable crossover": "cable-crossover",
  "push up": "pushups",
  "incline push up": "incline-push-up",
  "assisted chest dip": "dips-chest-version",
  "chest dip": "dips-chest-version",
  "assisted triceps dip": "dips-triceps-version",
  "triceps dip": "dips-triceps-version",
  "barbell squat": "barbell-squat",
  "squat": "barbell-squat",
  "back squat": "barbell-squat",
  "smith machine back squat": "smith-machine-squat",
  "smith machine squat": "smith-machine-squat",
  "bodyweight squat": "bodyweight-squat",
  "dumbbell squat": "dumbbell-squat",
  "machine squat": "lying-machine-squat",
  "kettlebell goblet squat": "goblet-squat",
  "goblet squat": "goblet-squat",
  "hack squat": "hack-squat",
  "machine hack squat": "hack-squat",
  "leg press": "leg-press",
  "machine leg press": "leg-press",
  "45 leg press": "leg-press",
  "calf press on leg press": "calf-press-on-the-leg-press-machine",
  "bulgarian split squat": "split-squat-with-dumbbells",
  "pistol squat": "mk-pistol-squat",
  "lunge": "bodyweight-walking-lunge",
  "dumbbell lunge": "dumbbell-lunges",
  "step up": "dumbbell-step-ups",
  "barbell deadlift": "barbell-deadlift",
  "deadlift": "barbell-deadlift",
  "conventional deadlift": "barbell-deadlift",
  "barbell romanian deadlift": "romanian-deadlift",
  "romanian deadlift": "romanian-deadlift",
  "smith machine romanian deadlift": "smith-machine-stiff-legged-deadlift",
  "machine leg extension": "leg-extensions",
  "leg extension": "leg-extensions",
  "machine lying leg curl": "lying-leg-curls",
  "lying leg curl": "lying-leg-curls",
  "machine seated leg curl": "seated-leg-curl",
  "seated leg curl": "seated-leg-curl",
  "seated hamstring curl": "seated-leg-curl",
  "machine hip abductor": "thigh-abductor",
  "machine seated hip adduction": "thigh-adductor",
  "machine standing calf raise": "standing-calf-raises",
  "plate loaded seated calf raise": "seated-calf-raise",
  "seated calf raise": "seated-calf-raise",
  "back extension": "hyperextensions-back-extensions",
  "hyperextension back extension": "hyperextensions-back-extensions",
  "pull up": "pullups",
  "overhand grip pull up": "pullups",
  "overhand grip weighted pull up": "weighted-pull-ups",
  "assisted pull up": "band-assisted-pull-up",
  "chin up": "chin-up",
  "cable lat pulldown": "wide-grip-lat-pulldown",
  "lat pulldown": "wide-grip-lat-pulldown",
  "machine lat pulldown": "wide-grip-lat-pulldown",
  "overhand grip cable lat pulldown": "wide-grip-lat-pulldown",
  "cable close grip lat pulldown": "close-grip-front-lat-pulldown",
  "neutral shoulder width grip cable lat pulldown": "v-bar-pulldown",
  "single arm lat pulldown": "one-arm-lat-pulldown",
  "cable seated row": "seated-cable-rows",
  "seated cable row": "seated-cable-rows",
  "cable seated cable row v grip": "seated-cable-rows",
  "neutral grip cable row": "seated-cable-rows",
  "barbell bent over row": "bent-over-barbell-row",
  "bent over row": "bent-over-barbell-row",
  "t bar row": "t-bar-row-with-handle",
  "machine iso lateral row": "leverage-iso-row",
  "iso lateral low row": "leverage-iso-row",
  "wide grip plate loaded machine row": "leverage-high-row",
  "cable face pull": "face-pull",
  "face pull": "face-pull",
  "barbell shrug": "barbell-shrug",
  "dumbbell shrug": "dumbbell-shrug",
  "machine shrug": "leverage-shrug",
  "barbell overhead press": "standing-military-press",
  "overhead press": "standing-military-press",
  "dumbbell overhead press": "dumbbell-shoulder-press",
  "dumbbell seated overhead press": "seated-dumbbell-press",
  "dumbbell shoulder press": "dumbbell-shoulder-press",
  "machine shoulder press": "machine-shoulder-military-press",
  "plate loaded shoulder press": "leverage-shoulder-press",
  "dumbbell lateral raise": "side-lateral-raise",
  "lateral raise": "side-lateral-raise",
  "seated dumbbell lateral raise": "seated-side-lateral-raise",
  "cable lateral raise": "cable-seated-lateral-raise",
  "single arm cable lateral raise": "cable-seated-lateral-raise",
  "dumbbell front raise": "front-dumbbell-raise",
  "barbell front raise": "standing-front-barbell-raise-over-head",
  "cable front raise": "front-cable-raise",
  "cable reverse fly": "cable-rear-delt-fly",
  "machine reverse fly": "reverse-machine-flyes",
  "machine rear delt reverse fly": "reverse-machine-flyes",
  "overhand grip machine rear delt fly": "reverse-machine-flyes",
  "barbell bicep curl": "barbell-curl",
  "barbell curl": "barbell-curl",
  "dumbbell bicep curl": "dumbbell-bicep-curl",
  "dumbbell curl": "dumbbell-bicep-curl",
  "cable bicep curl": "standing-biceps-cable-curl",
  "dumbbell hammer curl": "hammer-curls",
  "standing dumbbell hammer curl": "hammer-curls",
  "hammer curl": "hammer-curls",
  "dumbbell incline curl": "incline-dumbbell-curl",
  "barbell preacher curl": "preacher-curl",
  "dumbbell preacher curl": "one-arm-dumbbell-preacher-curl",
  "single arm dumbbell preacher curl": "one-arm-dumbbell-preacher-curl",
  "machine preacher curl": "machine-preacher-curls",
  "cable reverse curl": "reverse-cable-curl",
  "reverse cable curl": "reverse-cable-curl",
  "cable triceps pushdown straight bar": "triceps-pushdown",
  "cable straight bar triceps pushdown": "triceps-pushdown",
  "triceps pushdown": "triceps-pushdown",
  "cable triceps extension": "cable-rope-overhead-triceps-extension",
  "cable rope overhead triceps extension": "cable-rope-overhead-triceps-extension",
  "triceps extension": "standing-dumbbell-triceps-extension",
  "barbell skullcrusher": "lying-triceps-press",
  "dumbbell skullcrusher": "lying-dumbbell-tricep-extension",
  "cable kickback": "tricep-dumbbell-kickback",
  "machine crunch": "ab-crunch-machine",
  "crunch": "crunches",
  "crunch floor": "crunches",
  "decline crunch": "decline-crunch",
  "hanging knee raise": "mk-hanging-knee-raise",
  "hanging leg raise": "hanging-leg-raise",
  "captain s chair straight leg raise": "knee-hip-raise-on-parallel-bars",
  "flat leg raise": "flat-bench-lying-leg-raise",
  "front plank": "plank",
  "plank": "plank",
  "wrist roller": "wrist-roller",
  "wrist extension": "palms-down-wrist-curl-over-a-bench",
  "cable wrist curl": "cable-wrist-curl",
  "dumbbell seated palms up wrist curl": "seated-dumbbell-palms-up-wrist-curl",
  "behind the back wrist curl": "standing-palms-up-barbell-behind-the-back-wrist-curl",
  "treadmill running": "running-treadmill",
  "running": "running-treadmill",
  "indoor cycling": "bicycling-stationary",
  "cycling": "bicycling-stationary",
  "walking": "walking-treadmill",
  "jump rope": "rope-jumping",
};

const EQUIPMENT = ["barbell", "dumbbell", "cable", "machine", "smith", "kettlebell", "band", "plate", "ez"];
const STOP = new Set(["the", "a", "with", "of", "on", "to", "and", "grip", "exercise"]);

export function normalize(name: string) {
  let s = name.toLowerCase().replace(/[’']/g, " ");
  const paren = [...s.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).filter((p) => p.trim().split(/\s+/).length <= 3);
  s = s.replace(/\([^)]*\)/g, " ");
  s = [...paren, s].join(" ");
  s = s
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/\bkb\b/g, "kettlebell")
    .replace(/\bohp\b/g, "overhead press")
    .replace(/\brdl\b/g, "romanian deadlift")
    .replace(/\bpull[\s-]?ups?\b/g, "pull up")
    .replace(/\bchin[\s-]?ups?\b/g, "chin up")
    .replace(/\bpush[\s-]?ups?\b/g, "push up")
    .replace(/\bstep[\s-]?ups?\b/g, "step up")
    .replace(/\bflye?s?\b/g, "fly")
    .replace(/\bcurls\b/g, "curl")
    .replace(/\braises\b/g, "raise")
    .replace(/\bextensions\b/g, "extension")
    .replace(/\bskull\s?crushers?\b/g, "skullcrusher")
    .replace(/\bsmith machine\b/g, "smith machine")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

const tokens = (s: string) => s.split(" ").filter((t) => t && !STOP.has(t)).map((t) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));

export interface MatchResult {
  id: string | null;
  score: number;
}

export function makeMatcher(all: Exercise[]) {
  const byId = new Map(all.map((e) => [e.id, e]));
  const index = all.map((e) => ({ e, n: normalize(e.name), t: new Set(tokens(normalize(e.name))) }));
  const exact = new Map(index.map((x) => [x.n, x.e.id]));
  const aliasKeys = new Map(Object.entries(ALIASES).map(([k, v]) => [tokens(k).sort().join(" "), v]));

  return (name: string): MatchResult => {
    const n = normalize(name);
    if (ALIASES[n] && byId.has(ALIASES[n])) return { id: ALIASES[n], score: 1 };
    if (exact.has(n)) return { id: exact.get(n)!, score: 1 };
    const t = tokens(n);
    const sorted = [...t].sort().join(" ");
    const aliased = aliasKeys.get(sorted);
    if (aliased && byId.has(aliased)) return { id: aliased, score: 0.98 };

    const want = new Set(t);
    const eq = EQUIPMENT.filter((q) => want.has(q));
    let best: MatchResult = { id: null, score: 0 };
    for (const x of index) {
      if (x.e.source === "custom") continue;
      let inter = 0;
      want.forEach((w) => x.t.has(w) && inter++);
      if (!inter) continue;
      let score = (2 * inter) / (want.size + x.t.size);
      const theirEq = EQUIPMENT.filter((q) => x.t.has(q));
      if (eq.length && !eq.some((q) => x.t.has(q))) score *= 0.6;
      if (!eq.length && theirEq.length) score *= 0.85;
      if (score > best.score) best = { id: x.e.id, score };
    }
    return best.score >= 0.72 ? best : { id: null, score: best.score };
  };
}

const KEYWORDS: [RegExp, string[], string[]][] = [
  [/bench|chest|pec|fly|push ?up|dip/, ["chest"], ["triceps", "shoulders"]],
  [/squat|leg press|lunge|step up|leg extension/, ["quadriceps"], ["glutes", "hamstrings"]],
  [/deadlift|good morning/, ["hamstrings"], ["glutes", "lower back"]],
  [/leg curl|hamstring/, ["hamstrings"], []],
  [/calf/, ["calves"], []],
  [/hip thrust|glute|bridge|abduct/, ["glutes"], []],
  [/adduct/, ["adductors"], []],
  [/pulldown|pull up|chin up|lat /, ["lats"], ["biceps"]],
  [/row/, ["middle back"], ["lats", "biceps"]],
  [/shrug|trap/, ["traps"], []],
  [/overhead press|shoulder press|military|lateral|front raise|delt|arnold/, ["shoulders"], ["triceps"]],
  [/face pull|reverse fly|rear/, ["shoulders"], ["middle back"]],
  [/curl/, ["biceps"], ["forearms"]],
  [/tricep|skullcrusher|pushdown|kickback/, ["triceps"], []],
  [/crunch|plank|leg raise|knee raise|sit up|ab |abs|core|oblique/, ["abdominals"], []],
  [/wrist|forearm|grip|pinch|roller/, ["forearms"], []],
  [/neck/, ["neck"], []],
  [/back extension|hyperextension/, ["lower back"], ["glutes"]],
];

export function guessMuscles(name: string) {
  const n = ` ${normalize(name)} `;
  for (const [re, primary, secondary] of KEYWORDS) if (re.test(n)) return { primary, secondary };
  return { primary: [] as string[], secondary: [] as string[] };
}

export function guessDiscipline(name: string): Exercise["discipline"] {
  const n = normalize(name);
  if (/run|cycl|bike|walk|row(ing)? machine|elliptical|rope|stair|swim|treadmill|erg/.test(n) && !/barbell|dumbbell|cable/.test(n)) return "cardio";
  if (/stretch|mobility|yoga/.test(n)) return "mobility";
  if (/barbell|dumbbell|cable|machine|smith|kettlebell|plate|band/.test(n)) return "weights";
  return "calisthenics";
}
