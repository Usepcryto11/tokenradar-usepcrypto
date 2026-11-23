// Token Radar — the value model (radar-2).
//
// One sealed snapshot in, one ranked board out. The board ranks every
// protocol that records no token AND is a launch candidate: centralised
// exchanges and wrapped, staked or bridged products are not ranked (their
// TVL is custodial balances or a receipt for an asset that already exists),
// except the two the house watchlist itself names, which the gate requires
// the board to cover. The excluded set is listed in the dashboard with its
// reasons, so nothing is hidden. Protocols whose token already trades are
// kept apart and shown with the market's own value, never ranked.
//
// Implied value follows only from the snapshot's own figures, never from a
// hardcoded list of names. For one protocol:
//
//   base       = tvl_usd x 0.35
//   category   = 1.00 normally; 0.60 for a wrapped, staked or bridged product;
//                0.80 for a centralised exchange; 0.90 when DefiLlama names
//                no category; x0.75 more when the name ends in a version
//                marker (a deployment of a protocol, not a separate launch)
//   growth     = clamp(change_7d, -50, +150) per cent; unknown change is 0
//   growthMult = 1 + (growth / 100) x 0.50
//   maturity   = 0.55 + min(age_days, 1095) / 1095 x 0.45
//                (age unknown: the median age of the snapshot's pre-token
//                protocols that do carry a listed_at — 516 days here —
//                computed from the snapshot, not assumed)
//   breadth    = 1.00 on one chain, 1.05 on two or three, 1.10 on four or more
//   implied    = max(1, round(base x category x growthMult x maturity x breadth))
//
// Why these shapes:
// - 0.35 of TVL: established DeFi governance tokens commonly trade at a
//   fully-diluted value of roughly a fifth to a half of TVL; 0.35 is the
//   middle of that band, stated as an assumption, not a fact.
// - The 0.60 wrapper haircut mirrors the house watchlist rule itself: a
//   wrapped, staked or bridged product is a receipt for an asset that already
//   exists, so a new token captures less new value than a protocol's own.
// - Growth is clamped because one week's TVL swing is noisy: a +4,448%
//   week (the snapshot's largest) is a data quirk, not a valuation.
// - Maturity rises with age because a protocol that has run for years with
//   no token has proven demand and a bigger eventual launch; a brand-new
//   one is unproven. It is capped at three years so age alone cannot
//   dominate TVL.
// - Breadth is small on purpose: being on more chains is a weak signal of
//   real usage, worth a tenth at most.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  breadth_two: number;
  breadth_four: number;
  wrapper_multiple: number;
  cex_multiple: number;
  unknown_category_multiple: number;
  versioned_multiple: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.35,
  growth_weight: 0.5,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.45,
  maturity_days: 1095,
  breadth_two: 1.05,
  breadth_four: 1.1,
  wrapper_multiple: 0.6,
  cex_multiple: 0.8,
  unknown_category_multiple: 0.9,
  versioned_multiple: 0.75,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    category_multiplier: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiplier: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A pre-token protocol the board does not rank as a launch, with why. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  reason: string;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  live_size: number;
  excluded_size: number;
  median_age_days: number;
  rows: RadarRow[];
  live: LiveRow[];
  excluded: ExcludedRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median age, in whole days, of the pre-token protocols that carry a listed_at. */
export function medianPreTokenAge(snapshot: Snapshot): number {
  const ages = snapshot.protocols
    .filter((p) => isPreToken(p))
    .map((p) => ageDays(snapshot.as_of, p.listed_at))
    .filter((a): a is number => a !== null)
    .sort((a, b) => a - b);
  if (ages.length === 0) return 365;
  return ages[Math.floor(ages.length / 2)]!;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories whose product is a receipt for an asset that already exists. */
const WRAPPER_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Cross Chain Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaking',
  'Staking Pool',
]);

/**
 * Whether a protocol is ranked as a launch candidate at all. Exchanges and
 * wrapped, staked or bridged products are not: an exchange's TVL is custodial
 * balances, not protocol-owned usage a reader can farm on-chain, and a
 * wrapped or staked receipt is a claim on an asset that already exists — the
 * house watchlist rule itself leaves WBTC, Binance staked ETH and USDT0 off
 * the watchlist for exactly this reason. The one exception is a slug the
 * watchlist itself names: the gate requires every watchlist slug on the
 * board, so those stay ranked, with the wrapper multiplier below.
 */
export function isExcluded(p: SnapshotProtocol, watchlist: Set<string>): boolean {
  if (watchlist.has(p.slug)) return false;
  return p.category === 'CEX' || (p.category !== null && WRAPPER_CATEGORIES.has(p.category));
}

/** The category multiplier: 1.00 normally, discounted for wrappers, exchanges and unknowns. */
export function categoryMultiplier(p: SnapshotProtocol, model: ModelConstants): number {
  let m = 1;
  if (p.category === null) m *= model.unknown_category_multiple;
  else if (WRAPPER_CATEGORIES.has(p.category)) m *= model.wrapper_multiple;
  else if (p.category === 'CEX') m *= model.cex_multiple;
  if (VERSIONED.test(p.name)) m *= model.versioned_multiple;
  return m;
}

