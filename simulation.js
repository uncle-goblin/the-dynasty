// THE DYNASTY — Simulation Engine v1.0
// Handles: roster generation, schedule generation, game simulation,
// poll calculations, conference standings, CFP bracket

'use strict';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SIM_POSITIONS = [
  // [pos, count per roster]
  ['QB',3],['RB',4],['WR',6],['TE',3],['OT',4],['IOL',5],
  ['EDGE',4],['DL',4],['LB',4],['CB',4],['S',3],['ATH',1],['K',1],['P',1]
];

const FIRST_NAMES = ['Malik','Darius','Jordan','Marcus','Tyrese','Cameron','Isaiah','Elijah','Jaylen','Andre','Devin','Caleb','Trevor','Mason','Hunter','Bryce','Cole','Logan','Tyler','Nathan','Zach','Justin','Damien','Xavier','Kendall','Jalen','Quinton','Lamar','Terrell','DeAndre','Cody','Blake','Collin','Peyton','Javon','Marquez','Trevion','Keondre','Zion','Micah','Seth','Evan','Dylan','Brady','Cooper','Chase','Landon','Preston','Jackson','Weston','Nico','Emory','Quentin','Roderick','Antwan','Keon','Deon','Jamari','Tristen','Savion','Devontae','Trayvon','Kendric','Deshawn','Marquise','Tavion','Kameron','Elias','Nasir','Tobias','Rashad','Dominic','Kyler','Tanner','Griffin','Garrett','Nolan','Owen','Miles','Jayden','Aiden','Caden','Brayden','Hayden'];
const LAST_NAMES = ['Williams','Johnson','Davis','Brown','Wilson','Moore','Taylor','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','King','Wright','Scott','Green','Baker','Adams','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez','James','Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores','Washington','Butler','Simmons','Foster'];

// Conference structure — divisions where applicable
const CONF_STRUCTURE = {
  'SEC':     {divisions:false, championship:true, teams:16},
  'Big Ten': {divisions:false, championship:true, teams:18},
  'Big 12':  {divisions:false, championship:true, teams:16},
  'ACC':     {divisions:false, championship:true, teams:17},
  'AAC':     {divisions:false, championship:true, teams:14},
  'Sun Belt':{divisions:true, east:['App State','Arkansas State','Coastal Carolina','Georgia Southern','Georgia State','James Madison','Louisiana Monroe','Marshall','Old Dominion','South Alabama'],
                               west:['Arkansas State','Louisiana','Southern Miss','Texas State','Troy'],
              championship:true, teams:14},
  'MAC':     {divisions:true, east:['Akron','Ball State','Bowling Green','Buffalo','Kent State','Miami (OH)','Ohio'],
                               west:['Ball State','Central Michigan','Eastern Michigan','Northern Illinois','Toledo','Western Michigan'],
              championship:true, teams:12},
  'MWC':     {divisions:true, mountain:['Air Force','Boise State','Colorado State','New Mexico','Utah State','Wyoming'],
                               west:['Fresno State','Hawaii','Nevada','San Diego State','San Jose State','UNLV'],
              championship:true, teams:12},
  'C-USA':   {divisions:false, championship:true, teams:11},
  'Ind':     {divisions:false, championship:false, teams:3},
};

// Conference games per team
const CONF_GAMES = {
  'SEC':8, 'Big Ten':9, 'Big 12':9, 'ACC':8,
  'AAC':8, 'Sun Belt':8, 'MAC':8, 'MWC':8, 'C-USA':8, 'Ind':0
};

// FCS tier strength ratings
const FCS_TIERS = [
  {name:'Top FCS Program', strength:52, fee:400000},
  {name:'Mid FCS Program', strength:44, fee:300000},
  {name:'Lower FCS Program', strength:36, fee:200000},
];

// Poll release weeks
const POLL_SCHEDULE = {
  AP:      {preseason:22, weekly:true, startWeek:29},
  Coaches: {preseason:22, weekly:true, startWeek:29},
  CFP:     {preseason:false, weekly:true, startWeek:33}, // CFP releases late October
};

// ═══════════════════════════════════════════════════════════════
// RNG
// ═══════════════════════════════════════════════════════════════
function makeRng(seed) {
  let s = (seed || 12345) >>> 0;
  return () => { s = Math.imul(1664525,s)+1013904223>>>0; return s/4294967296; };
}
function rngRange(r, lo, hi) { return lo + Math.floor(r()*(hi-lo+1)); }
function pickW(arr, r) { return arr[Math.floor(r()*arr.length)]; }

