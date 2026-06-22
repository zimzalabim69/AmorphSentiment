/**
 * Fast local sentiment fallback — no API call needed.
 * Uses word-list scoring so signals always have rich data
 * even when Groq is rate-limited or offline.
 */

const POSITIVE_WORDS = new Set([
  "good","great","excellent","amazing","awesome","fantastic","wonderful","love","best","happy",
  "excited","thrilled","pleased","delighted","optimistic","hopeful","confident","strong","growth",
  "boom","surge","rally","gain","profit","success","win","victory","breakthrough","innovation",
  "bullish","moon","rocket","soar","rally","up","rise","green","buy","hodl","pump",
  "celebrate","congratulations","praise","admire","enjoy","fun","beautiful","perfect","brilliant",
]);

const NEGATIVE_WORDS = new Set([
  "bad","terrible","awful","horrible","hate","worst","sad","angry","mad","furious","disappointed",
  "worried","anxious","scared","afraid","panic","fear","dread","crisis","disaster","collapse",
  "crash","dump","plunge","drop","fall","decline","loss","fail","bankrupt","bearish","short",
  "sell","red","down","crash","recession","depression","inflation","unemployment","war","conflict",
  "attack","death","kill","murder","violence","crime","corruption","scandal","fraud","lie",
]);

const INTENSITY_WORDS = new Set([
  "extremely","incredibly","absolutely","totally","completely","utterly","devastating","massive",
  "huge","enormous","gigantic","insane","crazy","wild","freaking","fucking","damn","shit",
  "wow","omg","unbelievable","shocking","stunning","astonishing","outrageous","scandalous",
]);

const EMOTION_PATTERNS: { label: string; words: string[] }[] = [
  { label: "Joy", words: ["happy","joy","delighted","cheerful","elated","bliss","ecstatic","gleeful"] },
  { label: "Anger", words: ["angry","mad","furious","rage","irritated","annoyed","outraged","livid"] },
  { label: "Fear", words: ["scared","afraid","terrified","panic","anxious","worried","nervous","dread"] },
  { label: "Sadness", words: ["sad","depressed","gloomy","melancholy","sorrow","grief","miserable","heartbroken"] },
  { label: "Surprise", words: ["surprised","shocked","amazed","astonished","stunned","bewildered","confused"] },
  { label: "Trust", words: ["trust","confident","reliable","dependable","faith","loyal","honest","sincere"] },
  { label: "Anticipation", words: ["excited","eager","hopeful","optimistic","enthusiastic","keen","ready"] },
];