/** The breadth multiplier from how many chains a protocol runs on. */
export function breadthMultiplier(p: SnapshotProtocol, model: ModelConstants): number {
  if (p.chains.length >= 4) return model.breadth_four;
  if (p.chains.length >= 2) return model.breadth_two;
  return 1;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  medianAge: number,
): { implied: number; categoryMult: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? medianAge;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const categoryMult = categoryMultiplier(protocol, model);
  const breadthMult = breadthMultiplier(protocol, model);
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * categoryMult * growthMult * maturityMult * breadthMult));
  return { implied, categoryMult, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n: every pre-token protocol that is a launch candidate (see isExcluded). */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const medianAge = medianPreTokenAge(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const scored = snapshot.protocols
    .filter((p) => isPreToken(p) && !isExcluded(p, watchlist))
    .map((p) => {
      const v = impliedValue(p, snapshot.as_of, model, medianAge);
      return { p, ...v };
    });
  scored.sort(
    (a, b) =>
      b.implied - a.implied ||
      b.p.tvl_usd - a.p.tvl_usd ||
      (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0),
  );
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: model.base_multiple,
      category_multiplier: round4(s.categoryMult),
      growth_pct: round4(s.growthPct),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action and its weekly follow-up, in words a farmer can follow. */
function actionsFor(p: SnapshotProtocol, capital: number, chain: string): { core: string; weekly: string } {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return {
      core: `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`,
      weekly: `Borrow a small amount against the deposit and repay it the same week, so the position shows both sides of the market.`,
    };
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager') || c === 'farm') {
    return {
      core: `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`,
      weekly: `Swap a small amount through the pool or add a little liquidity, so the wallet stays active.`,
    };
  }
  if (c.includes('staking') || c.includes('restak')) {
    return {
      core: `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token.`,
      weekly: `Restake any rewards the position earns, or add a small amount to the stake.`,
    };
  }
  if (c.includes('bridge')) {
    return {
      core: `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`,
      weekly: `Bridge a small amount back or use the bridged funds in a second transaction on ${chain}.`,
    };
  }
  if (c.includes('derivative') || c.includes('synthetic') || c.includes('option') || c.includes('perpetual')) {
    return {
      core: `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small hedged position.`,
      weekly: `Close one position and open a fresh small one, keeping the margin deposited.`,
    };
  }
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) {
    return {
      core: `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares.`,
      weekly: `Check the vault's allocation and add a small amount, or move a little between its vaults.`,
    };
  }
  if (c.includes('rwa') || c.includes('stable') || c.includes('reserve') || c.includes('token locker')) {
    return {
      core: `Mint or deposit $${capital} of the yield-bearing asset through ${name} on ${chain} and hold it.`,
      weekly: `Claim any yield the position earns and keep it in the same asset.`,
    };
  }
  if (c === 'chain') {
    return {
      core: `Bridge $${capital} of USDC onto ${name}'s chain and use it in one of the chain's own apps.`,
      weekly: `Make one real transaction on the chain, such as a swap or a transfer through a native app.`,
    };
  }
  if (c.includes('launchpad')) {
    return {
      core: `Deposit $${capital} of USDC into ${name}'s launch pool on ${chain} and take part in one sale.`,
      weekly: `Vote on one proposal or stake a small amount in the next launch pool.`,
    };
  }
  if (c.includes('prediction')) {
    return {
      core: `Fund $${capital} on ${name} on ${chain} and place one position on a market you follow.`,
      weekly: `Settle one position and place a fresh one on a market that closes soon.`,
    };
  }
  if (c === 'cex') {
    return {
      core: `Deposit $${capital} of USDC with ${name} and place one small spot trade on the exchange.`,
      weekly: `Place one small trade and keep a balance on the account.`,
    };
  }
  return {
    core: `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`,
    weekly: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
  };
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * Derived from the protocol's own record (category, chains, TVL, age), never
 * from a hand-written list of names, and it promises no token and no airdrop:
 * it tells the reader how to use the protocol genuinely and how to track it.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = capital >= 150 ? 8 : 4;
  const { core, weekly } = actionsFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    { text: core, cost: `$${capital} of capital and about $${gas} of gas`, time: '15 minutes to set up' },
    { text: weekly, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it in stages.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiplier: row.model.category_multiplier,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    watchlist: watchlist.has(row.slug),
    farm_steps: row.farm_steps,
  };
}

/** The pre-token protocols the board does not rank as launches, biggest first. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  const watchlist = new Set(snapshot.watchlist);
  return snapshot.protocols
    .filter((p) => isPreToken(p) && isExcluded(p, watchlist))
    .sort((a, b) => b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      tvl_usd: p.tvl_usd,
      reason:
        p.category === 'CEX'
          ? 'Centralised exchange: its TVL is custodial balances, not on-chain usage a reader can farm.'
          : 'Wrapped, staked or bridged product: a receipt for an asset that already exists.',
    }));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const excluded = excludedRows(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    live_size: live.length,
    excluded_size: excluded.length,
    median_age_days: medianPreTokenAge(snapshot),
    rows: board.map((r) => radarRow(r, watchlist)),
    live,
    excluded,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_value_usd > 100_000_000_000_000) return `${r.slug} has implied value over the cap`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
