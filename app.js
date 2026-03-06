/* ============================================
   VAULT LOG — App Logic
   
   State machine: ALERT → IDLE → VAULT → ALERT
   - ALERT:  home screen with visit stats
   - IDLE:   alarm acknowledged, user picks action
   - VAULT:  inside vault, timer ticks up
   
   Persistence: localStorage (key: "vault_log")
   Historical data: imported once from data.js
   ============================================ */

const STATES = { ALERT: 'alert', IDLE: 'idle', VAULT: 'vault' };
const STORAGE_KEY = 'vault_log';

// ---- DOM REFS ----

const $ = (id) => document.getElementById(id);

const screenEls = {
    alert: $('screen-alert'),
    idle: $('screen-idle'),
    vault: $('screen-vault'),
};

const els = {
    timerVault: $('timer-vault'),
    statsToday: $('stats-today'),
    statsTotal: $('stats-total'),
    statsDate: $('stats-date'),
    statsTime: $('stats-time'),
};

// ---- STATE ----

let state = STATES.ALERT;
let vaultStart = null;     // ISO string — when user entered the vault
let timerInterval = null;
let visits = [];           // Array<{ start: string, end: string }>

// ---- PERSISTENCE ----

/** Save current state + visits to localStorage. */
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, vaultStart, visits }));
}

/** Restore state from localStorage (if any). Migrates old key on first run. */
function load() {
    // Migrate from old storage key (shelter_tracker → vault_log)
    const legacy = localStorage.getItem('shelter_tracker');
    if (legacy && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem('shelter_tracker');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        state = data.state || STATES.ALERT;
        vaultStart = data.vaultStart || data.shelterStart || null;
        visits = data.visits || [];
    } catch (e) {
        console.error('Failed to load state', e);
    }
}

/** One-time import of manual logs from data.js (runs only when visits are empty). */
function importHistorical() {
    if (visits.length > 0 || typeof HISTORICAL_DATA === 'undefined') return;
    visits = HISTORICAL_DATA.map((v) => ({ start: v.start, end: v.end }));
    save();
}

// ---- TIME FORMATTING ----

function pad(n) {
    return String(n).padStart(2, '0');
}

/** Format ms duration as MM:SS or HH:MM:SS. */
function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatLastDate(iso) {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

function formatLastTime(iso) {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ---- STATS ----

/** Return the ISO timestamp of the most recent vault entry. */
function getLastEntry() {
    if (state === STATES.VAULT && vaultStart) return vaultStart;
    if (visits.length === 0) return null;
    return visits[visits.length - 1].start;
}

/** Update stats UI with today/total counts and last-entry timestamp. */
function renderStats() {
    const total = state === STATES.VAULT ? visits.length + 1 : visits.length;

    const today = new Date().toDateString();
    let todayCount = visits.filter(v => new Date(v.start).toDateString() === today).length;
    if (state === STATES.VAULT) todayCount++;

    els.statsToday.textContent = todayCount;
    els.statsTotal.textContent = total;

    const last = getLastEntry();
    els.statsDate.textContent = last ? formatLastDate(last) : '—';
    els.statsTime.textContent = last ? formatLastTime(last) : '—';
}

// ---- UI ----

/** Show only the given screen, hide all others. */
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

/** Update vault timer display each second. */
function tick() {
    if (state === STATES.VAULT && vaultStart) {
        els.timerVault.textContent = formatDuration(Date.now() - new Date(vaultStart).getTime());
    }
}

// ---- TRANSITIONS ----

/**
 * Move to a new state.
 * @param {string}  newState        - Target state from STATES.
 * @param {number|number[]} [vibratePattern=50] - Vibration pattern.
 * @param {boolean} [logVisit=false]   - If true, push current vault session to visits.
 * @param {boolean} [startVault=false] - If true, begin a new vault session.
 */
function transition(newState, { vibratePattern = 50, logVisit = false, startVault = false } = {}) {
    vibrate(vibratePattern);

    if (logVisit && vaultStart) {
        visits.push({ start: vaultStart, end: new Date().toISOString() });
    }

    vaultStart = startVault ? new Date().toISOString() : null;
    state = newState;
    save();
    stopTimer();

    if (newState === STATES.VAULT) startTimer();

    showScreen(newState);
    renderStats();
}

// ---- INIT ----

function init() {
    load();
    importHistorical();

    // Button bindings
    $('btn-alert-ack').addEventListener('click', () => transition(STATES.IDLE));
    $('btn-go-vault').addEventListener('click', () => transition(STATES.VAULT, { vibratePattern: 100, startVault: true }));
    $('btn-not-going').addEventListener('click', () => transition(STATES.ALERT));
    $('btn-exit-vault').addEventListener('click', () => transition(STATES.ALERT, { vibratePattern: [50, 50, 50], logVisit: true }));

    showScreen(state);
    if (state === STATES.VAULT) startTimer();
    renderStats();

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
