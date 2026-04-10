export const TASK_CATALOG = [
  // Kitchen
  { name: "Wash the dishes", category: "Kitchen", schedule: "daily", points: 10, aliases: ["do dishes", "clean dishes", "dishwashing", "load dishwasher", "unload dishwasher", "wash up", "do the washing up", "wash plates", "scrub pots"] },
  { name: "Clean the kitchen", category: "Kitchen", schedule: "daily", points: 15, aliases: ["wipe counters", "wipe down kitchen", "kitchen cleanup", "clean countertops", "tidy kitchen", "sanitize kitchen"] },
  { name: "Cook dinner", category: "Kitchen", schedule: "daily", points: 20, aliases: ["make dinner", "prepare dinner", "cook meal", "make food", "prepare supper", "fix dinner", "cook supper"] },
  { name: "Cook breakfast", category: "Kitchen", schedule: "daily", points: 10, aliases: ["make breakfast", "prepare breakfast", "fix breakfast", "morning meal"] },
  { name: "Pack lunches", category: "Kitchen", schedule: "daily", points: 10, aliases: ["make lunches", "prepare lunches", "school lunch", "lunch boxes", "pack lunch boxes"] },
  { name: "Empty the dishwasher", category: "Kitchen", schedule: "daily", points: 5, aliases: ["unload dishwasher", "put dishes away", "put away clean dishes"] },
  { name: "Clean the oven", category: "Kitchen", schedule: "monthly", points: 20, aliases: ["scrub oven", "oven cleaning", "degrease oven"] },
  { name: "Clean the fridge", category: "Kitchen", schedule: "weekly", points: 15, aliases: ["clean refrigerator", "wipe fridge", "organize fridge", "fridge cleanout", "purge fridge"] },
  { name: "Wipe down appliances", category: "Kitchen", schedule: "weekly", points: 10, aliases: ["clean appliances", "wipe microwave", "clean toaster", "clean coffee maker"] },
  { name: "Take out the trash", category: "Kitchen", schedule: "daily", points: 5, aliases: ["garbage", "take garbage out", "empty trash", "empty garbage", "trash duty", "rubbish", "take out rubbish", "bins", "empty the bin", "take out bins", "put bins out"] },
  { name: "Take out recycling", category: "Kitchen", schedule: "weekly", points: 5, aliases: ["recycling", "sort recycling", "put recycling out", "recycle bins"] },

  // Cleaning
  { name: "Vacuum the floors", category: "Cleaning", schedule: "weekly", points: 15, aliases: ["hoover", "vacuum", "vacuuming", "vacuum rugs", "vacuum carpets", "run the vacuum"] },
  { name: "Mop the floors", category: "Cleaning", schedule: "weekly", points: 15, aliases: ["mop floors", "wash floors", "scrub floors", "floor mopping", "mop up"] },
  { name: "Sweep the floors", category: "Cleaning", schedule: "daily", points: 10, aliases: ["sweep", "sweeping", "broom", "sweep up"] },
  { name: "Dust the furniture", category: "Cleaning", schedule: "weekly", points: 10, aliases: ["dust", "dusting", "dust shelves", "wipe dust", "dust surfaces", "dust the house"] },
  { name: "Clean the bathrooms", category: "Cleaning", schedule: "weekly", points: 20, aliases: ["scrub bathroom", "clean toilet", "clean shower", "clean tub", "bathroom duty", "wash bathroom", "sanitize bathroom", "clean restroom"] },
  { name: "Clean the mirrors", category: "Cleaning", schedule: "weekly", points: 5, aliases: ["wipe mirrors", "mirror cleaning", "wash mirrors"] },
  { name: "Tidy up the living room", category: "Cleaning", schedule: "daily", points: 10, aliases: ["clean up", "clean living room", "straighten up", "pick up", "declutter", "tidy up", "neaten up", "organize living room", "clean the lounge"] },
  { name: "Tidy up the bedrooms", category: "Cleaning", schedule: "daily", points: 10, aliases: ["clean bedrooms", "straighten bedrooms", "pick up bedroom", "clean rooms"] },
  { name: "Deep clean the house", category: "Cleaning", schedule: "monthly", points: 50, aliases: ["spring cleaning", "deep clean", "thorough clean", "full house clean"] },
  { name: "Clean the windows", category: "Cleaning", schedule: "monthly", points: 20, aliases: ["wash windows", "wipe windows", "window cleaning"] },

  // Laundry
  { name: "Do the laundry", category: "Laundry", schedule: "weekly", points: 15, aliases: ["wash clothes", "washing", "laundry", "run a load", "do a load of laundry", "put a load on", "wash load"] },
  { name: "Fold the laundry", category: "Laundry", schedule: "weekly", points: 10, aliases: ["fold clothes", "fold washing", "put laundry away", "fold and put away"] },
  { name: "Iron clothes", category: "Laundry", schedule: "weekly", points: 10, aliases: ["ironing", "press clothes", "iron shirts", "do the ironing"] },
  { name: "Change the bed sheets", category: "Laundry", schedule: "weekly", points: 10, aliases: ["change sheets", "change bedding", "strip the bed", "make the bed with fresh sheets", "new sheets"] },

  // Outdoor
  { name: "Mow the lawn", category: "Outdoor", schedule: "weekly", points: 20, aliases: ["cut the grass", "lawn mowing", "mow grass", "trim the lawn", "cut lawn"] },
  { name: "Water the plants", category: "Outdoor", schedule: "daily", points: 5, aliases: ["water garden", "water flowers", "watering", "water houseplants", "water the garden"] },
  { name: "Pull weeds", category: "Outdoor", schedule: "weekly", points: 15, aliases: ["weeding", "weed garden", "garden weeds", "weed the yard"] },
  { name: "Rake the leaves", category: "Outdoor", schedule: "weekly", points: 15, aliases: ["rake leaves", "leaf raking", "clean up leaves", "bag leaves"] },
  { name: "Shovel snow", category: "Outdoor", schedule: "daily", points: 20, aliases: ["clear snow", "snow removal", "shovel driveway", "shovel sidewalk", "plow driveway"] },
  { name: "Take in the mail", category: "Outdoor", schedule: "daily", points: 5, aliases: ["check mail", "get the mail", "check mailbox", "pick up mail", "collect mail", "get post"] },
  { name: "Clean the garage", category: "Outdoor", schedule: "monthly", points: 25, aliases: ["organize garage", "tidy garage", "garage cleanup"] },

  // Pets
  { name: "Feed the pets", category: "Pets", schedule: "daily", points: 5, aliases: ["feed dog", "feed cat", "pet food", "feed animals", "feed the dog", "feed the cat", "fill pet bowl"] },
  { name: "Walk the dog", category: "Pets", schedule: "daily", points: 15, aliases: ["dog walk", "take dog out", "walk dog", "dog walking", "exercise the dog"] },
  { name: "Clean the litter box", category: "Pets", schedule: "daily", points: 10, aliases: ["scoop litter", "cat litter", "litter box", "clean cat box", "empty litter"] },
  { name: "Groom the pets", category: "Pets", schedule: "weekly", points: 15, aliases: ["brush dog", "brush cat", "pet grooming", "bathe dog", "wash the dog"] },

  // Children
  { name: "Help with homework", category: "Children", schedule: "daily", points: 15, aliases: ["homework help", "school work", "assist with homework", "study time", "tutor children"] },
  { name: "Make school lunches", category: "Children", schedule: "daily", points: 10, aliases: ["pack school lunch", "prepare school lunch", "children lunch", "lunchbox"] },
  { name: "Drive children to school", category: "Children", schedule: "daily", points: 10, aliases: ["school drop off", "school run", "drop off children", "take children to school", "carpool"] },
  { name: "Pick up children from school", category: "Children", schedule: "daily", points: 10, aliases: ["school pickup", "pick up from school", "collect children", "after school pickup"] },
  { name: "Bedtime routine", category: "Children", schedule: "daily", points: 10, aliases: ["put children to bed", "bedtime", "tuck in", "read bedtime story", "bath time"] },

  // Errands
  { name: "Grocery shopping", category: "Errands", schedule: "weekly", points: 20, aliases: ["buy groceries", "food shopping", "go to store", "supermarket", "get groceries", "market run", "shop for food"] },
  { name: "Pick up prescriptions", category: "Errands", schedule: "monthly", points: 10, aliases: ["pharmacy", "get medicine", "fill prescription", "drug store", "pick up meds"] },
  { name: "Run errands", category: "Errands", schedule: "weekly", points: 15, aliases: ["errands", "do errands", "various errands"] },
  { name: "Schedule appointments", category: "Errands", schedule: "monthly", points: 10, aliases: ["make appointments", "book appointments", "schedule doctor", "dentist appointment", "book doctor"] },
  { name: "Pay the bills", category: "Errands", schedule: "monthly", points: 10, aliases: ["bills", "pay bills", "handle bills", "bill payment", "pay utilities"] },

  // Maintenance
  { name: "Replace light bulbs", category: "Maintenance", schedule: "once", points: 5, aliases: ["change light bulb", "fix light", "light bulb", "replace bulb"] },
  { name: "Change air filters", category: "Maintenance", schedule: "monthly", points: 10, aliases: ["air filter", "HVAC filter", "replace air filter", "furnace filter"] },
  { name: "Check smoke detectors", category: "Maintenance", schedule: "monthly", points: 10, aliases: ["smoke alarm", "test smoke detector", "smoke detector batteries", "fire alarm"] },
  { name: "Fix things around the house", category: "Maintenance", schedule: "once", points: 20, aliases: ["home repair", "handyman", "fix stuff", "repairs", "home maintenance", "diy repair"] },
];

