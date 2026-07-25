/**
 * Offline trip planner — no API keys required.
 * Generates a full Markdown plan from form inputs + destination knowledge.
 */

const DESTINATIONS = {
  kyoto: {
    name: "Kyoto, Japan",
    vibe: "temples, gardens, food, and walkable neighborhoods",
    base: "Higashiyama / Gion",
    transit: {
      arrive: "Fly into Kansai (KIX). Take the JR Haruka Limited Express to Kyoto Station (~75 min).",
      around: "City bus + walking; 1-day bus pass recommended. No car needed.",
      transfer: "Haruka arrives at Kyoto Station — taxi or walk to hotels in Gion/Higashiyama.",
    },
    hotels: [
      { name: "Hotel Kanra Kyoto", area: "Shimogyo", tier: "$$", why: "Calm wooden rooms, great breakfast, central" },
      { name: "The Screen", area: "Nakagyo", tier: "$$$", why: "Boutique and romantic — strong for couples" },
      { name: "Mitsui Garden Hotel Kyoto Shinmachi Bettei", area: "Central", tier: "$", why: "Solid value with onsen-style baths" },
    ],
    sights: [
      { name: "Kiyomizu-dera", tip: "Go early to avoid crowds" },
      { name: "Fushimi Inari", tip: "Hike as far as you like; lower gates are busiest" },
      { name: "Arashiyama Bamboo Grove + Tenryu-ji", tip: "Morning visit is quieter" },
      { name: "Gion + Pontocho", tip: "Best at dusk for atmosphere" },
      { name: "Nishiki Market", tip: "Great for food tasting and souvenirs" },
      { name: "Nijo Castle", tip: "UNESCO site; allow 1–1.5 hours" },
    ],
    restaurants: [
      { name: "Omen", cuisine: "Udon", tier: "$$", note: "Handmade noodles, casual" },
      { name: "Gion Karyo", cuisine: "Modern kaiseki", tier: "$$$", note: "Reserve ahead for special dinners" },
      { name: "Honke Owariya", cuisine: "Soba", tier: "$", note: "Historic soba house" },
      { name: "Menbaka Fire Ramen", cuisine: "Ramen", tier: "$$", note: "Fun, theatrical — good for friends" },
      { name: "Yudofu Sagano", cuisine: "Tofu kaiseki", tier: "$$$", note: "Temple-side, calm meal" },
    ],
    packing: "Layers for cool evenings; comfortable walking shoes; light rain shell.",
    visa: "Many visitors (incl. US) get short visa-free stays — confirm for your passport.",
    tips: "Get an ICOCA card at the airport. Tipping is not expected.",
  },
  tokyo: {
    name: "Tokyo, Japan",
    vibe: "neighborhoods, food, neon nights, and endless day trips",
    base: "Shinjuku or Shibuya",
    transit: {
      arrive: "Fly into NRT or HND. Airport Limousine Bus or train to Shinjuku/Shibuya.",
      around: "JR + metro; Suica/Pasmo card. Avoid taxis for long distances.",
      transfer: "Narita Express or Keikyu/JR from Haneda depending on hotel area.",
    },
    hotels: [
      { name: "Hotel Gracery Shinjuku", area: "Shinjuku", tier: "$$", why: "Central, great for first-timers" },
      { name: "Mitsui Garden Hotel Ginza Premier", area: "Ginza", tier: "$$$", why: "Polished base for couples" },
      { name: "Hotel Sardonyx Ueno", area: "Ueno", tier: "$", why: "Budget-friendly near parks & museums" },
    ],
    sights: [
      { name: "Senso-ji (Asakusa)", tip: "Morning for fewer crowds" },
      { name: "Meiji Shrine + Harajuku", tip: "Combine in one afternoon" },
      { name: "teamLab Planets or Borderless", tip: "Book tickets online in advance" },
      { name: "Shibuya Crossing + surrounding streets", tip: "Evening energy" },
      { name: "Tsukiji Outer Market", tip: "Breakfast stroll" },
      { name: "Tokyo Skytree or Mori Building Observatory", tip: "Sunset views" },
    ],
    restaurants: [
      { name: "Ichiran", cuisine: "Ramen", tier: "$", note: "Solo booths — fun for everyone" },
      { name: "Sushi Dai / Daiwa Sushi", cuisine: "Sushi", tier: "$$$", note: "Queue early or choose a mid-tier alternative" },
      { name: "Afuri", cuisine: "Yuzu ramen", tier: "$$", note: "Reliable and lighter" },
      { name: "Gonpachi Nishi-Azabu", cuisine: "Izakaya", tier: "$$", note: "Lively for friends" },
      { name: "Tempura Kondo", cuisine: "Tempura", tier: "$$$$", note: "Splurge anniversary option" },
    ],
    packing: "Comfortable shoes; metro-friendly day bag; light jacket.",
    visa: "Confirm visa-free rules for your passport.",
    tips: "Buy a Suica on your phone or IC card. Cash still useful at small shops.",
  },
  paris: {
    name: "Paris, France",
    vibe: "museums, cafés, riverside walks, and late dinners",
    base: "Le Marais or Saint-Germain",
    transit: {
      arrive: "Fly into CDG or ORY. RER B / Orlyval + metro to central hotels.",
      around: "Metro + walking. Navigo Easy or day pass. Avoid driving.",
      transfer: "RER B to Châtelet/Saint-Michel then metro, or taxi/Uber if tired.",
    },
    hotels: [
      { name: "Hôtel Jeanne d'Arc Le Marais", area: "Le Marais", tier: "$$", why: "Charming location for walking" },
      { name: "Hôtel des Grands Boulevards", area: "2nd", tier: "$$$", why: "Stylish, romantic vibe" },
      { name: "Ibis Styles Paris République", area: "République", tier: "$", why: "Clean value near transit" },
    ],
    sights: [
      { name: "Louvre or Musée d'Orsay", tip: "Book timed entry" },
      { name: "Eiffel Tower area + Trocadéro", tip: "Sunset photo stop" },
      { name: "Notre-Dame + Île de la Cité", tip: "Combine with Sainte-Chapelle" },
      { name: "Montmartre / Sacré-Cœur", tip: "Morning is quieter" },
      { name: "Seine walk or bateaux-mouches", tip: "Easy evening activity" },
      { name: "Le Marais wander", tip: "Cafés, boutiques, Place des Vosges" },
    ],
    restaurants: [
      { name: "Bouillon Chartier", cuisine: "French classic", tier: "$", note: "Fun, historic, budget-friendly" },
      { name: "Chez Janou", cuisine: "Provençal", tier: "$$", note: "Great for couples/friends" },
      { name: "Breizh Café", cuisine: "Crêpes", tier: "$$", note: "Excellent for a casual meal" },
      { name: "Le Comptoir du Relais", cuisine: "Bistro", tier: "$$$", note: "Reserve if possible" },
      { name: "Du Pain et des Idées", cuisine: "Bakery", tier: "$", note: "Breakfast/pastry stop" },
    ],
    packing: "Comfortable walking shoes; light scarf/jacket; museum-friendly outfit.",
    visa: "Schengen rules apply — check your passport requirements.",
    tips: "Validate tickets; watch for pickpockets in tourist zones. Many restaurants close between lunch and dinner.",
  },
  bali: {
    name: "Bali, Indonesia",
    vibe: "temples, beaches, rice terraces, and slow mornings",
    base: "Ubud (culture) or Seminyak/Canggu (beach)",
    transit: {
      arrive: "Fly into DPS (Denpasar). Private driver transfer to hotel (~1–2 hours depending on area).",
      around: "Hire a driver by day, or scooter if experienced. Traffic is slow.",
      transfer: "Pre-book airport transfer — taxis can be inconsistent.",
    },
    hotels: [
      { name: "Ubud Village Hotel", area: "Ubud", tier: "$$", why: "Central, pool, good for couples" },
      { name: "Potato Head Suites", area: "Seminyak", tier: "$$$", why: "Beach-club energy, stylish" },
      { name: "Puri Garden Hotel", area: "Ubud", tier: "$", why: "Friendly value with pool" },
    ],
    sights: [
      { name: "Tegalalang Rice Terraces", tip: "Morning light is best" },
      { name: "Ubud Monkey Forest", tip: "Secure bags; watch the monkeys" },
      { name: "Tirta Empul or local temple visit", tip: "Dress modestly; sarong usually provided" },
      { name: "Uluwatu Temple + kecak dance", tip: "Sunset timing" },
      { name: "Canggu beach cafés", tip: "Relaxed afternoon" },
      { name: "Waterfall day (e.g. Tegenungan)", tip: "Combine with driver hire" },
    ],
    restaurants: [
      { name: "Locavore / Locavore to Go", cuisine: "Modern Indonesian", tier: "$$$$", note: "Splurge dinner if budget allows" },
      { name: "Warung Babi Guling Ibu Oka", cuisine: "Local", tier: "$", note: "Classic Ubud lunch" },
      { name: "Milk & Madu", cuisine: "Café", tier: "$$", note: "Brunch favorite" },
      { name: "Motel Mexicola", cuisine: "Mexican-ish / festive", tier: "$$", note: "Fun for friends" },
      { name: "Seasalt (Potato Head)", cuisine: "Seafood / Indonesian", tier: "$$$", note: "Beach dinner" },
    ],
    packing: "Light clothes, sarong, reef-safe sunscreen, mosquito repellent, rain jacket.",
    visa: "Many nationalities get VOA / visa-free — confirm current rules.",
    tips: "Agree on driver prices up front. Drink bottled water. Respect temple dress codes.",
  },
  nyc: {
    name: "New York City, USA",
    vibe: "neighborhoods, museums, food, and late nights",
    base: "Midtown or Downtown (SoHo / West Village)",
    transit: {
      arrive: "Fly into JFK, LGA, or EWR. AirTrain + subway, or rideshare.",
      around: "Subway is fastest. Walk a lot. Citi Bike optional.",
      transfer: "JFK AirTrain to Jamaica then E/J/Z or LIRR; LGA usually rideshare/bus.",
    },
    hotels: [
      { name: "Pod 51 / Pod Times Square", area: "Midtown", tier: "$", why: "Compact, affordable, central" },
      { name: "The Ludlow", area: "Lower East Side", tier: "$$$", why: "Stylish downtown base" },
      { name: "Arlo SoHo", area: "SoHo", tier: "$$", why: "Good location for walking neighborhoods" },
    ],
    sights: [
      { name: "Central Park", tip: "Morning stroll or picnic" },
      { name: "The Met or MoMA", tip: "Pick one major museum day" },
      { name: "Brooklyn Bridge walk", tip: "Start in Brooklyn for skyline views" },
      { name: "High Line + Chelsea Market", tip: "Combine easily" },
      { name: "Statue of Cruise / Battery Park", tip: "Book ferry if you want the island" },
      { name: "Times Square (quick pass)", tip: "Don't linger — grab a photo and move on" },
    ],
    restaurants: [
      { name: "Joe's Pizza", cuisine: "Pizza", tier: "$", note: "Classic NYC slice" },
      { name: "Russ & Daughters", cuisine: "Jewish deli / bagels", tier: "$$", note: "Great brunch stop" },
      { name: "Xi'an Famous Foods", cuisine: "Hand-pulled noodles", tier: "$", note: "Fast and flavorful" },
      { name: "Carbone", cuisine: "Italian-American", tier: "$$$$", note: "Hard reservation — have backups" },
      { name: "Levain Bakery", cuisine: "Cookies", tier: "$", note: "Snack between sights" },
    ],
    packing: "Layers (weather swings), comfortable shoes, MetroCard/OMNY-ready phone.",
    visa: "ESTA/visa as required for your nationality.",
    tips: "Use OMNY contactless on subway. Tip ~18–20% at restaurants.",
  },
  barcelona: {
    name: "Barcelona, Spain",
    vibe: "Gaudí, beaches, tapas, and late evenings",
    base: "Eixample or Gothic Quarter",
    transit: {
      arrive: "Fly into BCN. Aerobús or metro to city center.",
      around: "Metro + walking. T10 / Hola Barcelona card options.",
      transfer: "Aerobús to Plaça Catalunya is simplest for most hotels.",
    },
    hotels: [
      { name: "Hotel Casa Fuster", area: "Gràcia / Passeig de Gràcia", tier: "$$$", why: "Elegant Modernista landmark" },
      { name: "Generator Barcelona", area: "Gràcia", tier: "$", why: "Social, budget-friendly for friends" },
      { name: "Hotel Brummell", area: "Poble Sec", tier: "$$", why: "Design-forward, calm pool" },
    ],
    sights: [
      { name: "Sagrada Família", tip: "Book timed tickets weeks ahead" },
      { name: "Park Güell", tip: "Timed entry; go early" },
      { name: "Gothic Quarter wander", tip: "Get lost on purpose" },
      { name: "Casa Batlló or La Pedrera", tip: "Pick one Gaudí house" },
      { name: "Barceloneta Beach", tip: "Afternoon unwind" },
      { name: "Montjuïc views", tip: "Cable car or bus up" },
    ],
    restaurants: [
      { name: "Tickets / or a solid tapas bar like El Xampanyet", cuisine: "Tapas", tier: "$$–$$$$", note: "Book fancy spots; casual bars walk-in" },
      { name: "La Boqueria market stalls", cuisine: "Market", tier: "$", note: "Lunch grazing" },
      { name: "Cervecería Catalana", cuisine: "Tapas", tier: "$$", note: "Popular — go early" },
      { name: "Bar Cañete", cuisine: "Andalusian", tier: "$$$", note: "Great for couples" },
      { name: "Granja M. Viader", cuisine: "Café", tier: "$", note: "Classic chocolate + churros energy" },
    ],
    packing: "Light clothes, walking shoes, modest cover-up for churches.",
    visa: "Schengen rules — check your passport.",
    tips: "Watch for pickpockets on Las Ramblas/metro. Dinner often starts after 8:30pm.",
  },
};