const ENTITY_PATTERNS: { type: string; regex: RegExp }[] = [
  { type: "TICKER", regex: /\b[A-Z]{1,5}\b/g },
  { type: "PERSON", regex: /\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g },
  { type: "ORG", regex: /\b(Inc\.?|Corp\.?|Ltd\.?|LLC|Company|Corporation|Bank|University|Institute)\b/gi },
  { type: "GPE", regex: /\b(USA|US|UK|China|Russia|India|Japan|Germany|France|Brazil|Canada|Australia|Mexico|Israel|Ukraine|Iran|North Korea|South Korea|Taiwan|Hong Kong|Singapore|Dubai|London|Paris|Tokyo|Beijing|Moscow|Berlin|New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Omaha|Miami|Oakland|Minneapolis|Tulsa|Cleveland|Wichita|Arlington|New Orleans|Bakersfield|Tampa|Aurora|Honolulu|Anaheim|Santa Ana|Corpus Christi|Riverside|Lexington|Stockton|Henderson|Saint Paul|Cincinnati|St\. Louis|Orlando|Pittsburgh|Greensboro|Lincoln|Anchorage|Plano|Durham|Jersey City|Chandler|Chula Vista|Buffalo|North Las Vegas|Gilbert|Reno|Madison|Irving|Chesapeake|Fremont|Norfolk|Paradise|Arlington|Richmond|Hialeah|Garland|Glendale|Scottsdale|Baton Rouge|Fremont|Spokane|Santa Clarita|San Bernardino|Modesto|Fontana|Moreno Valley|Des Moines|Rochester|Yonkers|Fayetteville|Worcester|Columbus|Cape Coral|McKinney|Little Rock|Oxnard|Amarillo|Huntsville|Augusta|Grand Rapids|Salt Lake City|Mobile|Overland Park|Knoxville|Grand Prairie|Brownsville|Tempe|Providence|Fort Lauderdale|Chattanooga|Newport News|Huntsville|Frisco|Cary|Clarksville|Ontario|McAllen|Killeen|Waco|Lancaster|Pasadena|Hayward|Alexandria|Pomona|Palmdale|Lakewood|Sunnyvale|Escondido|Hollywood|Clarksville|Paterson|Mesquite|Savannah|Bridgeport|Syracuse|Metairie|Orange|Fullerton|Torrance|Thornton|Roseville|Surprise|Macon|Denton|Visalia|Olathe|Elizabeth|Gainesville|Carrollton|Coral Springs|Stamford|Simi Valley|Concord|New Haven|Thousand Oaks|Santa Clara|Abilene|Athens|Topeka|Peoria|Lafayette|Norman|Midland|Denton|Berkeley|Cambridge|Clearwater|Independence|Columbia|West Jordan|Round Rock|Richardson|Downey|Miami Gardens|El Monte|Inglewood|League City|Broken Arrow|Costa Mesa|College Station|Peoria|Westminster|Manchester|Lowell|Gresham|North Charleston|Miramar|Daly City|Jurupa Valley|West Covina|Murrieta|Green Bay|High Point|Palm Bay|Temecula|Antioch|Everett|Santa Maria|Wichita Falls|Lewisville|Lakeland|Edison|Springfield|Pompano Beach|Billings|Fairfield|San Mateo|South Bend|Ventura|Brockton|El Cajon|Jurupa Valley|Rialto|Davenport|Hillsboro|Arvada|Rochester|Clovis|Meridian|West Palm Beach|Denton|Kennewick|Greenville|Allentown|Olathe|Waterbury|Lansing|Lafayette|Beaumont|Greeley| Pueblo|Norman|Boulder|Burbank|Davie|South Gate|Mission Viejo|Albany|Edinburg|San Angelo|Decatur|Springfield|Leesburg|Renton|Bellingham|Westland|Federal Way|Rapid City|Bloomington|Waterloo|Duluth|Carmel|Fishers|Wilmington|Bloomington|Avondale|Goodyear|Lake Forest|Jackson|Youngstown|St. Joseph|Frederick|Franklin|Meridian|St. George|Flagstaff|Johnson City|Nampa|Edmond|Jonesboro|Bloomington|Woodbury|Yakima|Kalamazoo|Champaign|Springdale|Santa Monica|Roanoke|Terre Haute|Grand Forks|Mount Pleasant|Redwood City|Missoula|Charleston|Mansfield|Glendale|Carson|Petaluma|Bend|Redding|Chico|Appleton|St. Cloud|Gaithersburg|Frederick|Kennewick|Pasco|Richland|Sioux City|Iowa City|Lawrence|Oshkosh|Eau Claire|Janesville|Wausau|Sheboygan|La Crosse|Kenosha|Racine|Appleton|Oshkosh|Waukesha|West Allis|Brookfield|New Berlin|Greenfield|Franklin|Oak Creek|Menomonee Falls|Mount Pleasant|Wauwatosa|Mequon|Whitefish Bay|Shorewood|Glendale|Brown Deer|Fox Point|Bayside|River Hills|Thiensville|Brown Deer|Milwaukee|Waukesha|Racine|Kenosha|West Bend|Port Washington|Oconomowoc|Hartland|Pewaukee|Sussex|Merton|Delafield|Elm Grove|Brookfield|New Berlin|Greenfield|Franklin|Hales Corners|Greendale|St. Francis|Cudahy|South Milwaukee|Oak Creek|Franklin|Muskego|Big Bend|Vernon|Waukesha|Washington|Ozaukee|Dodge|Jefferson|Walworth|Racine|Kenosha) (?!\w)/gi },
];

