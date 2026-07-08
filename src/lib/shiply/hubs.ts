import { haversineMiles } from "@/lib/shiply/geo";

export type UkHub = {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
};

// ~90 UK hub cities/regions for matrix columns. Sub-areas (towns, London zones)
// roll up into the nearest hub.
export const UK_HUBS: UkHub[] = [
  { name: "London", lat: 51.5074, lng: -0.1278, aliases: ["greater london", "london sw", "london se", "london w", "london n", "london e", "london nw", "london ne", "london ec", "london wc", "croydon", "bromley", "enfield", "wembley", "hounslow", "kingston upon thames", "romford", "ilford", "woolwich", "greenwich", "barking", "dagenham", "uxbridge", "hayes", "feltham", "twickenham", "richmond", "wimbledon", "tooting", "brixton", "camden", "islington", "hackney", "stratford", "walthamstow", "tottenham", "barnet", "harrow", "ealing", "acton", "chiswick", "putney", "clapham", "lewisham", "catford", "beckenham", "orpington", "sutton", "morden", "wallington"] },
  { name: "Birmingham", lat: 52.4862, lng: -1.8904, aliases: ["west midlands", "solihull", "sutton coldfield", "erdington", "smethwick", "west bromwich", "oldbury", "dudley", "walsall", "wolverhampton"] },
  { name: "Manchester", lat: 53.4808, lng: -2.2426, aliases: ["salford", "stockport", "oldham", "rochdale", "bolton", "bury", "wigan", "altrincham", "sale", "stretford", "urmston", "eccles", "swinton", "failsworth", "middleton", "ashton-under-lyne", "hyde", "stalybridge", "droylesden", "denton"] },
  { name: "Liverpool", lat: 53.4084, lng: -2.9916, aliases: ["birkenhead", "bootle", "crosby", "southport", "wallasey", "wirral", "huyton", "kirkby", "prescot", "st helens", "widnes", "runcorn"] },
  { name: "Leeds", lat: 53.8008, lng: -1.5491, aliases: ["bradford", "wakefield", "huddersfield", "halifax", "dewsbury", "batley", "morley", "pudsey", "otley", "wetherby", "castleford", "pontefract", "featherstone"] },
  { name: "Sheffield", lat: 53.3811, lng: -1.4701, aliases: ["rotherham", "barnsley", "doncaster", "chesterfield", "worksop", "dinnington", "chapeltown"] },
  { name: "Bristol", lat: 51.4545, lng: -2.5879, aliases: ["bath", "weston-super-mare", "weston super mare", "clevedon", "portishead", "nailsea", "keynsham", "yate", "thornbury"] },
  { name: "Glasgow", lat: 55.8642, lng: -4.2518, aliases: ["paisley", "east kilbride", "hamilton", "cumbernauld", "coatbridge", "motherwell", "clydebank", "bearsden", "milngavie", "kirkintilloch"] },
  { name: "Edinburgh", lat: 55.9533, lng: -3.1883, aliases: ["leith", "musselburgh", "livingston", "dalkeith", "penicuik", "kirkcaldy"] },
  { name: "Newcastle", lat: 54.9783, lng: -1.6178, aliases: ["newcastle upon tyne", "gateshead", "sunderland", "south shields", "north shields", "tynemouth", "whitley bay", "blyth", "cramlington", "washington", "hebburn", "jarrow"] },
  { name: "Nottingham", lat: 52.9548, lng: -1.1581, aliases: ["mansfield", "beeston", "hucknall", "arnold", "carlton", "worksop", "newark"] },
  { name: "Leicester", lat: 52.6369, lng: -1.1398, aliases: ["loughborough", "hinckley", "coalville", "market harborough", "melton mowbray", "wigston", "oadby"] },
  { name: "Coventry", lat: 52.4068, lng: -1.5197, aliases: ["rugby", "nuneaton", "bedworth", "kenilworth", "warwick", "leamington spa", "royal leamington spa"] },
  { name: "Cardiff", lat: 51.4816, lng: -3.1791, aliases: ["newport", "barry", "caerphilly", "pontypridd", "bridgend", "penarth", "rhondda", "merthyr tydfil"] },
  { name: "Belfast", lat: 54.5973, lng: -5.9301, aliases: ["lisburn", "newtownabbey", "bangor", "carrickfergus", "holywood", "antrim", "newtownards"] },
  { name: "Southampton", lat: 50.9097, lng: -1.4044, aliases: ["portsmouth", "fareham", "gosport", "eastleigh", "winchester", "andover", "basingstoke", "aldershot", "farnborough", "havant", "waterlooville"] },
  { name: "Brighton", lat: 50.8225, lng: -0.1372, aliases: ["hove", "worthing", "eastbourne", "hastings", "bexhill", "lewes", "shoreham-by-sea", "shoreham", "littlehampton", "chichester"] },
  { name: "Plymouth", lat: 50.3755, lng: -4.1427, aliases: ["exeter", "torquay", "paignton", "newton abbot", "totnes", "ivybridge", "saltash", "tavistock"] },
  { name: "Norwich", lat: 52.6309, lng: 1.2974, aliases: ["great yarmouth", "lowestoft", "dereham", "thetford", "diss", "cromer", "sheringham", "wymondham"] },
  { name: "Cambridge", lat: 52.2053, lng: 0.1218, aliases: ["ely", "huntingdon", "st neots", "march", "wisbech", "newmarket", "royston"] },
  { name: "Oxford", lat: 51.752, lng: -1.2577, aliases: ["abingdon", "banbury", "bicester", "witney", "didcot", "wallingford", "thame", "henley-on-thames", "henley"] },
  { name: "Reading", lat: 51.4543, lng: -0.9781, aliases: ["slough", "maidenhead", "windsor", "bracknell", "wokingham", "newbury", "thatcham", "hungerford"] },
  { name: "Milton Keynes", lat: 52.0406, lng: -0.7594, aliases: ["bedford", "luton", "dunstable", "leighton buzzard", "newport pagnell", "bletchley", "wolverton", "ampthill"] },
  { name: "Northampton", lat: 52.2405, lng: -0.9027, aliases: ["kettering", "corby", "wellingborough", "rushden", "daventry", "towcester", "brackley"] },
  { name: "Derby", lat: 52.9225, lng: -1.4746, aliases: ["burton upon trent", "burton-on-trent", "burton", "uttoxeter", "ashbourne", "swadlincote", "ilkeston", "long eaton"] },
  { name: "Stoke-on-Trent", lat: 53.0027, lng: -2.1794, aliases: ["stoke", "newcastle-under-lyme", "stafford", "crewe", "nantwich", "stone", "leek", "kidsgrove"] },
  { name: "Hull", lat: 53.7676, lng: -0.3274, aliases: ["kingston upon hull", "beverley", "bridlington", "goole", "hornsea", "hessle", "cottingham", "driffield", "scunthorpe", "grimsby", "cleethorpes"] },
  { name: "Middlesbrough", lat: 54.5742, lng: -1.235, aliases: ["stockton-on-tees", "stockton", "hartlepool", "redcar", "darlington", "yarm", "billingham", "guisborough"] },
  { name: "York", lat: 53.959, lng: -1.0815, aliases: ["harrogate", "scarborough", "whitby", "malton", "selby", "tadcaster", "ripon", "knaresborough", "thirsk"] },
  { name: "Preston", lat: 53.7632, lng: -2.7031, aliases: ["blackpool", "blackburn", "burnley", "lancaster", "chorley", "leyland", "ormskirk", "southport", "fleetwood", "lytham st annes", "accrington", "nelson", "colne", "darwen"] },
  { name: "Chester", lat: 53.1934, lng: -2.8931, aliases: ["wrexham", "ellesmere port", "northwich", "winsford", "mold", "buckley", "flint", "hawarden"] },
  { name: "Swansea", lat: 51.6214, lng: -3.9436, aliases: ["neath", "port talbot", "llanelli", "carmarthen", "neath port talbot", "ammanford"] },
  { name: "Aberdeen", lat: 57.1497, lng: -2.0943, aliases: ["dundee", "perth", "inverness", "elgin", "forfar", "arbroath", "montrose", "stonehaven", "peterhead", "fraserburgh"] },
  { name: "Dundee", lat: 56.462, lng: -2.9707, aliases: ["st andrews", "cupar", "dunfermline", "kirkcaldy", "glenrothes"] },
  { name: "Inverness", lat: 57.4778, lng: -4.2247, aliases: ["fort william", "aviemore", "nairn", "dingwall", "thurso", "wick"] },
  { name: "Perth", lat: 56.395, lng: -3.4308, aliases: ["stirling", "falkirk", "alloa", "crieff", "blairgowrie"] },
  { name: "Ipswich", lat: 52.0567, lng: 1.1482, aliases: ["colchester", "chelmsford", "clacton-on-sea", "clacton", "harwich", "felixstowe", "woodbridge", "stowmarket", "bury st edmunds", "haverhill", "sudbury"] },
  { name: "Southend", lat: 51.5459, lng: 0.7077, aliases: ["southend-on-sea", "basildon", "rayleigh", "wickford", "billericay", "brentwood", "grays", "tilbury", "canvey island", "leigh-on-sea"] },
  { name: "Peterborough", lat: 52.5695, lng: -0.2405, aliases: ["stamford", "oakham", "spalding", "bourne", "wisbech", "march"] },
  { name: "Lincoln", lat: 53.2307, lng: -0.5406, aliases: ["grantham", "boston", "skegness", "louth", "gainsborough", "sleaford", "spalding"] },
  { name: "Gloucester", lat: 51.8642, lng: -2.2382, aliases: ["cheltenham", "stroud", "cirencester", "tewkesbury", "coleford", "forest of dean"] },
  { name: "Exeter", lat: 50.7184, lng: -3.5339, aliases: ["torquay", "barnstaple", "tiverton", "honiton", "sidmouth", "exmouth", "dawlish", "okehampton"] },
  { name: "Taunton", lat: 51.015, lng: -3.1029, aliases: ["bridgwater", "yeovil", "weston-super-mare", "minehead", "wells", "glastonbury", "chard", "crewkerne"] },
  { name: "Bournemouth", lat: 50.7192, lng: -1.8808, aliases: ["poole", "christchurch", "wimborne", "ferndown", "ringwood", "dorchester", "weymouth", "swanage"] },
  { name: "Swindon", lat: 51.5558, lng: -1.7797, aliases: ["marlborough", "devizes", "calne", "chippenham", "cirencester", "corsham", "trowbridge"] },
  { name: "Watford", lat: 51.6565, lng: -0.3903, aliases: ["st albans", "hemel hempstead", "stevenage", "hertford", "welwyn garden city", "hatfield", "harpenden", "bushey", "rickmansworth", "berkhamsted", "tring"] },
  { name: "Crawley", lat: 51.109, lng: -0.1872, aliases: ["gatwick", "horsham", "reigate", "redhill", "east grinstead", "haywards heath", "burgess hill"] },
  { name: "Guildford", lat: 51.2362, lng: -0.5704, aliases: ["woking", "farnham", "aldershot", "godalming", "haslemere", "dorking", "leatherhead", "epsom", "ewell"] },
  { name: "Canterbury", lat: 51.2802, lng: 1.0789, aliases: ["dover", "folkestone", "margate", "ramsgate", "broadstairs", "deal", "sandwich", "faversham", "whitstable", "herne bay"] },
  { name: "Maidstone", lat: 51.2704, lng: 0.5227, aliases: ["gillingham", "chatham", "rochester", "tonbridge", "tunbridge wells", "royal tunbridge wells", "sevenoaks", "ashford", "sittingbourne", "sheerness"] },
  { name: "Colchester", lat: 51.8959, lng: 0.8919, aliases: ["ipswich", "clacton", "harwich", "manningtree", "braintree", "witham", "maldon"] },
  { name: "Lancaster", lat: 54.0466, lng: -2.8007, aliases: ["morecambe", "carnforth", "kendal", "windermere", "ambleside", "barrow-in-furness", "barrow", "ulverston", "workington", "whitehaven"] },
  { name: "Carlisle", lat: 54.8951, lng: -2.9382, aliases: ["penrith", "keswick", "cockermouth", "maryport", "hexham", "brampton"] },
  { name: "Durham", lat: 54.7761, lng: -1.5733, aliases: ["sunderland", "chester-le-street", "consett", "stanley", "bishop auckland", "newton aycliffe", "spennymoor"] },
  { name: "Shrewsbury", lat: 52.71, lng: -2.754, aliases: ["telford", "oswestry", "whitchurch", "market drayton", "ludlow", "bridgnorth", "wellington"] },
  { name: "Hereford", lat: 52.0565, lng: -2.716, aliases: ["worcester", "ledbury", "ross-on-wye", "ross on wye", "leominster", "bromyard"] },
  { name: "Worcester", lat: 52.193, lng: -2.2216, aliases: ["kidderminster", "redditch", "bromsgrove", "droitwich", "evesham", "pershore", "malvern"] },
  { name: "Salisbury", lat: 51.0693, lng: -1.7944, aliases: ["salisbury", "andover", "amesbury", "warminster", "sherborne", "gillingham dorset"] },
  { name: "Truro", lat: 50.2632, lng: -5.051, aliases: ["falmouth", "penzance", "st austell", "newquay", "redruth", "camborne", "helston", "bodmin", "launceston"] },
  { name: "Penzance", lat: 50.1186, lng: -5.5371, aliases: ["st ives", "hayle", "marazion"] },
  { name: "Bangor", lat: 53.2274, lng: -4.1293, aliases: ["caernarfon", "pwllheli", "porthmadog", "colwyn bay", "llandudno", "conwy", "rhyl", "prestatyn"] },
  { name: "Aberystwyth", lat: 52.4153, lng: -4.0829, aliases: ["aberystwyth", "newtown", "machynlleth", "lampeter"] },
  { name: "Stirling", lat: 56.1165, lng: -3.9369, aliases: ["alloa", "falkirk", "grangemouth", "larbert", "dunblane", "callander"] },
  { name: "Ayr", lat: 55.4586, lng: -4.6292, aliases: ["kilmarnock", "irvine", "troon", "prestwick", "ayrshire", "largs", "saltcoats"] },
  { name: "Dumfries", lat: 55.0709, lng: -3.6053, aliases: ["stranraer", "annan", "lockerbie", "moffat"] },
];