export const CATEGORIES = [...new Set(TASK_CATALOG.map((t) => t.category))];

function bigrams(str) {
  const s = str.toLowerCase().trim();
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function similarity(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  for (const bg of A) if (B.has(bg)) intersection++;
  return (2 * intersection) / (A.size + B.size);
}

export function searchTasks(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  const scored = TASK_CATALOG.map((task) => {
    const nameLower = task.name.toLowerCase();
    if (nameLower.includes(q)) return { task, score: 1.0 };

    const aliasExact = task.aliases.some((a) => a.toLowerCase().includes(q));
    if (aliasExact) return { task, score: 0.95 };

    const qWords = q.split(/\s+/);
    const nameHasAllWords = qWords.every((w) => nameLower.includes(w));
    if (nameHasAllWords) return { task, score: 0.9 };

    const aliasHasAllWords = task.aliases.some((a) => {
      const al = a.toLowerCase();
      return qWords.every((w) => al.includes(w));
    });
    if (aliasHasAllWords) return { task, score: 0.85 };

    let best = similarity(q, nameLower);
    for (const alias of task.aliases) {
      const s = similarity(q, alias.toLowerCase());
      if (s > best) best = s;
    }

    const nameWords = nameLower.split(/\s+/);
    const allAliasWords = task.aliases.flatMap((a) => a.toLowerCase().split(/\s+/));
    const targetWords = [...nameWords, ...allAliasWords];
    for (const qw of qWords) {
      for (const tw of targetWords) {
        const ws = similarity(qw, tw);
        if (ws > best) best = ws;
      }
    }

    return { task, score: best };
  });

  return scored
    .filter((s) => s.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.task);
}