export interface SimpleSentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  scores: { positive: number; negative: number; neutral: number };
  intensity: number;
  emotions: { label: string; value: number }[];
  entities: { name: string; type: string }[];
  key_phrases: string[];
  topics: string[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function analyzeSimple(text: string): SimpleSentimentResult {
  const words = tokenize(text);
  let pos = 0, neg = 0, intense = 0;

  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
    if (INTENSITY_WORDS.has(w)) intense++;
  }

  const total = pos + neg || 1;
  const p = pos / total;
  const n = neg / total;
  const neu = total === 1 && pos === 0 && neg === 0 ? 1 : Math.max(0, 1 - p - n);

  // Normalize to sum ~1
  const sum = p + n + neu || 1;
  const scores = { positive: p / sum, negative: n / sum, neutral: neu / sum };

  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (scores.positive > scores.negative && scores.positive > scores.neutral) sentiment = "positive";
  else if (scores.negative > scores.positive && scores.negative > scores.neutral) sentiment = "negative";

  const intensity = Math.min(1, (intense * 0.2) + (Math.abs(scores.positive - scores.negative) * 0.8) + 0.1);

  // Emotions
  const emotionScores: Record<string, number> = {};
  for (const { label, words: ew } of EMOTION_PATTERNS) {
    let count = 0;
    for (const w of words) if (ew.includes(w)) count++;
    if (count > 0) emotionScores[label] = Math.min(1, count * 0.3 + 0.1);
  }
  const emotions = Object.entries(emotionScores)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // Entities
  const entities: { name: string; type: string }[] = [];
  const seen = new Set<string>();
  for (const { type, regex } of ENTITY_PATTERNS) {
    const matches = text.match(regex) || [];
    for (const m of matches) {
      const key = `${m}|${type}`;
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({ name: m.trim(), type });
      }
    }
  }

  // Key phrases: bigrams with sentiment words
  const key_phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (POSITIVE_WORDS.has(words[i]) || NEGATIVE_WORDS.has(words[i])) {
      key_phrases.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  // Topics: simple keyword matching
  const topicMap: Record<string, string[]> = {
    politics: ["trump","biden","election","vote","congress","senate","policy","government","democrat","republican","gop","political","campaign","president"],
    crypto: ["bitcoin","btc","ethereum","eth","crypto","blockchain","nft","defi","altcoin","token","mining","wallet"],
    tech: ["ai","apple","google","microsoft","meta","tesla","nvidia","chip","software","app","iphone","android","cloud","startup","silicon"],
    markets: ["stock","market","trade","trading","investor","portfolio","dividend","nasdaq","dow","s&p","etf","futures","option","bull","bear"],
    conflict: ["war","ukraine","russia","israel","gaza","hamas","military","attack","invasion","sanction","nato","defense","weapon","missile"],
    health: ["covid","vaccine","virus","disease","hospital","doctor","health","medicine","pandemic","flu","cancer","diabetes"],
    climate: ["climate","weather","storm","flood","drought","heat","wildfire","hurricane","tornado","earthquake","tsunami","green","carbon","renewable"],
    sports: ["game","team","player","score","win","loss","championship","nba","nfl","mlb","nhl","soccer","football","basketball","tennis","golf"],
    entertainment: ["movie","film","actor","actress","music","album","song","concert","celebrity","netflix","disney","stream","show","series"],
  };

  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((k) => words.includes(k))) topics.push(topic);
  }

  return {
    sentiment,
    scores,
    intensity,
    emotions,
    entities: entities.slice(0, 5),
    key_phrases: [...new Set(key_phrases)].slice(0, 3),
    topics: topics.slice(0, 3),
  };
}
