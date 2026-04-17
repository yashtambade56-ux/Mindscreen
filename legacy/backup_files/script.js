// ===== SESSION STATE =====
const session = {
  startTime: Date.now(),
  elapsed: 0,
  interactions: 0,
  visibilityChanges: 0,
  hiddenTime: 0,
  lastHiddenAt: null,
  activityLog: [],
  performanceSamples: [],
  currentState: 'optimal',
  batteryLevel: null,
  batteryCharging: null,
  networkType: '--',
  networkSpeed: '--',
  networkRTT: '--',
  tabTitle: document.title,
  userAgent: navigator.userAgent
};

// ===== DEVICE DETECTION =====
function detectDevice() {
  const ua = navigator.userAgent;
  let os = 'UNKNOWN';
  if(/Windows/.test(ua)) os = 'WINDOWS';
  else if(/Mac/.test(ua)) os = 'MACOS';
  else if(/Linux/.test(ua)) os = 'LINUX';
  else if(/Android/.test(ua)) os = 'ANDROID';
  else if(/iOS|iPhone|iPad/.test(ua)) os = 'IOS';

  let browser = 'UNKNOWN';
  if(/Chrome/.test(ua) && !/Edge/.test(ua)) browser = 'CHROME';
  else if(/Firefox/.test(ua)) browser = 'FIREFOX';
  else if(/Safari/.test(ua)) browser = 'SAFARI';
  else if(/Edge/.test(ua)) browser = 'EDGE';

  document.getElementById('badge-os').textContent = `OS: ${os}`;
  document.getElementById('badge-browser').textContent = `BROWSER: ${browser}`;
  document.getElementById('badge-screen').textContent = `SCREEN: ${screen.width}x${screen.height}`;
  document.getElementById('badge-cores').textContent = `CORES: ${navigator.hardwareConcurrency || '--'}`;
  document.getElementById('badge-mem').textContent = `MEM: ${navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '--'}`;
  document.getElementById('badge-lang').textContent = `LANG: ${navigator.language || '--'}`;
  document.getElementById('badge-tz').textContent = `TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone || '--'}`;
  document.getElementById('badge-touch').textContent = `TOUCH: ${navigator.maxTouchPoints > 0 ? 'YES' : 'NO'}`;

  addLog(`DEVICE PROFILE LOADED: ${os}/${browser}`);
}

// ===== NETWORK =====
function updateNetwork() {
  const online = navigator.onLine;
  document.getElementById('net-online').textContent = online ? 'YES' : 'NO';
  document.getElementById('net-online').className = online ? 'emerald-text' : 'rose-text';

  if(navigator.connection) {
    const c = navigator.connection;
    document.getElementById('net-type').textContent = c.effectiveType?.toUpperCase() || '--';
    document.getElementById('net-speed').textContent = c.downlink ? c.downlink + ' Mbps' : '--';
    document.getElementById('net-rtt').textContent = c.rtt ? c.rtt + 'ms' : '--';
    session.networkType = c.effectiveType || '--';
    session.networkSpeed = c.downlink || '--';
    session.networkRTT = c.rtt || '--';
  } else {
    document.getElementById('net-type').textContent = 'N/A';
    document.getElementById('net-speed').textContent = 'N/A';
    document.getElementById('net-rtt').textContent = 'N/A';
  }
}

// ===== BATTERY =====
async function initBattery() {
  if(!navigator.getBattery) return;
  try {
    const battery = await navigator.getBattery();
    const update = () => {
      const level = Math.round(battery.level * 100);
      session.batteryLevel = level;
      session.batteryCharging = battery.charging;
      document.getElementById('batt-pct').textContent = level + '% ' + (battery.charging ? '⚡' : '');
      createSegmentedProgress('batt-bar', level, battery.charging ? 'var(--accent-emerald)' : 'var(--accent-cyan)');
      addLog(`BATTERY: ${level}% [${battery.charging ? 'CHARGING' : 'ON_BATTERY'}]`);
    };
    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
    update();
  } catch(e) { document.getElementById('batt-pct').textContent = 'N/A'; }
}