// ═══════════════════════════════════════════════════════════════
// ROSTER GENERATION
// ═══════════════════════════════════════════════════════════════

// OVR ranges by school tier
const TIER_OVR = {
  5: {mean:79, spread:6},   // Elite: 73-85 most players, occasional 86-90
  4: {mean:73, spread:6},   // Contender: 67-79
  3: {mean:67, spread:6},   // Established: 61-73
  2: {mean:61, spread:5},   // Developing: 56-66
  1: {mean:54, spread:5},   // Rebuilding: 49-59
};

// Position-specific school strengths (some schools punch above/below in certain positions)
const SCHOOL_POS_BONUS = {
  'Alabama':    {OL:3, DL:2, CB:2},
  'Georgia':    {DL:4, CB:3, OL:2},
  'Ohio State': {WR:4, CB:3, EDGE:2},
  'Texas':      {QB:2, WR:3, OL:2},
  'LSU':        {WR:4, CB:3, RB:2},
  'Oklahoma':   {QB:3, WR:2, OL:2},
  'Notre Dame': {OL:3, TE:3, LB:2},
  'Michigan':   {OL:4, TE:2, LB:3},
  'Penn State': {EDGE:3, CB:2, WR:2},
  'Oregon':     {WR:3, EDGE:2, RB:2},
  'Clemson':    {EDGE:4, QB:2, WR:2},
  'Iowa':       {OL:4, TE:3, LB:2},
  'Wisconsin':  {OL:4, RB:3, LB:2},
  'Air Force':  {RB:3, QB:2},
  'Army':       {RB:4, QB:2, OL:2},
  'Navy':       {RB:3, QB:2},
};

function genRoster(school, seed) {
  const r = makeRng(seed);
  const tierScore = calcTierScoreSim(school);
  const tier = getTierStarsSim(tierScore);
  const ovrBase = TIER_OVR[tier] || TIER_OVR[3];
  const posBonus = SCHOOL_POS_BONUS[school.name] || {};
  const usedNames = new Set();
  const roster = [];
  let playerId = 0;

  SIM_POSITIONS.forEach(([pos, count]) => {
    for(let i=0; i<count; i++) {
      // Year distribution: more freshmen/sophs at weaker schools
      const yearWeights = tier>=4 ? [0.2,0.25,0.3,0.25] : [0.3,0.3,0.25,0.15];
      const yearRoll = r();
      let year = 1;
      let cum = 0;
      for(let y=0;y<4;y++){ cum+=yearWeights[y]; if(yearRoll<cum){year=y+1;break;} }

      // OVR — starters (i===0) are better
      const starterBonus = i===0 ? 4 : i===1 ? 2 : 0;
      const posB = posBonus[pos] || 0;
      const noise = (r()-0.5)*ovrBase.spread*2;
      const baseOVR = Math.round(ovrBase.mean + starterBonus + posB + noise);
      // Year modifier — seniors slightly better developed
      const yearBonus = (year-1)*1.5;
      const ovr = Math.max(40, Math.min(97, Math.round(baseOVR + yearBonus)));

      // Name
      let name;
      let attempts = 0;
      do {
        name = pickW(FIRST_NAMES,r)+' '+pickW(LAST_NAMES,r);
        attempts++;
      } while(usedNames.has(name) && attempts<20);
      usedNames.add(name);

      roster.push({
        id: `${school.name.replace(/\s/g,'_')}_${playerId++}`,
        name, pos, year, ovr,
        coachBoostOVR: ovr, // effective OVR with coach boosts applied
        school: school.name,
      });
    }
  });

  return roster;
}

