/**
 * Mikon's own exercise entries, written for Mikon. They fill gaps in free-exercise-db:
 * calisthenics skill progressions and common plyometric drills.
 *
 * Muscle keys use free-exercise-db's vocabulary so everything maps the same way.
 * `family` + `step` define a calisthenics progression (step 1 = easiest).
 */

const cal = (id, name, family, step, level, primary, secondary, cues, extra = {}) => ({
  id: `mk-${id}`,
  name,
  category: "strength",
  discipline: "calisthenics",
  level,
  equipment: extra.equipment ?? "body only",
  mechanic: extra.mechanic ?? "compound",
  force: extra.force ?? null,
  measure: extra.measure ?? "reps",
  family,
  step,
  primary,
  secondary,
  instructions: cues,
  images: [],
  source: "mikon",
});

const plyo = (id, name, intensity, level, primary, secondary, cues, extra = {}) => ({
  id: `mk-${id}`,
  name,
  category: "plyometrics",
  discipline: "plyometrics",
  level,
  equipment: extra.equipment ?? "body only",
  mechanic: "compound",
  force: extra.force ?? "push",
  measure: "reps",
  intensity,
  primary,
  secondary,
  instructions: cues,
  images: [],
  source: "mikon",
});

const PUSH = ["chest", "triceps"];
const LEGS = ["quadriceps", "glutes"];

