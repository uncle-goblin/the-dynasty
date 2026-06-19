// THE DYNASTY — Shared Sidebar v2.0
// Injects persistent left navigation into any page

(function() {
  // ═══ CAREER STATE ═══
  const careerRaw = sessionStorage.getItem('dynastyCareer');
  const career = careerRaw ? JSON.parse(careerRaw) : null;
  const simRaw = sessionStorage.getItem('dynastySim');
  const sim = simRaw ? JSON.parse(simRaw) : null;

  if (!career) return; // No career, don't inject

  const school = career.school || {};
  const week = career.week || 1;
  const year = career.year || 2026;
  const wins = sim?.playerRecord?.w ?? career.seasonRecord?.w ?? 0;
  const losses = sim?.playerRecord?.l ?? career.seasonRecord?.l ?? 0;
  const hoursRemaining = career.hoursRemaining ?? 100;
  const role = career.role || 'HC';
  const currentPage = window.location.pathname.split('/').pop() || 'hub.html';

  // ═══ SCHOOL COLORS ═══
  function applySchoolColors() {
    if (!school.primary) return;
    const hex = school.primary;
    document.documentElement.style.setProperty('--accent', hex);
    const r = parseInt(hex.slice(1,3),16)||26;
    const g = parseInt(hex.slice(3,5),16)||23;
    const b = parseInt(hex.slice(5,7),16)||20;
    document.documentElement.style.setProperty('--accent-mid', `rgba(${r},${g},${b},0.15)`);
    document.documentElement.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.07)`);
    document.documentElement.style.setProperty('--accent-2', school.secondary || '#4A4540');
  }

  // ═══ WEEK PHASE ═══
  const PHASES = [
    {range:[1,4],label:'Signing Period',cls:'phase-signing'},
    {range:[3,8],label:'Transfer Portal',cls:'phase-portal'},
    {range:[5,6],label:'Coaching Carousel',cls:'phase-signing'},
    {range:[7,14],label:'Spring Practice',cls:'phase-spring'},
    {range:[15,21],label:'Summer Recruiting',cls:'phase-summer'},
    {range:[22,27],label:'Fall Camp',cls:'phase-camp'},
    {range:[28,40],label:'Regular Season',cls:'phase-season'},
    {range:[41,44],label:'Bowl / Playoff',cls:'phase-bowl'},
    {range:[45,48],label:'Early Signing',cls:'phase-signing'},
    {range:[49,52],label:'Offseason',cls:'phase-signing'},
  ];
  function getPhase(w) {
    return PHASES.find(p => w >= p.range[0] && w <= p.range[1]) || PHASES[PHASES.length-1];
  }
  const phase = getPhase(week);

  // ═══ AP RANKING ═══
  const apPoll = sim?.polls?.AP || [];
  const myRankEntry = apPoll.find(t => t.name === school.name);
  const myRank = myRankEntry ? `#${myRankEntry.rank}` : null;

  // ═══ SCHOOL ABBREVIATION ═══
  function getAbbr(name) {
    if (!name) return '??';
    const words = name.split(' ').filter(w => w.length > 2 && !['the','and','of','at'].includes(w.toLowerCase()));
    if (words.length === 1) return words[0].slice(0,3).toUpperCase();
    if (words.length === 2) return (words[0][0]+words[1].slice(0,2)).toUpperCase();
    return words.map(w=>w[0]).join('').slice(0,3).toUpperCase();
  }

  // ═══ NAV ITEMS ═══
  const NAV = [
    { section: 'Program' },
    { label: 'Dashboard', href: 'hub.html', page: 'hub.html' },
    { label: 'Schedule', href: 'schedule.html', page: 'schedule.html' },
    { label: 'Depth Chart', href: 'roster.html', page: 'roster.html' },
    { label: 'Goals & Events', href: 'goals.html', page: 'goals.html' },
    { section: 'Season' },
    { label: 'Recruiting', href: 'recruiting.html', page: 'recruiting.html' },
    { label: 'Transfer Portal', href: '#', page: 'portal.html', soon: true },
    { label: 'Standings', href: 'schedule.html', page: 'standings' },
    { section: 'Staff & Money' },
    { label: 'Coaching Staff', href: '#', page: 'coaching.html', soon: true },
    { label: 'Collective & NIL', href: 'nil.html', page: 'nil.html' },
    { label: 'Budget', href: 'budget.html', page: 'budget.html' },
    { section: 'Coach' },
    { label: 'Skill Trees', href: '#', page: 'skills.html', soon: true },
    { label: 'Coach Profile', href: '#', page: 'profile.html', soon: true },
  ];

  // ═══ BUILD HTML ═══
  const nextWeek = week < 52 ? week + 1 : 1;
  const hPct = Math.max(0, Math.min(100, (hoursRemaining/100)*100));

  const navHtml = NAV.map(item => {
    if (item.section) {
      return `<div class="sb-section">${item.section}</div>`;
    }
    const isActive = currentPage === item.page || currentPage.includes(item.page.replace('.html',''));
    const soonBadge = item.soon ? `<span style="font-family:var(--font-mono);font-size:0.45rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--sidebar-section);margin-left:auto;">soon</span>` : '';
    return `<a class="sb-item ${isActive?'active':''}" href="${item.href}">
      <div class="sb-item-dot"></div>
      ${item.label}
      ${soonBadge}
    </a>`;
  }).join('');

  const sidebarHtml = `
    <aside class="sidebar" id="dynasty-sidebar">
      <div class="sb-header">
        <div class="sb-logo">The Dynasty</div>
        <div class="sb-school-mark">
          <div class="sb-logo-circle">${getAbbr(school.name)}</div>
          <div class="sb-school-info">
            <div class="sb-school-name">${school.name || 'Your School'}</div>
            <div class="sb-school-conf">${school.conf || '—'} · ${role}</div>
          </div>
        </div>
        <div class="sb-season-row">
          <span class="sb-week-badge">Week ${week}</span>
          <span class="sb-season-label">${year} Season</span>
          ${myRank ? `<span style="font-family:var(--font-mono);font-size:0.5625rem;font-weight:500;color:var(--accent);margin-left:auto;">${myRank}</span>` : ''}
        </div>
        <div class="sb-record">
          <span class="sb-record-num sb-record-w">${wins}</span>
          <span class="sb-record-sep">–</span>
          <span class="sb-record-num sb-record-l">${losses}</span>
          <span class="phase-pill ${phase.cls}" style="margin-left:auto;font-size:0.45rem;padding:1px 5px;">${phase.label}</span>
        </div>
      </div>
      <nav class="sb-nav">${navHtml}</nav>
      <div class="sb-footer">
        <div class="sb-hours-label">
          <span>Staff Hours</span>
          <span class="sb-hours-val">${hoursRemaining}/100</span>
        </div>
        <div class="sb-hours-track">
          <div class="sb-hours-fill" style="width:${hPct}%;${hPct<20?'background:var(--red)':''}"></div>
        </div>
        <button class="sb-advance-btn" onclick="dynastyAdvanceWeek()">
          Advance to Week ${nextWeek}
        </button>
        <div class="sb-advance-sub">${hoursRemaining===100?'No hours spent':''+( 100-hoursRemaining)+' hrs used'}</div>
      </div>
    </aside>`;

  // ═══ INJECT ═══
  applySchoolColors();

  // Wrap existing body content
  const existingContent = document.body.innerHTML;
  document.body.innerHTML = `
    <div class="app-layout">
      ${sidebarHtml}
      <div class="main-content" id="dynasty-main">
        ${existingContent}
      </div>
    </div>`;

  // ═══ ADVANCE WEEK ═══
  window.dynastyAdvanceWeek = function() {
    career.week = week < 52 ? week + 1 : 1;
    if (career.week === 1) career.year = (career.year || 2026) + 1;
    career.hoursRemaining = 100;
    delete career.fundraisingUsed;
    sessionStorage.setItem('dynastyCareer', JSON.stringify(career));

    // Try simulation advance
    if (window.DynastySimulation && window.DYNASTY_SCHOOLS && simRaw) {
      try {
        const simData = JSON.parse(simRaw);
        const s = new DynastySimulation(window.DYNASTY_SCHOOLS, school.name, career.year);
        s.gamePool = simData.gamePool || [];
        s.schedules = simData.schedules || {};
        s.polls = simData.polls || {};
        s.playerRecord = simData.playerRecord || {w:0,l:0,confW:0,confL:0};
        s.currentWeek = simData.currentWeek || 1;
        s.initialized = true;
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
  };

})();
