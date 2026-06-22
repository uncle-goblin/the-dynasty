// THE DYNASTY — Sidebar v2.1
// Inserts sidebar BEFORE main content, not wrapping it.
// Each page must have <div id="dynasty-main"> wrapping its content.

(function() {
  'use strict';

  // ═══ CAREER STATE ═══
  const careerRaw = sessionStorage.getItem('dynastyCareer');
  const career = careerRaw ? JSON.parse(careerRaw) : null;
  if (!career) {
    // No career — only allow setup.html
    const page = window.location.pathname.split('/').pop();
    if (page !== 'setup.html' && page !== '') {
      window.location.href = 'setup.html';
    }
    return;
  }

  const simRaw   = sessionStorage.getItem('dynastySim');
  const sim      = simRaw ? JSON.parse(simRaw) : null;
  const school   = career.school || {};
  const week     = career.week  || 1;
  const year     = career.year  || 2026;
  const role     = career.role  || 'HC';
  const wins     = sim?.playerRecord?.w  ?? career.seasonRecord?.w  ?? 0;
  const losses   = sim?.playerRecord?.l  ?? career.seasonRecord?.l  ?? 0;
  const hoursRem = career.hoursRemaining ?? 100;

  const apPoll   = sim?.polls?.AP || [];
  const rankEntry = apPoll.find(t => t.name === school.name);
  const myRank   = rankEntry ? '#' + rankEntry.rank : null;

  // ═══ APPLY SCHOOL COLORS ═══
  const hex = school.primary || '#C8102E';
  const r   = parseInt(hex.slice(1,3),16)||200;
  const g   = parseInt(hex.slice(3,5),16)||16;
  const b   = parseInt(hex.slice(5,7),16)||46;
  document.documentElement.style.setProperty('--accent',       hex);
  document.documentElement.style.setProperty('--accent-2',     school.secondary || '#8B0000');
  document.documentElement.style.setProperty('--accent-mid',  `rgba(${r},${g},${b},0.18)`);
  document.documentElement.style.setProperty('--accent-light',`rgba(${r},${g},${b},0.08)`);

  // ═══ ABBREVIATION ═══
  function abbr(name) {
    if (!name) return '??';
    const skip = new Set(['the','and','of','at','a','in']);
    const words = name.split(/[\s&]+/).filter(w => w.length > 1 && !skip.has(w.toLowerCase()));
    if (!words.length) return name.slice(0,2).toUpperCase();
    if (words.length === 1) return words[0].slice(0,3).toUpperCase();
    if (words.length === 2) return (words[0][0] + words[1].slice(0,2)).toUpperCase();
    return words.slice(0,3).map(w=>w[0]).join('').toUpperCase();
  }

  // ═══ PHASE ═══
  function getPhase(w) {
    if (w<=2)  return {label:'Signing Period',   cls:'phase-signing'};
    if (w<=4)  return {label:'Transfer Portal',  cls:'phase-portal'};
    if (w<=6)  return {label:'Coaching Carousel',cls:'phase-signing'};
    if (w<=14) return {label:'Spring Practice',  cls:'phase-spring'};
    if (w<=21) return {label:'Summer Recruiting',cls:'phase-summer'};
    if (w<=27) return {label:'Fall Camp',        cls:'phase-camp'};
    if (w<=40) return {label:'Regular Season',   cls:'phase-season'};
    if (w<=44) return {label:'Bowl / Playoff',   cls:'phase-bowl'};
    if (w<=48) return {label:'Signing / Portal', cls:'phase-signing'};
    return       {label:'Offseason',             cls:'phase-signing'};
  }
  const phase = getPhase(week);
  const nextWk = week < 52 ? week + 1 : 1;
  const hPct   = Math.round(Math.max(0, Math.min(100, hoursRem)));

  // ═══ ACTIVE PAGE ═══
  const currentPage = window.location.pathname.split('/').pop() || 'hub.html';
  function isActive(pages) {
    return pages.some(p => currentPage === p || currentPage.startsWith(p.replace('.html','')));
  }

  // ═══ NAV STRUCTURE ═══
  const NAV = [
    { section: 'Program' },
    { label:'Dashboard',       href:'hub.html',        pages:['hub.html',''] },
    { label:'Schedule',        href:'schedule.html',   pages:['schedule.html'] },
    { label:'Depth Chart',     href:'roster.html',     pages:['roster.html'] },
    { label:'Goals & Events',  href:'goals.html',      pages:['goals.html'] },
    { section: 'Recruiting' },
    { label:'Recruiting Board',href:'recruiting.html', pages:['recruiting.html'] },
    { label:'Transfer Portal', href:'#',               pages:['portal.html'], soon:true },
    { section: 'Season' },
    { label:'Game Result',     href:'gameresult.html', pages:['gameresult.html'] },
    { label:'Standings',       href:'schedule.html',   pages:['standings'] },
    { section: 'Staff & Money' },
    { label:'Coaching Staff',  href:'#',               pages:['coaching.html'], soon:true },
    { label:'Collective & NIL',href:'nil.html',        pages:['nil.html'] },
    { label:'Budget',          href:'budget.html',     pages:['budget.html'] },
    { section: 'Coach' },
    { label:'Skill Trees',     href:'#',               pages:['skills.html'], soon:true },
    { label:'Coach Profile',   href:'#',               pages:['profile.html'], soon:true },
  ];

  // ═══ BUILD SIDEBAR HTML ═══
  const navItems = NAV.map(item => {
    if (item.section) {
      return `<div class="sb-section">${item.section}</div>`;
    }
    const active = isActive(item.pages);
    const soon   = item.soon
      ? `<span style="font-family:var(--font-mono);font-size:0.45rem;letter-spacing:0.06em;text-transform:uppercase;color:#4A4540;margin-left:auto;">soon</span>`
      : '';
    return `<a class="sb-item${active?' active':''}" href="${item.href}">${item.label}${soon}</a>`;
  }).join('\n');

  const hoursColor = hPct < 20 ? '#B91C1C' : hex;

  const sidebarEl = document.createElement('aside');
  sidebarEl.className = 'sidebar';
  sidebarEl.id = 'dynasty-sidebar';
  sidebarEl.innerHTML = `
    <div class="sb-header">
      <div class="sb-logo">The Dynasty</div>
      <div class="sb-school-mark">
        <div class="sb-logo-circle" style="background:${hex};color:#fff;">${abbr(school.name)}</div>
        <div class="sb-school-info">
          <div class="sb-school-name">${school.name || 'Your School'}</div>
          <div class="sb-school-conf">${school.conf || '—'} · ${role}</div>
        </div>
      </div>
      <div class="sb-season-row">
        <span class="sb-week-badge" style="background:${hex};">Week ${week}</span>
        <span class="sb-season-label">${year}</span>
        ${myRank ? `<span style="font-family:var(--font-mono);font-size:0.5625rem;font-weight:500;color:${hex};margin-left:auto;">${myRank}</span>` : ''}
      </div>
      <div class="sb-record">
        <span class="sb-record-num sb-record-w">${wins}</span>
        <span class="sb-record-sep">–</span>
        <span class="sb-record-num sb-record-l">${losses}</span>
        <span class="phase-pill ${phase.cls}" style="margin-left:auto;font-size:0.45rem;padding:1px 5px;">${phase.label}</span>
      </div>
    </div>

    <nav class="sb-nav">
      ${navItems}
    </nav>

    <div class="sb-footer">
      <div class="sb-hours-label">
        <span>Staff Hours</span>
        <span style="color:${hoursColor};font-family:var(--font-mono);font-size:0.5625rem;">${hoursRem}/100</span>
      </div>
      <div class="sb-hours-track">
        <div class="sb-hours-fill" style="width:${hPct}%;background:${hoursColor};"></div>
      </div>
      <button class="sb-advance-btn" id="sb-advance-btn" style="background:${hex};">
        Advance to Week ${nextWk}
      </button>
      <div class="sb-advance-sub">${hoursRem===100?'No hours spent this week':100-hoursRem+' hrs used'}</div>
    </div>`;

  // ═══ INJECT — prepend sidebar before #dynasty-main ═══
  // Wrap body in app-layout if not already wrapped
  if (!document.querySelector('.app-layout')) {
    const wrap = document.createElement('div');
    wrap.className = 'app-layout';
    // Move all existing body children into a main-content div
    const main = document.createElement('div');
    main.className = 'main-content';
    main.id = 'dynasty-main';
    while (document.body.firstChild) {
      main.appendChild(document.body.firstChild);
    }
    wrap.appendChild(sidebarEl);
    wrap.appendChild(main);
    document.body.appendChild(wrap);
  } else {
    // Already has app-layout, just prepend sidebar
    const layout = document.querySelector('.app-layout');
    layout.insertBefore(sidebarEl, layout.firstChild);
  }

  // ═══ ADVANCE WEEK ═══
  document.getElementById('sb-advance-btn').addEventListener('click', function() {
    career.week = week < 52 ? week + 1 : 1;
    if (career.week === 1) career.year = (career.year || 2026) + 1;
    career.hoursRemaining = 100;
    delete career.fundraisingUsed;
    sessionStorage.setItem('dynastyCareer', JSON.stringify(career));

    // Advance simulation
    if (simRaw && window.DynastySimulation && window.DYNASTY_SCHOOLS) {
      try {
        const simData = JSON.parse(simRaw);
        const s = new DynastySimulation(window.DYNASTY_SCHOOLS, school.name, career.year);
        s.gamePool     = simData.gamePool     || [];
        s.schedules    = simData.schedules    || {};
        s.polls        = simData.polls        || {};
        s.playerRecord = simData.playerRecord || {w:0,l:0,confW:0,confL:0};
        s.currentWeek  = simData.currentWeek  || 1;
        s.initialized  = true;
        s.advanceToWeek(career.week);
        const newSim = s.toJSON();
        sessionStorage.setItem('dynastySim', JSON.stringify(newSim));
        if (newSim.lastGameResult) {
          sessionStorage.setItem('lastGameResult', JSON.stringify(newSim.lastGameResult));
          window.location.href = 'gameresult.html';
          return;
        }
      } catch(e) { console.error('Sim advance error:', e); }
    }

    window.location.reload();
  });

})();