export const CURATED = [
  // ---------------------------------------------------------------- Push-up progression
  cal("incline-push-up", "Incline Push-Up (hands on box)", "Push-up", 1, "beginner", PUSH, ["shoulders"], ["Hands on a bench or box, body in one straight line.", "Lower your chest to the edge, elbows about 45° from the body.", "Press back up without letting the hips sag."], { force: "push" }),
  cal("knee-push-up", "Knee Push-Up", "Push-up", 2, "beginner", PUSH, ["shoulders"], ["Knees on the floor, straight line from knees to head.", "Lower until your chest nearly touches the floor, then press up."], { force: "push" }),
  cal("push-up", "Push-Up", "Push-up", 3, "beginner", PUSH, ["shoulders", "abdominals"], ["Hands just wider than your shoulders, body rigid like a plank.", "Lower until your chest is a fist from the floor, then press up to full lockout."], { force: "push" }),
  cal("diamond-push-up", "Diamond Push-Up", "Push-up", 4, "intermediate", ["triceps", "chest"], ["shoulders"], ["Thumbs and index fingers touch under your chest.", "Keep the elbows tucked as you lower and press."], { force: "push" }),
  cal("archer-push-up", "Archer Push-Up", "Push-up", 5, "intermediate", PUSH, ["shoulders"], ["Very wide hands; shift your weight to one side as you lower.", "The other arm stays nearly straight as a helper.", "Alternate sides."], { force: "push" }),
  cal("pseudo-planche-push-up", "Pseudo Planche Push-Up", "Push-up", 6, "expert", ["chest", "shoulders"], ["triceps", "abdominals"], ["Hands by your hips, fingers turned out, and lean the shoulders well past the hands.", "Keep that lean for the whole rep while you lower and press."], { force: "push" }),
  cal("one-arm-push-up", "One-Arm Push-Up", "Push-up", 7, "expert", PUSH, ["abdominals", "shoulders"], ["Feet wide, one hand under the chest, and brace hard to stop rotating.", "Lower under control and press back up."], { force: "push" }),

  // ---------------------------------------------------------------- Pull-up progression
  cal("dead-hang", "Dead Hang", "Pull-up", 1, "beginner", ["forearms"], ["lats"], ["Hang from the bar with straight arms and shoulders active, not shrugged into your ears.", "Breathe and hold for time."], { measure: "time", equipment: "pull-up bar", mechanic: "isolation", force: "static" }),
  cal("scapular-pull-up", "Scapular Pull-Up", "Pull-up", 2, "beginner", ["lats", "middle back"], ["traps"], ["From a dead hang, pull the shoulder blades down and back without bending the elbows.", "Pause, then relax back to the hang."], { equipment: "pull-up bar", force: "pull" }),
  cal("australian-row", "Australian Row (Inverted Row)", "Pull-up", 3, "beginner", ["middle back", "lats"], ["biceps"], ["Hang under a low bar with a straight body, heels on the floor.", "Pull your chest to the bar and squeeze the shoulder blades together."], { equipment: "other", force: "pull" }),
  cal("negative-pull-up", "Negative Pull-Up", "Pull-up", 4, "beginner", ["lats"], ["biceps", "middle back"], ["Jump or step to the top position with your chin over the bar.", "Lower yourself as slowly as you can, aiming for 3–5 seconds."], { equipment: "pull-up bar", force: "pull" }),
  cal("pull-up", "Pull-Up", "Pull-up", 5, "intermediate", ["lats"], ["biceps", "middle back"], ["Overhand grip just wider than your shoulders.", "Pull until your chin clears the bar, then lower to full extension."], { equipment: "pull-up bar", force: "pull" }),
  cal("l-sit-pull-up", "L-Sit Pull-Up", "Pull-up", 6, "intermediate", ["lats", "abdominals"], ["biceps"], ["Hold your legs straight out in front at hip height.", "Pull up without letting the legs drop."], { equipment: "pull-up bar", force: "pull" }),
  cal("archer-pull-up", "Archer Pull-Up", "Pull-up", 7, "expert", ["lats"], ["biceps", "middle back"], ["Wide grip; pull toward one hand while the other arm straightens.", "Alternate sides."], { equipment: "pull-up bar", force: "pull" }),
  cal("muscle-up", "Muscle-Up", "Pull-up", 8, "expert", ["lats", "triceps"], ["chest", "biceps", "shoulders"], ["Pull explosively to your lower chest.", "Drive the elbows over the bar, then press to lockout on top."], { equipment: "pull-up bar", force: "pull" }),

  // ---------------------------------------------------------------- Dips
  cal("bench-dip", "Bench Dip", "Dip", 1, "beginner", ["triceps"], ["chest", "shoulders"], ["Hands on a bench behind you with your legs out front.", "Bend the elbows to about 90°, then press up."], { force: "push" }),
  cal("negative-dip", "Negative Dip", "Dip", 2, "beginner", ["triceps", "chest"], ["shoulders"], ["Start at the top of the dip bars.", "Lower slowly over 3–5 seconds, then step back up."], { equipment: "other", force: "push" }),
  cal("parallel-bar-dip", "Parallel Bar Dip", "Dip", 3, "intermediate", ["triceps", "chest"], ["shoulders"], ["Lower until your shoulders are just below your elbows.", "Press to lockout with the chest proud."], { equipment: "other", force: "push" }),
  cal("ring-dip", "Ring Dip", "Dip", 4, "expert", ["triceps", "chest"], ["shoulders", "abdominals"], ["Rings turned out at the top, arms tight to the body.", "Control the rings the whole way down and up."], { equipment: "other", force: "push" }),

  // ---------------------------------------------------------------- Squat
  cal("air-squat", "Air Squat", "Squat", 1, "beginner", LEGS, ["hamstrings", "calves"], ["Feet shoulder-width apart; sit down between your heels.", "Keep your chest up and drive through the whole foot."], { force: "push" }),
  cal("split-squat-bw", "Bodyweight Split Squat", "Squat", 2, "beginner", LEGS, ["hamstrings"], ["Staggered stance; drop the back knee straight down.", "Front shin stays roughly vertical."], { force: "push" }),
  cal("bulgarian-split-squat-bw", "Bodyweight Bulgarian Split Squat", "Squat", 3, "intermediate", LEGS, ["hamstrings"], ["Back foot on a bench; lower until your front thigh is parallel.", "Drive up through the front heel."], { force: "push" }),
  cal("shrimp-squat", "Shrimp Squat", "Squat", 4, "intermediate", LEGS, ["hamstrings", "calves"], ["Hold one foot behind you; lower the back knee to the floor on one leg.", "Stand back up without pushing off the back foot."], { force: "push" }),
  cal("pistol-squat", "Pistol Squat", "Squat", 5, "expert", LEGS, ["calves", "abdominals"], ["Extend one leg forward and squat all the way down on the other.", "Arms reach forward for balance; stand up without the free leg touching down."], { force: "push" }),

  // ---------------------------------------------------------------- Hinge / hamstrings
  cal("glute-bridge-bw", "Glute Bridge", "Hinge", 1, "beginner", ["glutes"], ["hamstrings"], ["Lie on your back with knees bent; drive the hips up until the body is straight from knees to shoulders.", "Squeeze your glutes for a second at the top."], { force: "push", mechanic: "isolation" }),
  cal("single-leg-bridge", "Single-Leg Glute Bridge", "Hinge", 2, "beginner", ["glutes"], ["hamstrings"], ["One foot planted, the other leg extended.", "Drive the hips up without them twisting."], { force: "push", mechanic: "isolation" }),
  cal("nordic-negative", "Nordic Curl Negative", "Hinge", 3, "intermediate", ["hamstrings"], ["glutes"], ["Kneel with your ankles anchored.", "Lower your body forward as slowly as possible with a straight line from knee to head, then catch yourself."], { force: "pull", mechanic: "isolation" }),
  cal("nordic-curl", "Nordic Curl", "Hinge", 4, "expert", ["hamstrings"], ["glutes"], ["Lower under control, then pull yourself back up using only your hamstrings."], { force: "pull", mechanic: "isolation" }),

  // ---------------------------------------------------------------- Core
  cal("plank-hold", "Plank Hold", "Core", 1, "beginner", ["abdominals"], ["shoulders"], ["Forearms under your shoulders, body in a straight line.", "Tuck the pelvis slightly and squeeze your glutes. Hold for time."], { measure: "time", force: "static", mechanic: "isolation" }),
  cal("hollow-body-hold", "Hollow Body Hold", "Core", 2, "beginner", ["abdominals"], [], ["Lower back pressed into the floor; arms and legs extended and lifted.", "Hold without the back arching."], { measure: "time", force: "static", mechanic: "isolation" }),
  cal("hanging-knee-raise", "Hanging Knee Raise", "Core", 3, "beginner", ["abdominals"], ["forearms"], ["Hang from a bar and raise your knees to your chest by curling the pelvis.", "Lower slowly without swinging."], { equipment: "pull-up bar", force: "pull", mechanic: "isolation" }),
  cal("toes-to-bar", "Toes to Bar", "Core", 4, "intermediate", ["abdominals"], ["lats", "forearms"], ["From a hang, lift straight legs until your toes touch the bar.", "Control the way down."], { equipment: "pull-up bar", force: "pull", mechanic: "isolation" }),
  cal("dragon-flag", "Dragon Flag", "Core", 5, "expert", ["abdominals"], ["lower back"], ["Lie on a bench holding behind your head; raise your body rigid like a plank.", "Lower slowly while keeping it straight."], { equipment: "other", mechanic: "isolation" }),

  // ---------------------------------------------------------------- L-sit
  cal("tuck-l-sit", "Tuck L-Sit", "L-sit", 1, "beginner", ["abdominals"], ["triceps", "quadriceps"], ["Hands on the floor or parallettes; press down and lift your tucked knees.", "Hold for time."], { measure: "time", equipment: "other", force: "static" }),
  cal("one-leg-l-sit", "One-Leg L-Sit", "L-sit", 2, "intermediate", ["abdominals"], ["triceps", "quadriceps"], ["One leg straight, one tucked. Alternate between holds."], { measure: "time", equipment: "other", force: "static" }),
  cal("l-sit", "L-Sit", "L-sit", 3, "intermediate", ["abdominals"], ["triceps", "quadriceps"], ["Both legs straight and together at hip height, shoulders pushed down.", "Hold for time."], { measure: "time", equipment: "other", force: "static" }),
  cal("v-sit", "V-Sit", "L-sit", 4, "expert", ["abdominals"], ["triceps", "shoulders"], ["From an L-sit, raise your legs higher toward a V while leaning the shoulders back."], { measure: "time", equipment: "other", force: "static" }),

  // ---------------------------------------------------------------- Handstand
  cal("pike-push-up", "Pike Push-Up", "Handstand", 1, "beginner", ["shoulders"], ["triceps"], ["Hips high in an inverted V; lower your head toward the floor in front of your hands.", "Press back up."], { force: "push" }),
  cal("wall-handstand", "Wall Handstand Hold", "Handstand", 2, "intermediate", ["shoulders"], ["triceps", "abdominals"], ["Kick up or walk your feet up the wall, arms locked and pushing tall.", "Hold for time."], { measure: "time", force: "static" }),
  cal("wall-hspu", "Wall Handstand Push-Up", "Handstand", 3, "expert", ["shoulders", "triceps"], ["traps"], ["In a wall handstand, lower your head to the floor or a mat.", "Press back to lockout."], { force: "push" }),
  cal("freestanding-handstand", "Freestanding Handstand", "Handstand", 4, "expert", ["shoulders"], ["abdominals", "forearms"], ["Balance with your fingertips making the corrections.", "Hold for time."], { measure: "time", force: "static" }),

  // ---------------------------------------------------------------- Front lever
  cal("tuck-front-lever", "Tuck Front Lever", "Front lever", 1, "intermediate", ["lats"], ["abdominals", "middle back"], ["Hang, then pull straight arms down to lift a tucked body level with the floor.", "Hold for time."], { measure: "time", equipment: "pull-up bar", force: "static" }),
  cal("adv-tuck-front-lever", "Advanced Tuck Front Lever", "Front lever", 2, "expert", ["lats"], ["abdominals", "middle back"], ["Like the tuck, but with a flat back and hips opened to 90°."], { measure: "time", equipment: "pull-up bar", force: "static" }),
  cal("straddle-front-lever", "Straddle Front Lever", "Front lever", 3, "expert", ["lats"], ["abdominals", "lower back"], ["Legs straight and wide, body horizontal."], { measure: "time", equipment: "pull-up bar", force: "static" }),
  cal("front-lever", "Full Front Lever", "Front lever", 4, "expert", ["lats"], ["abdominals", "lower back"], ["Legs together, body in one straight horizontal line."], { measure: "time", equipment: "pull-up bar", force: "static" }),

  // ---------------------------------------------------------------- Planche
  cal("planche-lean", "Planche Lean", "Planche", 1, "intermediate", ["shoulders"], ["chest", "abdominals"], ["Push-up position with the fingers turned out; lean the shoulders forward past the hands.", "Hold for time with straight arms."], { measure: "time", force: "static" }),
  cal("tuck-planche", "Tuck Planche", "Planche", 2, "expert", ["shoulders"], ["chest", "triceps"], ["Straight arms and knees tucked; lift your feet off the floor.", "Hold for time."], { measure: "time", force: "static" }),
  cal("adv-tuck-planche", "Advanced Tuck Planche", "Planche", 3, "expert", ["shoulders"], ["chest", "triceps"], ["Flat back, with the hips raised to shoulder height."], { measure: "time", force: "static" }),
  cal("straddle-planche", "Straddle Planche", "Planche", 4, "expert", ["shoulders"], ["chest", "abdominals"], ["Legs straight and wide, body horizontal and supported on straight arms."], { measure: "time", force: "static" }),

  // ---------------------------------------------------------------- Plyometrics (intensity: low / moderate / high)
  plyo("pogo-hops", "Pogo Hops", "low", "beginner", ["calves"], ["quadriceps"], ["Small, quick bounces on the balls of your feet with stiff ankles.", "Minimise the time spent on the ground."]),
  plyo("ankle-hops", "Ankle Hops", "low", "beginner", ["calves"], [], ["Straight legs; spring from the ankles only, landing softly and rebounding."]),
  plyo("a-skips", "A-Skips", "low", "beginner", ["quadriceps", "calves"], ["hamstrings"], ["Skip forward driving one knee up while the opposite arm swings.", "Strike down under your hips."]),
  plyo("line-hops", "Line Hops", "low", "beginner", ["calves"], ["quadriceps"], ["Hop quickly forward and back, or side to side, over a line."]),
  plyo("squat-jump", "Squat Jump", "moderate", "beginner", LEGS, ["calves", "hamstrings"], ["Squat to parallel and jump as high as you can.", "Land softly and reset between reps."]),
  plyo("box-jump", "Box Jump", "moderate", "beginner", LEGS, ["calves", "hamstrings"], ["Swing your arms and jump onto the box, landing quietly in a half squat.", "Step down. Don't jump down."], { equipment: "other" }),
  plyo("broad-jump", "Broad Jump", "moderate", "intermediate", LEGS, ["hamstrings", "calves"], ["Jump as far forward as you can and stick the landing.", "Reset between reps."]),
  plyo("skater-hops", "Skater Hops", "moderate", "beginner", ["glutes", "quadriceps"], ["adductors", "calves"], ["Bound sideways from one leg to the other and stick each landing."]),
  plyo("split-squat-jump", "Split Squat Jump", "moderate", "intermediate", LEGS, ["hamstrings", "calves"], ["From a lunge, jump and switch legs in the air; land softly."]),
  plyo("power-skips", "Power Skips", "moderate", "intermediate", ["glutes", "calves"], ["quadriceps"], ["Skip for maximum height with an aggressive arm drive."]),
  plyo("tuck-jump", "Tuck Jump", "high", "intermediate", ["quadriceps"], ["abdominals", "calves", "glutes"], ["Jump and pull your knees to your chest; rebound straight into the next rep."]),
  plyo("depth-jump", "Depth Jump", "high", "expert", LEGS, ["calves", "hamstrings"], ["Step off a low box, land, and jump up immediately with minimal ground contact."], { equipment: "other" }),
  plyo("hurdle-hops", "Hurdle Hops", "high", "intermediate", ["calves", "quadriceps"], ["glutes"], ["Jump consecutive hurdles with quick, stiff contacts."], { equipment: "other" }),
  plyo("single-leg-bound", "Single-Leg Bounds", "high", "expert", ["glutes", "quadriceps"], ["hamstrings", "calves"], ["Bound forward repeatedly on one leg, covering as much distance as you can."]),
  plyo("single-leg-hop", "Single-Leg Hops", "high", "intermediate", ["calves", "quadriceps"], ["glutes"], ["Continuous hops on one leg, landing softly with the knee over the toes."]),
  plyo("clap-push-up", "Clap Push-Up", "high", "intermediate", PUSH, ["shoulders"], ["Explode off the floor, clap, and catch yourself with soft elbows."]),
  plyo("med-ball-chest-pass", "Med Ball Chest Pass (wall)", "moderate", "beginner", PUSH, ["shoulders"], ["Throw the ball explosively into a wall from your chest, catch, and repeat."], { equipment: "medicine ball" }),
  plyo("med-ball-slam", "Med Ball Slam", "moderate", "beginner", ["lats", "abdominals"], ["shoulders", "triceps"], ["Reach overhead and slam the ball into the floor as hard as you can."], { equipment: "medicine ball" }),
  plyo("med-ball-rotational-throw", "Med Ball Rotational Throw", "moderate", "intermediate", ["abdominals"], ["shoulders", "glutes"], ["Load the back hip and throw sideways into a wall, rotating through the hips."], { equipment: "medicine ball", force: "pull" }),
];