const HUBS = UK_HUBS;

const hubByName = new Map(HUBS.map((h) => [h.name.toLowerCase(), h]));

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLondonArea(town: string, pickupKey: string, address?: string | null): boolean {
  const blob = norm([town, pickupKey, address ?? ""].join(" "));
  return blob.includes("london") || pickupKey.toLowerCase().startsWith("london ");
}

function matchHubByName(town: string, pickupKey: string): string | null {
  const candidates = [pickupKey, town].map(norm).filter(Boolean);
  for (const c of candidates) {
    if (hubByName.has(c)) return hubByName.get(c)!.name;
    for (const hub of HUBS) {
      if (hub.aliases?.some((a) => a === c || c.includes(a) || a.includes(c))) return hub.name;
      if (norm(hub.name) === c) return hub.name;
    }
  }
  // Partial match: town equals start of alias or hub name
  for (const c of candidates) {
    for (const hub of HUBS) {
      if (c.startsWith(norm(hub.name)) || norm(hub.name).startsWith(c)) return hub.name;
      for (const a of hub.aliases ?? []) {
        if (c === a || c.startsWith(a) || a.startsWith(c)) return hub.name;
      }
    }
  }
  return null;
}

function nearestHub(lat: number, lng: number): string {
  let best = HUBS[0];
  let bestDist = Infinity;
  for (const hub of HUBS) {
    const d = haversineMiles({ lat, lng }, { lat: hub.lat, lng: hub.lng });
    if (d < bestDist) {
      bestDist = d;
      best = hub;
    }
  }
  return best.name;
}