function calcRosterOVR(roster) {
  if(!roster || roster.length===0) return 50;
  // Weight starters more — average of top 22 players (11 off, 11 def)
  const sorted = [...roster].sort((a,b)=>b.coachBoostOVR-a.coachBoostOVR);
  const starters = sorted.slice(0,22);
  const bench = sorted.slice(22,44);
  const starterAvg = starters.reduce((a,p)=>a+p.coachBoostOVR,0)/Math.max(1,starters.length);
  const benchAvg = bench.length>0 ? bench.reduce((a,p)=>a+p.coachBoostOVR,0)/bench.length : starterAvg-5;
  return Math.round(starterAvg*0.75 + benchAvg*0.25);
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE GENERATION
// ═══════════════════════════════════════════════════════════════

const SEASON_START_WEEK = 28; // Week 28 = first game week
const SEASON_WEEKS = 13;      // 13 regular season weeks (some teams have byes)
const CONF_CHAMPIONSHIP_WEEK = 41;

function generateAllSchedules(schools, year, playerSchoolName, existingNCGames) {
  const schedules = {}; // schoolName -> [{week, opponent, home, gameId, conf, result}]
  const gamePool = [];  // All games to simulate
  const assigned = new Set(); // Track assigned matchups

  schools.forEach(s => { schedules[s.name] = []; });

  // Step 1: Generate conference schedules
  schools.forEach(school => {
    const conf = school.conf;
    const confTeams = schools.filter(s=>s.conf===conf && s.name!==school.name);
    const gamesNeeded = CONF_GAMES[conf] || 0;
    if(gamesNeeded===0) return;

    // Assign conference opponents
    const opponents = shuffleArray([...confTeams], makeRng(hashStr(school.name+year))).slice(0,gamesNeeded);
    opponents.forEach((opp, idx) => {
      const key = [school.name,opp.name].sort().join('|');
      if(assigned.has(key)) return;
      assigned.add(key);

      const week = SEASON_START_WEEK + 1 + Math.floor(idx * (SEASON_WEEKS-1) / gamesNeeded);
      const homeTeam = Math.random()>0.5 ? school.name : opp.name;
      const gameId = `${year}_${key}_W${week}`;

      const game = {gameId, week, home:homeTeam, away:homeTeam===school.name?opp.name:school.name, conf:true, played:false, homeScore:0, awayScore:0};
      gamePool.push(game);

      schedules[school.name].push({week, opponent:opp.name, home:homeTeam===school.name, gameId, conf:true});
      schedules[opp.name].push({week, opponent:school.name, home:homeTeam===opp.name, gameId, conf:true});
    });
  });

  // Step 2: Fill non-conference slots (weeks 28-30 for most teams, also late season)
  schools.forEach(school => {
    if(school.name === playerSchoolName) return; // Player fills their own NC schedule
    const currentGames = schedules[school.name].length;
    const totalNeeded = 12; // Most teams play 12 regular season games
    const ncNeeded = Math.max(0, totalNeeded - (CONF_GAMES[school.conf]||0));

    // Find NC opponents from other conferences or independents
    const ncPool = schools.filter(s =>
      s.conf !== school.conf &&
      !schedules[school.name].some(g=>g.opponent===s.name) &&
      s.name !== school.name
    );

    const r = makeRng(hashStr(school.name+'nc'+year));
    const ncOpps = shuffleArray(ncPool, r).slice(0, ncNeeded);

    ncOpps.forEach((opp, idx) => {
      const key = [school.name,opp.name].sort().join('|');
      if(assigned.has(key)) return;
      assigned.add(key);

      const week = SEASON_START_WEEK + idx;
      const homeTeam = school.name; // Home team hosts NC games generally
      const gameId = `${year}_${key}_NC`;

      const game = {gameId, week, home:homeTeam, away:opp.name, conf:false, played:false, homeScore:0, awayScore:0};
      gamePool.push(game);

      schedules[school.name].push({week, opponent:opp.name, home:true, gameId, conf:false});
      schedules[opp.name].push({week, opponent:school.name, home:false, gameId, conf:false});
    });
  });

  return {schedules, gamePool};
}

// ═══════════════════════════════════════════════════════════════
// GAME SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════

function simGame(homeTeam, awayTeam, rosters, schools, week, seed) {
  const r = makeRng(seed || Math.floor(Math.random()*999999));

  const homeOVR = calcRosterOVR(rosters[homeTeam] || []);
  const awayOVR = calcRosterOVR(rosters[awayTeam] || []);

  // Home field advantage: +3 OVR equivalent
  const homeAdj = homeOVR + 3;
  const awayAdj = awayOVR;

  // OVR differential drives win probability
  const diff = homeAdj - awayAdj;
  // Sigmoid function to convert diff to win probability
  const homeWinProb = 1 / (1 + Math.exp(-diff/8));

  // Upset factor — more variance in early season and for close games
  const upsetFactor = week <= 30 ? 0.08 : 0.05;
  const roll = r() + (r()-0.5)*upsetFactor*2;
  const homeWins = roll < homeWinProb;

  // Score generation
  const avgScore = 24 + (homeOVR+awayOVR)/2 * 0.15;
  const winnerScore = Math.round(avgScore + 7 + r()*21);
  const loserScore  = Math.round(Math.max(0, winnerScore - (7 + r()*28)));

  return {
    homeScore: homeWins ? winnerScore : loserScore,
    awayScore: homeWins ? loserScore  : winnerScore,
    homeWins,
    overtimes: r() < 0.08 ? Math.ceil(r()*2) : 0,
  };
}

function simWeek(week, gamePool, rosters, schools) {
  const weekGames = gamePool.filter(g => g.week===week && !g.played);
  weekGames.forEach(game => {
    const result = simGame(game.home, game.away, rosters, schools, week, hashStr(game.gameId));
    game.homeScore = result.homeScore;
    game.awayScore = result.awayScore;
    game.homeWins  = result.homeWins;
    game.played    = true;
  });
  return weekGames;
}

// ═══════════════════════════════════════════════════════════════
// STANDINGS
// ═══════════════════════════════════════════════════════════════

function calcStandings(schools, gamePool, conf) {
  const confTeams = schools.filter(s=>s.conf===conf);
  const standings = {};

  confTeams.forEach(s => {
    standings[s.name] = {
      name:s.name, conf:s.conf,
      w:0, l:0, confW:0, confL:0,
      pf:0, pa:0, streak:0, streakType:'',
      last5:[],
    };
  });

  const confGames = gamePool.filter(g=>g.played && (g.conf || !g.conf));
  confGames.forEach(game => {
    const home = standings[game.home];
    const away = standings[game.away];
    if(!home || !away) return;

    if(game.homeScore > game.awayScore) {
      home.w++; away.l++;
      home.pf+=game.homeScore; home.pa+=game.awayScore;
      away.pf+=game.awayScore; away.pa+=game.homeScore;
      if(game.conf){ home.confW++; away.confL++; }
      home.last5.push('W'); away.last5.push('L');
    } else {
      away.w++; home.l++;
      away.pf+=game.awayScore; away.pa+=game.homeScore;
      home.pf+=game.homeScore; home.pa+=game.awayScore;
      if(game.conf){ away.confW++; home.confL++; }
      away.last5.push('W'); home.last5.push('L');
    }
  });

  // Trim last5 to 5
  Object.values(standings).forEach(s=>{
    s.last5 = s.last5.slice(-5);
    if(s.last5.length>0) {
      s.streakType = s.last5[s.last5.length-1];
      let streak=0;
      for(let i=s.last5.length-1;i>=0;i--){
        if(s.last5[i]===s.streakType) streak++;
        else break;
      }
      s.streak=streak;
    }
  });

  return Object.values(standings).sort((a,b)=>
    b.confW-a.confW || b.w-a.w || (b.pf-b.pa)-(a.pf-a.pa)
  );
}

// ═══════════════════════════════════════════════════════════════
// POLL CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function calcPollScore(school, schoolStats, gamePool, week, pollType) {
  const stats = schoolStats[school.name];
  if(!stats) return 0;

  const wins = stats.w || 0;
  const losses = stats.l || 0;
  const pf = stats.pf || 0;
  const pa = stats.pa || 0;
  const pointDiff = pf - pa;

  // Base score from record
  let score = wins * 100;
  score -= losses * 80;

  // Point differential (capped to prevent blowout inflation)
  score += Math.min(pointDiff, wins*20) * 0.5;

  // Strength of schedule — wins over ranked opponents worth more
  const oppWins = calcSOSBonus(school.name, gamePool, schoolStats);
  score += oppWins * 15;

  // Conference bonus
  const tierScore = calcTierScoreSim(school);
  const confBonus = {SEC:12,bigTen:10,'Big Ten':10,'Big 12':6,ACC:8,AAC:3,'Sun Belt':2,MAC:2,MWC:3,'C-USA':2,Ind:4};
  score += (confBonus[school.conf] || 0);

  // Poll-specific adjustments
  if(pollType==='AP') {
    // AP slightly favors brand names
    score += (school.tradition||50) * 0.05;
  } else if(pollType==='Coaches') {
    // Coaches poll slightly favors conference wins
    score += stats.confW * 10;
  } else if(pollType==='CFP') {
    // CFP committee heavily weights strength of schedule and conference championships
    score += oppWins * 25;
    score -= losses * 50; // CFP punishes losses harder
    score += (stats.confW||0) * 15;
    // Conference champion bonus
    if(stats.isConfChamp) score += 100;
  }

  return score;
}