// ===== PERFORMANCE SAMPLING =====
let perfHistory = [];
function samplePerformance() {
  if(performance.memory) {
    const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
    const totalMB = Math.round(performance.memory.totalJSHeapSize / 1048576);
    perfHistory.push(usedMB);
    if(perfHistory.length > 20) perfHistory.shift();
    if(weeklyChart) {
      weeklyChart.data.datasets[0].data = [...perfHistory];
      weeklyChart.data.labels = perfHistory.map((_,i) => i);
      weeklyChart.update('none');
    }
    renderAppList([
      { name: 'JS HEAP USED', time: usedMB, unit: 'MB', max: totalMB },
      { name: 'JS HEAP TOTAL', time: totalMB, unit: 'MB', max: totalMB },
      { name: 'INTERACTIONS', time: session.interactions, unit: '', max: 100 },
      { name: 'VISIBILITY EVENTS', time: session.visibilityChanges, unit: '', max: 20 },
    ]);
  }
}

// ===== ACTIVITY TRACKING =====
let interactionDebounce;
['click','keydown','scroll','mousemove','touchstart'].forEach(evt => {
  document.addEventListener(evt, () => {
    session.interactions++;
    document.getElementById('stat-interact').textContent = session.interactions;
    clearTimeout(interactionDebounce);
    interactionDebounce = setTimeout(() => addLog(`INTERACTION_BURST: ${session.interactions} EVENTS`), 2000);
  }, {passive:true});
});

document.addEventListener('visibilitychange', () => {
  session.visibilityChanges++;
  document.getElementById('stat-visible').textContent = session.visibilityChanges;
  if(document.hidden) {
    session.lastHiddenAt = Date.now();
    addLog('TAB_HIDDEN: FOCUS_LOST');
  } else {
    if(session.lastHiddenAt) {
      session.hiddenTime += Date.now() - session.lastHiddenAt;
      session.lastHiddenAt = null;
    }
    addLog('TAB_VISIBLE: FOCUS_RESTORED');
  }
});

// ===== SESSION CLOCK =====
function startClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById('current-time').textContent =
      now.toLocaleTimeString('en-GB') + ' // ' + now.toLocaleDateString('en-GB').replace(/\//g,'.');

    const elapsed = Date.now() - session.startTime;
    const secs = Math.floor(elapsed/1000) % 60;
    const mins = Math.floor(elapsed/60000) % 60;
    const hrs = Math.floor(elapsed/3600000);
    document.getElementById('stat-screen-txt').textContent =
      String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');

    // Burnout score based on session time + interactions + hidden time
    const sessionMins = elapsed / 60000;
    const hiddenPenalty = (session.hiddenTime / elapsed) * 20;
    const interactionBonus = Math.min(session.interactions / 10, 20);
    const burnout = Math.min((sessionMins / 120) * 100 + hiddenPenalty - interactionBonus, 100);
    updateDashboard(burnout, sessionMins);

    // Update trend chart
    if(burnoutChart && sessionMins % 1 < 0.02) {
      const label = String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
      burnoutChart.data.labels.push(label);
      burnoutChart.data.datasets[0].data.push(burnout.toFixed(1));
      if(burnoutChart.data.labels.length > 20) {
        burnoutChart.data.labels.shift();
        burnoutChart.data.datasets[0].data.shift();
      }
      burnoutChart.update('none');
    }
  }, 1000);
}