const PURPOSE_TONE = {
  anniversary: "romantic pacing, one memorable dinner, sunset moments",
  relaxation: "slow mornings, spa/pool time, fewer transfers",
  adventure: "active days, hikes or unique experiences, early starts",
  food: "market visits, reservation-worthy meals, neighborhood food walks",
  sightseeing: "efficient sight clustering, photo stops, museum time",
  birthday: "one celebration meal, flexible afternoon, photo-friendly spots",
};

function parseBudget(text) {
  const m = String(text || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 2000;
}

function parseNights(dates) {
  // Try to find two dates and estimate nights; fallback 3 nights
  const s = String(dates || "");
  const nums = s.match(/\d{1,2}/g);
  if (nums && nums.length >= 2) {
    const a = Number(nums[0]);
    const b = Number(nums[1]);
    if (b > a && b - a <= 21) return Math.max(1, b - a);
  }
  // "4 days" / "3 nights"
  const nights = s.match(/(\d+)\s*nights?/i);
  if (nights) return Math.max(1, Number(nights[1]));
  const days = s.match(/(\d+)\s*days?/i);
  if (days) return Math.max(1, Number(days[1]) - 1);
  return 3;
}

function parsePeople(groupSize, relationship) {
  const s = String(groupSize || "");
  const adults = s.match(/(\d+)\s*adults?/i);
  const kids = s.match(/(\d+)\s*kids?/i) || s.match(/(\d+)\s*children/i);
  if (adults) return Number(adults[1]) + (kids ? Number(kids[1]) : 0);
  const justNum = s.match(/^(\d+)/);
  if (justNum) return Number(justNum[1]);
  if (relationship === "couple") return 2;
  if (relationship === "family") return 4;
  return 3;
}

function normalizeDest(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;
  for (const key of Object.keys(DESTINATIONS)) {
    if (t.includes(key) || DESTINATIONS[key].name.toLowerCase().includes(t)) return key;
  }
  // aliases
  if (t.includes("new york") || t.includes("manhattan")) return "nyc";
  if (t.includes("denpasar") || t.includes("ubud") || t.includes("seminyak")) return "bali";
  return null;
}

function suggestDestinations(relationship, purpose, budget) {
  const purposeL = String(purpose || "").toLowerCase();
  const picks = [];
  if (purposeL.includes("romantic") || purposeL.includes("anniversary") || relationship === "couple") {
    picks.push("kyoto", "paris", "bali");
  } else if (purposeL.includes("adventure")) {
    picks.push("bali", "tokyo", "barcelona");
  } else if (purposeL.includes("food")) {
    picks.push("tokyo", "barcelona", "paris");
  } else if (relationship === "family") {
    picks.push("tokyo", "paris", "nyc");
  } else {
    picks.push("barcelona", "tokyo", "nyc");
  }
  // Prefer cheaper if budget is tight
  if (budget < 1500) return ["bali", "barcelona", "kyoto"].map((k) => DESTINATIONS[k].name);
  return picks.map((k) => DESTINATIONS[k].name);
}

function pickTone(purpose) {
  const p = String(purpose || "").toLowerCase();
  for (const [k, v] of Object.entries(PURPOSE_TONE)) {
    if (p.includes(k)) return v;
  }
  return "balanced sightseeing with good food and downtime";
}

function pickSights(dest, relationship, purpose, days) {
  let sights = [...dest.sights];
  const p = String(purpose || "").toLowerCase();
  if (relationship === "family") {
    sights = sights.filter((s) => !/late|bar|club/i.test(s.name));
  }
  if (p.includes("food")) {
    sights = sights.sort((a, b) => (/market|food/i.test(a.name) ? -1 : 1) - (/market|food/i.test(b.name) ? -1 : 1));
  }
  return sights.slice(0, Math.min(sights.length, days * 2));
}

function pickRestaurants(dest, relationship, purpose) {
  let list = [...dest.restaurants];
  if (relationship === "couple" || /anniversary|romantic/i.test(purpose || "")) {
    list = list.sort((a, b) => (a.tier.length >= b.tier.length ? -1 : 1));
  }
  if (relationship === "friends") {
    list = list.sort((a, b) => (/fun|lively|friends|festive/i.test(a.note) ? -1 : 1));
  }
  return list;
}

function budgetSplit(total, nights, people) {
  const transport = Math.round(total * 0.35);
  const stay = Math.round(total * 0.30);
  const food = Math.round(total * 0.20);
  const activities = Math.round(total * 0.10);
  const buffer = Math.max(0, total - transport - stay - food - activities);
  return {
    transport,
    stay,
    food,
    activities,
    buffer,
    nightly: nights ? Math.round(stay / nights) : stay,
    perPersonFood: people ? Math.round(food / people) : food,
  };
}

function whyHotel(h, input, isTop) {
  let why = h.why;
  if (isTop) {
    if (input.relationship === "couple" || /anniversary|romantic/i.test(input.purpose || "")) {
      why += `. Especially strong for couples — quiet atmosphere, easy to reach dinner spots, and a good base for ${input.purpose || "your celebration"}.`;
    } else if (input.relationship === "family") {
      why += `. Family-friendly location in ${h.area} with practical access to transit and food options.`;
    } else {
      why += `. Matches your ${input.purpose || "trip"} goal and keeps you near ${h.area}.`;
    }
  }
  return why;
}

function whyRestaurant(r, input) {
  const base = r.note;
  if (/anniversary|romantic/i.test(input.purpose || "") && r.tier.includes("$")) {
    return `${base} — worth booking ahead for a special evening.`;
  }
  if (input.relationship === "friends" && /fun|lively/i.test(r.note)) {
    return `${base} — lively vibe that works well for groups.`;
  }
  return `${base} — solid pick for ${input.purpose || "sightseeing"} in the area.`;
}

function whySight(s, input) {
  if (/anniversary|romantic/i.test(input.purpose || "")) {
    return `${s.tip} Great photo spot for couples.`;
  }
  if (input.relationship === "family") {
    return `${s.tip} Allow extra time if traveling with kids.`;
  }
  return s.tip;
}

function dayLabel(i, lang) {
  return lang === "zh" ? `第 ${i + 1} 天` : `Day ${i + 1}`;
}

const PLAN_L = {
  en: {
    title: "Travel plan",
    overview: "Overview",
    transport: "Transportation",
    hotels: "🏨 Where to Stay — hotels we recommend",
    daily: "📅 Daily Itinerary",
    restaurants: "🍽 Restaurants — where to eat",
    sights: "📍 Places to Visit",
    budget: "Budget Breakdown",
    practical: "Practical Notes",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    neighborhood: "Neighborhood",
    price: "Price tier",
    why: "Why we recommend it",
    booking: "Booking tip",
    cuisine: "Cuisine",
    whyGo: "Why go",
    time: "Time needed",
    topPick: "⭐ Top pick for you",
  },
  zh: {
    title: "旅行计划",
    overview: "概览",
    transport: "交通",
    hotels: "🏨 推荐住宿",
    daily: "📅 每日行程",
    restaurants: "🍽 推荐餐厅",
    sights: "📍 推荐景点",
    budget: "预算明细",
    practical: "实用信息",
    morning: "上午",
    afternoon: "下午",
    evening: "晚上",
    neighborhood: "区域",
    price: "价格",
    why: "推荐理由",
    booking: "预订建议",
    cuisine: "菜系",
    whyGo: "推荐理由",
    time: "建议时长",
    topPick: "⭐ 为您首选",
  },
};

function buildDayPlan(i, nights, dest, sights, restaurants, relationship, purpose) {
  const morning = sights[(i * 2) % sights.length];
  const afternoon = sights[(i * 2 + 1) % sights.length];
  const dinner = restaurants[i % restaurants.length];
  const lunch = restaurants[(i + 2) % restaurants.length];
  const isFirst = i === 0;
  const isLast = i === nights; // day index 0..nights (nights+1 days roughly) — we'll generate nights+1 days max nights days of full touring

  let morningText, afternoonText, eveningText;
  if (isFirst) {
    morningText = `Arrive and transfer to your hotel near **${dest.base}**. Check in and freshen up.`;
    afternoonText = `Easy first walk: **${morning.name}** — ${morning.tip}. Keep it light after travel.`;
    eveningText = `Dinner at **${dinner.name}** (${dinner.cuisine}, ${dinner.tier}) — ${dinner.note}.`;
  } else if (i === nights) {
    morningText = `Morning visit to **${morning.name}** — ${morning.tip}. Leave bags at hotel if needed.`;
    afternoonText = `Final café / souvenir stop, then transfer to the airport/station.`;
    eveningText = `Travel home (or evening flight — build buffer for security/traffic).`;
  } else {
    morningText = `**${morning.name}** — ${morning.tip}.`;
    afternoonText = `**${afternoon.name}** — ${afternoon.tip}. Lunch at **${lunch.name}** (${lunch.cuisine}, ${lunch.tier}).`;
    eveningText = `Dinner at **${dinner.name}** (${dinner.cuisine}, ${dinner.tier}) — ${dinner.note}.`;
    if (/relax/i.test(purpose || "")) {
      afternoonText += " Leave a 1–2 hour rest window at the hotel.";
    }
    if (relationship === "couple" && /anniversary|romantic/i.test(purpose || "")) {
      eveningText += " Aim for a sunset walk before dinner.";
    }
  }
  return { morningText, afternoonText, eveningText, dinner, lunch };
}

function genericDestination(name) {
  const label = name && name.trim() ? name.trim() : "Your chosen destination";
  return {
    name: label,
    vibe: "a mix of local sights, food, and neighborhood walks",
    base: "a central, walkable neighborhood near transit",
    transit: {
      arrive: `Fly or train into the main gateway for ${label}. Pre-book airport/station transfer if arriving late.`,
      around: "Prefer public transit + walking; rent a car only if day trips require it.",
      transfer: "Use official taxis, rideshare, or airport express trains when available.",
    },
    hotels: [
      { name: "Well-reviewed mid-range hotel near the historic center", area: "City center", tier: "$$", why: "Balances location and budget" },
      { name: "Boutique hotel with strong recent reviews", area: "Trendy district", tier: "$$$", why: "Better for couples / special occasions" },
      { name: "Clean budget hotel or aparthotel near a metro stop", area: "Transit hub", tier: "$", why: "Keeps more budget for food and activities" },
    ],
    sights: [
      { name: "Main historic / cultural landmark", tip: "Book tickets if popular" },
      { name: "Best viewpoint or waterfront walk", tip: "Go near sunset" },
      { name: "Local market or old town streets", tip: "Morning energy + snacks" },
      { name: "Museum or gallery highlight", tip: "Pick one major indoor activity" },
      { name: "Neighborhood café crawl", tip: "Ask hotel for current favorites" },
      { name: "Day-trip option nearby", tip: "Only if energy and budget allow" },
    ],
    restaurants: [
      { name: "Popular local casual spot", cuisine: "Local", tier: "$", note: "Ask hotel for the current favorite" },
      { name: "Mid-range neighborhood restaurant", cuisine: "Regional", tier: "$$", note: "Reserve on weekends" },
      { name: "Special-occasion restaurant", cuisine: "Fine dining / tasting", tier: "$$$", note: "Book ahead for anniversary/birthday" },
      { name: "Market / street-food lunch", cuisine: "Casual", tier: "$", note: "Great for friends/family" },
      { name: "Café with great coffee & pastry", cuisine: "Café", tier: "$", note: "Easy breakfast stop" },
    ],
    packing: "Comfortable walking shoes, weather-appropriate layers, portable charger.",
    visa: "Confirm passport/visa rules for your nationality before booking.",
    tips: "Save offline maps. Keep a small cash buffer. Book the top 1–2 must-see tickets early.",
  };
}

export function generatePlan(input) {
  const lang = input.language === "zh" ? "zh" : "en";
  const L = PLAN_L[lang];
  const relationship = input.relationship || "friends";
  const purpose = input.purpose || "sightseeing";
  const dates = input.dates || "";
  const notes = input.notes || "";
  const budgetTotal = parseBudget(input.budget);
  const nights = parseNights(dates);
  const people = parsePeople(input.groupSize, relationship);
  const days = nights + 1;

  let destKey = normalizeDest(input.destination);
  let suggestions = null;
  if (!destKey) {
    if (!input.destination || !String(input.destination).trim()) {
      suggestions = suggestDestinations(relationship, purpose, budgetTotal);
      destKey = normalizeDest(suggestions[0]);
    }
  }

  const dest = destKey ? DESTINATIONS[destKey] : genericDestination(input.destination);
  const tone = pickTone(purpose);
  const sights = pickSights(dest, relationship, purpose, days);
  const restaurants = pickRestaurants(dest, relationship, purpose);
  const split = budgetSplit(budgetTotal, nights, people);

  const hotelRec =
    relationship === "couple" || /anniversary|romantic/i.test(purpose)
      ? dest.hotels.find((h) => h.tier === "$$$") || dest.hotels[0]
      : relationship === "family"
        ? dest.hotels.find((h) => h.tier === "$$") || dest.hotels[0]
        : dest.hotels.find((h) => h.tier === "$") || dest.hotels[0];

  const lines = [];
  lines.push(`# ${L.title} — ${dest.name}`);
  lines.push("");
  lines.push(`## ${L.overview}`);
  lines.push("");
  lines.push(`- **Trip:** ${relationship}${input.groupSize ? ` (${input.groupSize})` : ` (~${people} people)`}`);
  lines.push(`- **Dates:** ${dates || "(add your dates)"} — about **${nights} night${nights === 1 ? "" : "s"} / ${days} days**`);
  lines.push(`- **Budget:** ~$${budgetTotal.toLocaleString()} total`);
  lines.push(`- **Purpose:** ${purpose} — plan style: ${tone}`);
  if (suggestions) {
    lines.push(`- **Destination:** You left this blank — suggested fits: **${suggestions.join(" · ")}**. Planning for **${dest.name}** (top pick).`);
  } else {
    lines.push(`- **Destination:** ${dest.name} — ${dest.vibe}`);
  }
  lines.push(`- **Base neighborhood:** ${dest.base}`);
  lines.push(`- **Recommended hotel pick:** ${hotelRec.name} (${hotelRec.tier}) — ${hotelRec.why}`);
  if (notes) lines.push(`- **Your notes:** ${notes}`);
  lines.push("");
  lines.push(`## ${L.transport}`);
  lines.push("");
  lines.push(`**Getting there**`);
  lines.push(`- ${dest.transit.arrive}`);
  lines.push("");
  lines.push(`**Getting around**`);
  lines.push(`- ${dest.transit.around}`);
  lines.push(`- ${dest.transit.transfer}`);
  lines.push("");
  lines.push(`## ${L.hotels}`);
  lines.push("");
  for (const h of dest.hotels) {
    const isTop = h.name === hotelRec.name;
    lines.push(`### ${h.name}${isTop ? ` ${L.topPick}` : ""}`);
    lines.push(`- **${L.neighborhood}:** ${h.area}`);
    lines.push(`- **${L.price}:** ${h.tier}`);
    lines.push(`- **${L.why}:** ${whyHotel(h, input, isTop)}`);
    lines.push(`- **${L.booking}:** ${isTop ? (lang === "zh" ? "建议先订可退款房型，最匹配您的行程。" : "Book refundable rate first; best match for your trip.") : (lang === "zh" ? "若首选已满可作为备选。" : "Good alternative if top pick is sold out.")}`);
    lines.push("");
  }
  lines.push(`**${lang === "zh" ? "住宿预算" : "Stay budget"}:** ~$${split.stay.toLocaleString()} (${split.nightly}/${lang === "zh" ? "晚" : "night"} × ${nights})`);
  lines.push("");
  lines.push(`## ${L.daily}`);
  lines.push("");

  for (let i = 0; i < days; i++) {
    const d = buildDayPlan(i, nights, dest, sights, restaurants, relationship, purpose);
    lines.push(`### ${dayLabel(i, lang)}`);
    lines.push(`- **${L.morning}:** ${d.morningText}`);
    lines.push(`- **${L.afternoon}:** ${d.afternoonText}`);
    lines.push(`- **${L.evening}:** ${d.eveningText}`);
    lines.push("");
  }

  lines.push(`## ${L.restaurants}`);
  lines.push("");
  for (const r of restaurants) {
    lines.push(`### ${r.name}`);
    lines.push(`- **${L.cuisine}:** ${r.cuisine}`);
    lines.push(`- **${L.price}:** ${r.tier}`);
    lines.push(`- **${L.why}:** ${whyRestaurant(r, input)}`);
    lines.push("");
  }
  lines.push(`## ${L.sights}`);
  lines.push("");
  for (const s of sights) {
    lines.push(`### ${s.name}`);
    lines.push(`- **${L.whyGo}:** ${whySight(s, input)}`);
    lines.push(`- **${L.time}:** ${lang === "zh" ? "约 1–2 小时" : "about 1–2 hours"}`);
    lines.push("");
  }
  lines.push(`## ${L.budget}`);
  lines.push("");
  lines.push("| Category | Estimate | Notes |");
  lines.push("|----------|----------|-------|");
  lines.push(`| Transport | $${split.transport.toLocaleString()} | Flights/trains + local transit (~35%) |`);
  lines.push(`| Accommodation | $${split.stay.toLocaleString()} | ${nights} nights (~$${split.nightly}/night) |`);
  lines.push(`| Food | $${split.food.toLocaleString()} | ~$${split.perPersonFood}/person share of food budget |`);
  lines.push(`| Activities | $${split.activities.toLocaleString()} | Tickets, tours, experiences |`);
  lines.push(`| Buffer | $${split.buffer.toLocaleString()} | Souvenirs / surprises |`);
  lines.push(`| **Total** | **$${budgetTotal.toLocaleString()}** | Matches your stated budget |`);
  lines.push("");
  lines.push(`## ${L.practical}`);
  lines.push("");
  lines.push(`- **Visa / entry:** ${dest.visa}`);
  lines.push(`- **Packing:** ${dest.packing}`);
  lines.push(`- **Local tips:** ${dest.tips}`);
  lines.push(`- **Book now:** hotel (refundable if unsure), any timed-entry sights, and 1 special dinner if celebrating.`);
  if (relationship === "family") {
    lines.push("- **Family tip:** Schedule a quieter afternoon every day; keep dinners earlier.");
  }
  if (relationship === "couple") {
    lines.push("- **Couple tip:** Leave one evening unscheduled for wandering — often the best memories.");
  }
  if (relationship === "friends") {
    lines.push("- **Friends tip:** Split into optional activities one afternoon so energy levels can differ.");
  }
  lines.push("");
  lines.push("---");
  lines.push("*Generated offline by TravelAO — no API key required. Treat restaurant/hotel availability as suggestions and reconfirm before booking.*");
  lines.push("");

  return lines.join("\n");
}