function calcSOSBonus(schoolName, gamePool, schoolStats) {
  // Count wins over teams with winning records
  const playedGames = gamePool.filter(g=>g.played && (g.home===schoolName||g.away===schoolName));
  let bonus = 0;
  playedGames.forEach(game => {
    const isHome = game.home===schoolName;
    const won = isHome ? game.homeScore>game.awayScore : game.awayScore>game.homeScore;
    if(won) {
      const opp = isHome ? game.away : game.home;
      const oppStats = schoolStats[opp];
      if(oppStats && oppStats.w > oppStats.l) bonus++;
    }
  });
  return bonus;
}

function generatePolls(schools, gamePool, week, prevPolls) {
  // Build school stats from game pool
  const schoolStats = {};
  schools.forEach(s => {
    schoolStats[s.name] = {w:0,l:0,confW:0,confL:0,pf:0,pa:0,isConfChamp:false};
  });
  gamePool.filter(g=>g.played).forEach(game=>{
    const h=schoolStats[game.home], a=schoolStats[game.away];
    if(!h||!a) return;
    if(game.homeScore>game.awayScore){h.w++;a.l++;if(game.conf){h.confW++;a.confL++;}}
    else{a.w++;h.l++;if(game.conf){a.confW++;h.confL++;}}
    h.pf+=game.homeScore;h.pa+=game.awayScore;
    a.pf+=game.awayScore;a.pa+=game.homeScore;
  });

  const polls = {};
  const pollTypes = ['AP','Coaches'];
  if(week >= POLL_SCHEDULE.CFP.startWeek) pollTypes.push('CFP');

  pollTypes.forEach(pollType => {
    const scored = schools
      .filter(s=>s.conf!=='Ind'||s.name==='Notre Dame')
      .map(s=>({
        name:s.name,
        conf:s.conf,
        record:`${schoolStats[s.name]?.w||0}-${schoolStats[s.name]?.l||0}`,
        w: schoolStats[s.name]?.w||0,
        l: schoolStats[s.name]?.l||0,
        score: calcPollScore(s, schoolStats, gamePool, week, pollType),
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,25)
      .map((s,i)=>({...s, rank:i+1}));

    polls[pollType] = scored;
  });

  return polls;
}

// ═══════════════════════════════════════════════════════════════
// CFP BRACKET (12-team)
// ═══════════════════════════════════════════════════════════════

function generateCFPBracket(schools, gamePool, year) {
  const polls = generatePolls(schools, gamePool, 44, null);
  const cfpRanking = polls.CFP || polls.AP || [];

  // Find conference champions
  const confChamps = {};
  const confs = ['SEC','Big Ten','Big 12','ACC','AAC','Sun Belt','MAC','MWC','C-USA'];

  confs.forEach(conf=>{
    const confStandings = calcStandings(schools, gamePool, conf);
    if(confStandings.length>0) confChamps[conf]=confStandings[0].name;
  });

  // Seeds 1-4: top 4 ranked conference champions (get byes)
  // Seeds 5-12: next 8 highest ranked (mix of conf champs and at-large)
  const confChampNames = Object.values(confChamps);
  const rankedChamps = cfpRanking.filter(t=>confChampNames.includes(t.name)).slice(0,4);
  const atLarge = cfpRanking.filter(t=>!rankedChamps.find(c=>c.name===t.name)).slice(0,8);

  const seeds = [...rankedChamps, ...atLarge].slice(0,12).map((t,i)=>({...t,seed:i+1}));

  return {
    seeds,
    firstRound:[
      {home:seeds[4], away:seeds[11]}, // 5 vs 12
      {home:seeds[5], away:seeds[10]}, // 6 vs 11
      {home:seeds[6], away:seeds[9]},  // 7 vs 10
      {home:seeds[7], away:seeds[8]},  // 8 vs 9
    ],
    byeTeams: seeds.slice(0,4),
    status:'pending',
  };
}

// ═══════════════════════════════════════════════════════════════
// TIER HELPERS (duplicated for sim module independence)
// ═══════════════════════════════════════════════════════════════

function calcTierScoreSim(school) {
  const keys=['tradition','nilBudget','facilities','brand','atmosphere','proProspects','academic','campusLife','playingTime','champContender','coachPrestige','confPrestige'];
  return keys.reduce((a,k)=>a+(school[k]||50),0)/keys.length;
}
function getTierStarsSim(score) {
  return score>=88?5:score>=76?4:score>=64?3:score>=52?2:1;
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function shuffleArray(arr, r) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function hashStr(str) {
  let h=0;
  for(let i=0;i<str.length;i++){h=(Math.imul(31,h)+str.charCodeAt(i))|0;}
  return Math.abs(h);
}

// ═══════════════════════════════════════════════════════════════
// MAIN SIMULATION STATE MANAGER
// ═══════════════════════════════════════════════════════════════

class DynastySimulation {
  constructor(schools, playerSchoolName, year) {
    this.schools = schools;
    this.playerSchool = playerSchoolName;
    this.year = year;
    this.rosters = {};
    this.schedules = {};
    this.gamePool = [];
    this.polls = {AP:[], Coaches:[], CFP:[]};
    this.currentWeek = 1;
    this.playerRecord = {w:0, l:0, confW:0, confL:0};
    this.cfpBracket = null;
    this.initialized = false;
  }

  init() {
    console.log('Initializing simulation for', this.schools.length, 'schools...');

    // Generate rosters
    this.schools.forEach((school, i) => {
      this.rosters[school.name] = genRoster(school, hashStr(school.name+this.year));
    });

    // Generate schedules
    const {schedules, gamePool} = generateAllSchedules(
      this.schools, this.year, this.playerSchool, []
    );
    this.schedules = schedules;
    this.gamePool = gamePool;

    // Generate preseason polls
    this.polls = generatePolls(this.schools, this.gamePool, 22, null);

    this.initialized = true;
    console.log('Simulation initialized.', this.gamePool.length, 'games scheduled.');
    return this;
  }

  advanceToWeek(week) {
    if(!this.initialized) return;
    // Simulate all weeks from current to target
    for(let w=this.currentWeek; w<=week; w++) {
      if(w >= SEASON_START_WEEK && w <= CONF_CHAMPIONSHIP_WEEK) {
        const results = simWeek(w, this.gamePool, this.rosters, this.schools);

        // Update player record
        const playerGames = results.filter(g=>g.home===this.playerSchool||g.away===this.playerSchool);
        playerGames.forEach(game=>{
          const isHome = game.home===this.playerSchool;
          const won = isHome?game.homeWins:!game.homeWins;
          if(won) this.playerRecord.w++;
          else this.playerRecord.l++;
          if(game.conf){
            if(won) this.playerRecord.confW++;
            else this.playerRecord.confL++;
          }
        });

        // Update polls if it's a poll release week
        if(w >= POLL_SCHEDULE.AP.startWeek || w === POLL_SCHEDULE.AP.preseason) {
          this.polls = generatePolls(this.schools, this.gamePool, w, this.polls);
        }
      }
    }
    this.currentWeek = week;
  }

  getPlayerSchedule() {
    return (this.schedules[this.playerSchool] || []).sort((a,b)=>a.week-b.week);
  }

  getConferenceStandings(conf) {
    return calcStandings(this.schools, this.gamePool, conf);
  }

  getPlayerRanking(pollType) {
    const poll = this.polls[pollType||'AP'] || [];
    const entry = poll.find(t=>t.name===this.playerSchool);
    return entry ? entry.rank : null;
  }

  getTopPoll(pollType, count) {
    return (this.polls[pollType] || []).slice(0, count||10);
  }

  getPlayerGameResult(week) {
    const game = this.gamePool.find(g=>
      g.week===week && (g.home===this.playerSchool||g.away===this.playerSchool) && g.played
    );
    if(!game) return null;
    const isHome = game.home===this.playerSchool;
    return {
      opponent: isHome?game.away:game.home,
      myScore: isHome?game.homeScore:game.awayScore,
      oppScore: isHome?game.awayScore:game.homeScore,
      won: isHome?game.homeWins:!game.homeWins,
      home: isHome,
    };
  }

  generateCFP() {
    this.cfpBracket = generateCFPBracket(this.schools, this.gamePool, this.year);
    return this.cfpBracket;
  }

  // Serialize for sessionStorage
  toJSON() {
    return {
      playerSchool: this.playerSchool,
      year: this.year,
      currentWeek: this.currentWeek,
      playerRecord: this.playerRecord,
      polls: this.polls,
      gamePool: this.gamePool,
      schedules: this.schedules,
      // Rosters are large — store separately if needed
    };
  }
}

// Export
if(typeof window !== 'undefined') {
  window.DynastySimulation = DynastySimulation;
  window.generatePolls = generatePolls;
  window.calcStandings = calcStandings;
  window.genRoster = genRoster;
  window.calcRosterOVR = calcRosterOVR;
  window.FCS_TIERS = FCS_TIERS;
  window.SEASON_START_WEEK = SEASON_START_WEEK;
  window.POLL_SCHEDULE = POLL_SCHEDULE;
}