function updateDashboard(burnout, sessionMins) {
  // Update score
  document.getElementById('burnout-score').textContent = burnout.toFixed(2).padStart(5,'0');

  // Focus score
  const hiddenRatio = session.hiddenTime / (Date.now() - session.startTime);
  const focusScore = Math.round((1 - hiddenRatio) * 100);
  document.getElementById('stat-focus').textContent = focusScore + '%';
  document.getElementById('stat-focus').className = 'tech-stat-value ' +
    (focusScore > 70 ? 'emerald-text' : focusScore > 40 ? 'amber-text' : 'rose-text');

  // Avg load
  document.getElementById('stat-avg').textContent = burnout.toFixed(2) + '%';

  // State
  let state, statusText, colorClass;
  if(burnout <= 35) { state='optimal'; statusText='OPTIMAL'; colorClass='cyan-text'; }
  else if(burnout <= 65) { state='caution'; statusText='CAUTION'; colorClass='amber-text'; }
  else { state='critical'; statusText='CRITICAL'; colorClass='rose-text'; }

  if(state !== session.currentState) {
    session.currentState = state;
    addLog(`STATE_CHANGE → ${statusText}`);
  }

  // Update character image based on burnout percentage ranges
  let characterImage;
  if(burnout >= 0 && burnout <= 20) {
    characterImage = 'models/1.png';
  } else if(burnout > 40 && burnout <= 60) {
    characterImage = 'models/2.png';
  } else if(burnout > 60 && burnout <= 100) {
    characterImage = 'models/3.png';
  } else {
    // For 20-40% range, show models/1.png as default
    characterImage = 'models/1.png';
  }
  document.getElementById('mood-character').src = characterImage;

  document.getElementById('status-txt').textContent = statusText;
  document.getElementById('status-txt').className = 'status-label ' + colorClass;

  const msgs = {
    optimal: 'System nominal. Fatigue index within acceptable parameters.',
    caution: 'Elevated session load detected. Consider a break.',
    critical: 'HIGH BURNOUT RISK. Immediate rest recommended.'
  };
  document.getElementById('session-info').textContent = msgs[state];

  createSegmentedProgress('total-progress', burnout);
}

// ===== RENDER APP LIST =====
function renderAppList(items) {
  const el = document.getElementById('app-list');
  el.innerHTML = '';
  items.forEach(item => {
    const pct = item.max ? Math.min((item.time / item.max) * 100, 100) : 0;
    const row = document.createElement('div');
    row.className = 'tech-stat-row';
    row.style.marginBottom = '0.75rem';
    row.innerHTML = `
      <div class="tech-stat-label">
        <span>${item.name}</span>
        <span class="cyan-text">${item.time}${item.unit}</span>
      </div>
      <div class="hud-progress">${generateSegments(pct)}</div>
    `;
    el.appendChild(row);
  });
}

// ===== UTILS =====
function generateSegments(percent) {
  let html = '';
  const active = Math.round((percent/100)*20);
  for(let i=0;i<20;i++) html += `<div class="progress-segment ${i<active?'active':''}"></div>`;
  return html;
}

function createSegmentedProgress(containerId, percent, color) {
  const container = document.getElementById(containerId);
  if(!container) return;
  let html = '';
  const active = Math.round((percent/100)*20);
  for(let i=0;i<20;i++) {
    html += `<div class="progress-segment ${i<active?'active':''}" style="${i<active&&color?'background:'+color+';box-shadow:0 0 5px '+color:''}"></div>`;
  }
  container.innerHTML = html;
}

function addLog(msg) {
  const el = document.getElementById('recent-apps');
  if(!el) return;
  const line = `> ${msg}<br>`;
  el.innerHTML = line + el.innerHTML;
  const lines = el.innerHTML.split('<br>');
  if(lines.length > 20) el.innerHTML = lines.slice(0,20).join('<br>');
}

// ===== CHARTS =====
let burnoutChart, weeklyChart;
function initChart() {
  const ctx = document.getElementById('burnoutChart').getContext('2d');
  burnoutChart = new Chart(ctx, {
    type:'line',
    data:{ labels:[], datasets:[{ data:[], borderColor:'#06b6d4', borderWidth:1.5, tension:0.4, pointRadius:0, fill:true,
      backgroundColor:'rgba(6,182,212,0.05)' }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        y:{ grid:{color:'rgba(6,182,212,0.05)'}, ticks:{color:'#444',font:{size:8}}, min:0, max:100 },
        x:{ grid:{color:'rgba(6,182,212,0.05)'}, ticks:{color:'#444',font:{size:8}} }
      }
    }
  });
}

function initWeeklyIntensityChart() {
  const ctx = document.getElementById('weeklyIntensityChart').getContext('2d');
  weeklyChart = new Chart(ctx, {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(6,182,212,0.15)', borderColor:'#06b6d4', borderWidth:1 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ y:{display:false}, x:{display:false} }
    }
  });
}

