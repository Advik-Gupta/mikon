/**
 * Builds src/data/body-map.json: male and female, front and back body figures with every
 * shape assigned to a specific Mikon muscle.
 *
 * Figure paths come from react-native-body-highlighter (MIT, © 2022 ELABBASSI Hicham,
 * https://github.com/HichamELBSI/react-native-body-highlighter). The source groups shapes
 * coarsely ("quadriceps", "hamstring", …); we split each group into individual muscles
 * with geometric rules (area, height, distance from the midline, vertical order), so the
 * same rules work for both sexes even though their shapes are ordered differently.
 *
 * Run: node scripts/build-body-map.mjs
 */
import { writeFile } from "node:fs/promises";
import vm from "node:vm";
import { svgPathBbox } from "svg-path-bbox";

const VERSION = "3.2.0";
const SOURCES = {
  male: { front: ["bodyFront", "0 0 724 1448"], back: ["bodyBack", "724 0 724 1448"] },
  female: { front: ["bodyFemaleFront", "-50 -40 734 1538"], back: ["bodyFemaleBack", "756 0 774 1448"] },
};

/** Parts drawn as plain body, not muscle */
const SILHOUETTE = new Set(["head", "hands", "feet", "ankles", "knees"]);

async function load(file) {
  const url = `https://unpkg.com/react-native-body-highlighter@${VERSION}/dist/assets/${file}.js`;
  const code = await (await fetch(url)).text();
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports });
  return Object.values(mod.exports)[0];
}

const area = (s) => (s.b[2] - s.b[0]) * (s.b[3] - s.b[1]);
const height = (s) => s.b[3] - s.b[1];
const cy = (s) => (s.b[1] + s.b[3]) / 2;
const by = (f) => (a, b) => f(a) - f(b);

/**
 * Assign muscles within one group on one side. `shapes` all come from the same side;
 * `lat(s)` is distance from the body's midline (bigger = more lateral).
 * Each rule returns an array of muscle ids aligned with `shapes`.
 */
function assign(view, slug, shapes, lat) {
  const out = new Map();
  const set = (s, m) => out.set(s, m);
  const rest = () => shapes.filter((s) => !out.has(s));
  const largest = (list) => [...list].sort(by(area)).at(-1);
  const mostLateral = (list) => [...list].sort(by(lat)).at(-1);
  const mostMedial = (list) => [...list].sort(by(lat))[0];
  const top = (list) => [...list].sort(by(cy))[0];
  const all = (m) => shapes.forEach((s) => set(s, m));

  const front = {
    neck: () => {
      set(largest(shapes), "sternocleidomastoid");
      rest().forEach((s) => set(s, "scalenes"));
    },
    trapezius: () => all("trapezius"),
    deltoids: () => {
      if (shapes.length > 1) set(mostLateral(shapes), "deltoid-lateral");
      rest().forEach((s) => set(s, "deltoid-anterior"));
    },
    chest: () => all("pectoralis-major"),
    biceps: () => all("biceps-brachii"),
    triceps: () => all("triceps-long"),
    obliques: () => {
      const y0 = Math.min(...shapes.map((s) => s.b[1]));
      const y1 = Math.max(...shapes.map((s) => s.b[3]));
      shapes.forEach((s) => set(s, cy(s) < y0 + (y1 - y0) * 0.42 ? "serratus-anterior" : "external-oblique"));
    },
    abs: () => all("rectus-abdominis"),
    forearm: () => {
      if (shapes.length >= 4) set(top(shapes), "pronator-teres");
      set(mostLateral(rest()), "brachioradialis");
      set(mostMedial(rest()), "flexor-carpi-ulnaris");
      rest().forEach((s) => set(s, "wrist-flexors"));
    },
    adductors: () => {
      set([...shapes].sort(by(height)).at(-1), "sartorius");
      set(top(rest()), "adductor-longus");
      rest().forEach((s) => set(s, "gracilis"));
    },
    quadriceps: () => {
      set(largest(shapes), "rectus-femoris");
      set(mostLateral(rest()), "vastus-lateralis");
      rest().forEach((s) => set(s, "vastus-medialis"));
    },
    tibialis: () => all("tibialis-anterior"),
    calves: () => {
      set(mostLateral(shapes), "fibularis-longus");
      rest().forEach((s) => set(s, "gastrocnemius-medial"));
    },
  };

  const back = {
    neck: () => all("splenius"),
    trapezius: () => all("trapezius"),
    deltoids: () => all("deltoid-posterior"),
    "upper-back": () => {
      set(largest(shapes), "latissimus-dorsi");
      const others = rest().sort(by(cy));
      if (others[0]) set(others[0], "infraspinatus");
      others.slice(1).forEach((s) => set(s, "teres-major"));
    },
    triceps: () => {
      set(mostMedial(shapes), "triceps-long");
      const others = rest().sort(by(cy));
      if (others[0]) set(others[0], "triceps-lateral");
      others.slice(1).forEach((s) => set(s, "triceps-medial"));
    },
    forearm: () => {
      set(top(shapes), "anconeus");
      set(mostLateral(rest()), "extensor-carpi-radialis");
      if (rest().length > 1) set(mostMedial(rest()), "extensor-carpi-ulnaris");
      rest().forEach((s) => set(s, "extensor-digitorum"));
    },
    "lower-back": () => {
      set(largest(shapes), "erector-spinae");
      rest().forEach((s) => set(s, "external-oblique"));
    },
    gluteal: () => {
      set(largest(shapes), "gluteus-maximus");
      rest().forEach((s) => set(s, "gluteus-medius"));
    },
    adductors: () => {
      set(largest(shapes), "adductor-magnus");
      rest().forEach((s) => set(s, "gracilis"));
    },
    hamstring: () => {
      // A thin sliver on the outside is the vastus lateralis showing from behind.
      const outer = mostLateral(shapes);
      if (shapes.length >= 3 && area(outer) < area(largest(shapes)) * 0.55) set(outer, "vastus-lateralis");
      const order = ["biceps-femoris", "semitendinosus", "semimembranosus"];
      rest()
        .sort(by(lat))
        .reverse()
        .forEach((s, i) => set(s, order[Math.min(i, order.length - 1)]));
    },
    calves: () => {
      const sorted = [...shapes].sort(by(cy));
      const upper = sorted.slice(0, 2);
      set(mostLateral(upper), "gastrocnemius-lateral");
      upper.filter((s) => !out.has(s)).forEach((s) => set(s, "gastrocnemius-medial"));
      sorted.slice(2).forEach((s) => set(s, "soleus"));
    },
  };

  const rule = (view === "front" ? front : back)[slug];
  if (!rule) throw new Error(`No rule for ${view}/${slug}`);
  rule();
  return shapes.map((s) => out.get(s));
}

