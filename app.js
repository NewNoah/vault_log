/* ============================================
   VAULT LOG — App Logic
   State Machine + Timers + LocalStorage
   ============================================ */

const STATES = { ALERT: 'alert', IDLE: 'idle', SHELTER: 'shelter', OUTSIDE: 'outside' };
const CHECKIN_MS = 20 * 60 * 1000; // 20 minutes
const STORAGE_KEY = 'shelter_tracker';

// ---- DOM REFS ----
const $ = (id) => document.getElementById(id);
const screenEls = {
    alert: $('screen-alert'),
    idle: $('screen-idle'),
    shelter: $('screen-shelter'),
    outside: $('screen-outside'),
};
const els = {
    timerShelter: $('timer-shelter'),
    timerOutside: $('timer-outside'),
    headerTime: $('header-time'),
    headerStats: $('header-stats'),
};

// ---- STATE ----
let state = STATES.ALERT;
let shelterStart = null;
let outsideStart = null;
let timerInterval = null;
let visits = [];

// ---- PERSISTENCE ----

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, shelterStart, outsideStart, visits }));
}

function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        state = data.state || STATES.ALERT;
        shelterStart = data.shelterStart || null;
        outsideStart = data.outsideStart || null;
        visits = data.visits || [];
    } catch (e) {
        console.error('Failed to load state', e);
    }
}

// Import historical data from data.js (if present and visits empty)
function importHistorical() {
    if (visits.length > 0 || typeof HISTORICAL_DATA === 'undefined') return;
    visits = HISTORICAL_DATA.map((v) => ({ start: v.start, end: v.end }));
    save();
}

// ---- TIME FORMATTING ----

function pad(n) {
    return String(n).padStart(2, '0');
}

function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatHeader() {
    const now = new Date();
    return `${pad(now.getDate())}.${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ---- STATS ----

function getTotalTimeMs() {
    let ms = 0;
    for (const v of visits) {
        if (v.end) ms += new Date(v.end).getTime() - new Date(v.start).getTime();
    }
    if (state === STATES.SHELTER && shelterStart) {
        ms += Date.now() - new Date(shelterStart).getTime();
    }
    return ms;
}

function getLastEntry() {
    if (state === STATES.SHELTER && shelterStart) return shelterStart;
    if (visits.length === 0) return null;
    return visits[visits.length - 1].start;
}

function formatShortDate(iso) {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderStats() {
    const total = state === STATES.SHELTER ? visits.length + 1 : visits.length;

    // Count today's visits
    const today = new Date().toDateString();
    let todayCount = visits.filter(v => new Date(v.start).toDateString() === today).length;
    if (state === STATES.SHELTER) todayCount++;

    if (state === STATES.SHELTER && shelterStart) {
        els.headerStats.textContent = `in shelter ${formatDuration(Date.now() - new Date(shelterStart).getTime())}`;
    } else {
        const totalTime = formatDuration(getTotalTimeMs());
        const last = getLastEntry();
        const lastStr = last ? formatShortDate(last) : '—';
        els.headerStats.innerHTML = `today: ${todayCount} · total: ${total}<br>time: ${totalTime}<br>last: ${lastStr}`;
    }
}

// ---- UI ----

function showScreen(name) {
    for (const k in screenEls) screenEls[k].classList.toggle('active', k === name);
}

function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// ---- TIMER ----

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    stopTimer();
    tick();
    timerInterval = setInterval(tick, 1000);
}

function tick() {
    const now = Date.now();

    if (state === STATES.SHELTER && shelterStart) {
        els.timerShelter.textContent = formatDuration(now - new Date(shelterStart).getTime());
    }

    if (state === STATES.OUTSIDE && outsideStart) {
        const remaining = CHECKIN_MS - (now - new Date(outsideStart).getTime());
        if (remaining <= 0) {
            els.timerOutside.textContent = '00:00';
            transition(STATES.ALERT, { vibratePattern: [200, 100, 200, 100, 200] });
            return;
        }
        els.timerOutside.textContent = formatDuration(remaining);
    }

    els.headerTime.textContent = formatHeader();
    renderStats();
}

// ---- TRANSITIONS ----

function transition(newState, { vibratePattern = 50, logVisit = false, startShelter = false } = {}) {
    vibrate(vibratePattern);

    if (logVisit && shelterStart) {
        visits.push({ start: shelterStart, end: new Date().toISOString() });
    }

    if (startShelter) {
        shelterStart = new Date().toISOString();
    } else {
        shelterStart = null;
    }

    state = newState;
    outsideStart = null;
    save();
    stopTimer();

    if (newState === STATES.SHELTER || newState === STATES.OUTSIDE) {
        startTimer();
    }

    showScreen(newState);
    renderStats();
}

// ---- INIT ----

function init() {
    load();
    importHistorical();

    $('btn-alert-ack').addEventListener('click', () => transition(STATES.IDLE));
    $('btn-go-shelter').addEventListener('click', () => transition(STATES.SHELTER, { vibratePattern: 100, startShelter: true }));
    $('btn-not-going').addEventListener('click', () => transition(STATES.ALERT));
    $('btn-exit-shelter').addEventListener('click', () => transition(STATES.ALERT, { vibratePattern: [50, 50, 50], logVisit: true }));
    $('btn-outside-go').addEventListener('click', () => transition(STATES.SHELTER, { vibratePattern: 100, startShelter: true }));
    $('btn-outside-ok').addEventListener('click', () => transition(STATES.ALERT, { vibratePattern: [50, 50, 50] }));

    showScreen(state);
    if (state === STATES.SHELTER || state === STATES.OUTSIDE) startTimer();

    els.headerTime.textContent = formatHeader();
    renderStats();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