// ===== PARALLAX =====
document.addEventListener('mousemove', e => {
  const bg = document.getElementById('main-background');
  if(!bg) return;
  const x = (e.clientX - window.innerWidth/2) / 60;
  const y = (e.clientY - window.innerHeight/2) / 60;
  bg.style.transform = `translate(${x}px,${y}px) scale(1.05)`;
});

// ===== PERMISSIONS =====
async function requestPermissions() {
  document.getElementById('permission-banner').style.display = 'none';
  await initBattery();
  updateNetwork();
  addLog('FULL_TELEMETRY_ACCESS_GRANTED');
}

// ===== AXON AI =====
const axonMessages = document.getElementById('axon-messages');
const axonInput = document.getElementById('axon-input');
const typingIndicator = document.getElementById('typing-indicator');

function addAxonMessage(text, role='axon') {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = role === 'axon' ? '> ' + text : text;
  axonMessages.appendChild(div);
  axonMessages.scrollTop = axonMessages.scrollHeight;
}

function getSessionContext() {
  const elapsed = Date.now() - session.startTime;
  const mins = Math.round(elapsed / 60000);
  const hiddenRatio = Math.round((session.hiddenTime / elapsed) * 100);
  const focusScore = 100 - hiddenRatio;
  const burnout = Math.min((mins / 120) * 100, 100);
  return `
User's current session data:
- Session duration: ${mins} minutes
- Interactions (clicks/keystrokes/scrolls): ${session.interactions}
- Tab visibility changes: ${session.visibilityChanges}
- Time spent with tab hidden: ${Math.round(session.hiddenTime/1000)} seconds
- Focus score (time with tab visible): ${focusScore}%
- Burnout probability index: ${burnout.toFixed(1)}%
- Current state: ${session.currentState.toUpperCase()}
- Battery: ${session.batteryLevel !== null ? session.batteryLevel + '%' : 'unavailable'} ${session.batteryCharging ? '(charging)' : ''}
- Network type: ${session.networkType}
- Device cores: ${navigator.hardwareConcurrency || 'unknown'}
- Device memory: ${navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'unknown'}
  `.trim();
}

async function sendToAxon(userMsg) {
  addAxonMessage(userMsg, 'user');
  axonInput.value = '';
  typingIndicator.style.display = 'block';

  const context = getSessionContext();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are AXON, an advanced AI system embedded in a cyberpunk-style screen time monitoring HUD. You monitor the user's CURRENT device session data from their browser. Speak in a technical, slightly robotic but helpful style. Use short sentences. Reference actual session numbers when relevant. Help the user understand their digital habits. Keep responses under 3 sentences unless more detail is clearly needed. Don't use markdown. Here is the real-time session data you are monitoring:\n\n${context}`,
        messages: [{ role:'user', content: userMsg }]
      })
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || 'SIGNAL_LOST. Retry query.';
    typingIndicator.style.display = 'none';
    addAxonMessage(text);
    addLog('AXON_RESPONSE_DELIVERED');
  } catch(err) {
    typingIndicator.style.display = 'none';
    addAxonMessage('CONNECTION_ERROR. Backend unreachable. Check API configuration.');
    console.error('Axon error:', err);
  }
}

document.getElementById('axon-send').addEventListener('click', () => {
  const msg = axonInput.value.trim();
  if(msg) sendToAxon(msg);
});
axonInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    const msg = axonInput.value.trim();
    if(msg) sendToAxon(msg);
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  initWeeklyIntensityChart();
  startClock();
  detectDevice();
  updateNetwork();
  samplePerformance();
  setInterval(samplePerformance, 3000);
  setInterval(updateNetwork, 10000);

  // Show permission banner after 1s
  setTimeout(() => {
    document.getElementById('permission-banner').style.display = 'flex';
  }, 1000);

  addLog('AXON_SYSTEM_BOOT_COMPLETE');
  addLog('TELEMETRY_COLLECTION_ACTIVE');

  window.addEventListener('online', () => { addLog('NETWORK: ONLINE'); updateNetwork(); });
  window.addEventListener('offline', () => { addLog('NETWORK: OFFLINE'); updateNetwork(); });
});