const round = (n) => Math.round(n * 10) / 10;

async function buildView(file, viewBox, view) {
  const parts = await load(file);
  const shapes = [];
  const silhouette = [];
  const hair = [];
  let minX = Infinity;
  let maxX = -Infinity;

  const raw = parts.map((p) => {
    const bySide = {};
    for (const side of ["left", "right", "common"]) {
      bySide[side] = (p.path[side] ?? []).map((d) => ({ d, b: svgPathBbox(d) }));
      for (const s of bySide[side]) {
        minX = Math.min(minX, s.b[0]);
        maxX = Math.max(maxX, s.b[2]);
      }
    }
    return { slug: p.slug, bySide };
  });
  const mid = (minX + maxX) / 2;
  const lat = (s) => Math.abs((s.b[0] + s.b[2]) / 2 - mid);

  for (const { slug, bySide } of raw) {
    const everything = [...bySide.left, ...bySide.right, ...bySide.common];
    if (slug === "hair") {
      hair.push(...everything.map((s) => s.d));
      continue;
    }
    if (SILHOUETTE.has(slug)) {
      silhouette.push(...everything.map((s) => s.d));
      continue;
    }
    // The throat shape at the front of the neck isn't a muscle we track.
    silhouette.push(...bySide.common.map((s) => s.d));
    for (const side of ["left", "right"]) {
      const list = bySide[side];
      if (!list.length) continue;
      const muscles = assign(view, slug, list, lat);
      list.forEach((s, i) => shapes.push({ d: s.d, m: muscles[i], s: side[0], b: s.b.map(round) }));
    }
  }
  return { viewBox: viewBox.split(" ").map(Number), silhouette, hair, shapes };
}

const out = { source: `react-native-body-highlighter@${VERSION} (MIT)` };
for (const [sex, views] of Object.entries(SOURCES)) {
  out[sex] = {};
  for (const [view, [file, vb]] of Object.entries(views)) {
    out[sex][view] = await buildView(file, vb, view);
    const counts = {};
    out[sex][view].shapes.forEach((s) => (counts[s.m] = (counts[s.m] ?? 0) + 1));
    console.log(sex, view, Object.keys(counts).length, "muscles,", out[sex][view].shapes.length, "shapes");
  }
}
await writeFile(new URL("../src/data/body-map.json", import.meta.url), JSON.stringify(out));
console.log("wrote src/data/body-map.json");