export function listHubNames(): string[] {
  return HUBS.map((h) => h.name);
}

const KNOWN_HUBS = new Set([...HUBS.map((h) => h.name), "International", "Other UK"]);

export function isKnownHub(name: string): boolean {
  return KNOWN_HUBS.has(name);
}

export function hubRank(name: string): number {
  const idx = HUBS.findIndex((h) => h.name === name);
  if (idx >= 0) return idx;
  if (name === "Other UK") return 900;
  if (name === "International") return 901;
  return 999;
}

const NON_UK_MARKERS =
  /\b(spain|france|germany|italy|portugal|netherlands|belgium|ireland(?!\s+north)|usa|united states|canada|australia|poland|sweden|denmark|norway|finland|austria|switzerland|greece|turkey|mexico|brazil|india|china|japan)\b/i;

function isNonUkAddress(...parts: (string | null | undefined)[]): boolean {
  const blob = parts.filter(Boolean).join(" ");
  if (NON_UK_MARKERS.test(blob)) return true;
  // Country at end of comma-separated address (common in Shiply scrape).
  const tokens = blob.split(",").map((t) => t.trim());
  const last = tokens[tokens.length - 1]?.toLowerCase() ?? "";
  if (last && !/^(uk|united kingdom|england|scotland|wales|northern ireland|great britain|gb)$/.test(last)) {
    if (/^[a-z\s.'-]{3,}$/i.test(last) && !/\d/.test(last) && tokens.length >= 3) return true;
  }
  return false;
}

export type PickupCountry = "uk" | "international";

/** Classify pickup location as UK or international (for country filters). */
export function classifyPickupCountry(input: {
  pickupHub: string;
  pickupTown?: string | null;
  pickupKey?: string | null;
  pickupAddress?: string | null;
}): PickupCountry {
  if (input.pickupHub === "International") return "international";
  if (isNonUkAddress(input.pickupTown, input.pickupKey, input.pickupAddress)) return "international";
  return "uk";
}

function isInUkBBox(lat: number, lng: number): boolean {
  return lat >= 49 && lat <= 61 && lng >= -8.5 && lng <= 2.5;
}

export function assignPickupHub(input: {
  pickupTown: string;
  pickupKey: string;
  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
}): string {
  if (isNonUkAddress(input.pickupTown, input.pickupKey, input.pickupAddress)) return "International";

  if (isLondonArea(input.pickupTown, input.pickupKey, input.pickupAddress)) return "London";

  const byName = matchHubByName(input.pickupTown, input.pickupKey);
  if (byName) return byName;

  if (typeof input.pickupLat === "number" && typeof input.pickupLng === "number") {
    if (!isInUkBBox(input.pickupLat, input.pickupLng)) return "International";
    return nearestHub(input.pickupLat, input.pickupLng);
  }

  const town = norm(input.pickupTown);
  if (town) {
    for (const hub of HUBS) {
      if (town === norm(hub.name)) return hub.name;
      for (const a of hub.aliases ?? []) {
        if (town === a || town.includes(a)) return hub.name;
      }
    }
  }

  return "Other UK";
}
