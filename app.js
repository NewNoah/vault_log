/* ============================================
   BOMB SHELTER TRACKER — App Logic
   State Machine + Timers + LocalStorage
   ============================================ */

(function () {
    'use strict';

    // ---- CONSTANTS ----
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            state, shelterStart, outsideStart, visits,
        }));
    }

    function load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
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
    }

    function importHistorical() {
        if (visits.length > 0) return;
        if (typeof HISTORICAL_DATA === 'undefined') return;
        visits = HISTORICAL_DATA.map((v) => ({ start: v.start, end: v.end }));
        save();
    }

    // ---- TIME FORMATTING ----

    function formatDuration(ms) {
        if (ms < 0) ms = 0;
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return h > 0
            ? `${pad(h)}:${pad(m)}:${pad(s)}`
            : `${pad(m)}:${pad(s)}`;
    }

    function formatHeader() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${dd}.${mm} ${hh}:${min}`;
    }

    // ---- STATS ----

    function getTodayStats() {
        const today = new Date().toDateString();
        let count = 0;
        let totalMs = 0;

        for (const v of visits) {
            const d = new Date(v.start);
            if (d.toDateString() === today) {
                count++;
                if (v.end) {
                    totalMs += new Date(v.end).getTime() - d.getTime();
                }
            }
        }

        if (state === STATES.SHELTER && shelterStart) {
            const startDate = new Date(shelterStart);
            if (startDate.toDateString() === today) {
                totalMs += Date.now() - startDate.getTime();
            }
        }

        return { count, totalMs };
    }

    function renderStats() {
        const today = getTodayStats();
        const total = state === STATES.SHELTER ? visits.length + 1 : visits.length;
        const todayCount = state === STATES.SHELTER ? today.count + 1 : today.count;

        if (state === STATES.SHELTER && shelterStart) {
            const elapsed = Date.now() - new Date(shelterStart).getTime();
            els.headerStats.textContent = `in shelter ${formatDuration(elapsed)}`;
        } else {
            els.headerStats.innerHTML = `today: ${todayCount}<br>total: ${total}`;
        }
    }

    // ---- SCREEN SWITCHING ----

    function showScreen(name) {
        Object.keys(screenEls).forEach((k) => {
            screenEls[k].classList.toggle('active', k === name);
        });
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
            const elapsed = now - new Date(shelterStart).getTime();
            els.timerShelter.textContent = formatDuration(elapsed);
        }

        if (state === STATES.OUTSIDE && outsideStart) {
            const elapsed = now - new Date(outsideStart).getTime();
            const remaining = CHECKIN_MS - elapsed;

            if (remaining <= 0) {
                els.timerOutside.textContent = '00:00';
                triggerCheckIn();
                return;
            }

            els.timerOutside.textContent = formatDuration(remaining);
        }

        els.headerTime.textContent = formatHeader();
        renderStats();
    }

    // ---- VIBRATE ----

    function vibrate(pattern) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    // ---- TRANSITIONS ----

    function acknowledgeAlert() {
        vibrate(50);
        state = STATES.IDLE;
        save();
        showScreen('idle');
    }

    function goToShelter() {
        vibrate(100);
        state = STATES.SHELTER;
        shelterStart = new Date().toISOString();
        outsideStart = null;
        save();
        showScreen('shelter');
        startTimer();
    }

    function exitShelter() {
        vibrate([50, 50, 50]);
        const end = new Date().toISOString();
        if (shelterStart) {
            visits.push({ start: shelterStart, end });
        }
        state = STATES.ALERT;
        shelterStart = null;
        save();
        stopTimer();
        showScreen('alert');
        renderStats();
    }

    function notGoing() {
        vibrate(50);
        state = STATES.ALERT;
        outsideStart = null;
        shelterStart = null;
        save();
        showScreen('alert');
        renderStats();
    }

    function iAmOkay() {
        vibrate([50, 50, 50]);
        state = STATES.ALERT;
        outsideStart = null;
        save();
        stopTimer();
        showScreen('alert');
        renderStats();
    }

    function triggerCheckIn() {
        vibrate([200, 100, 200, 100, 200]);
        state = STATES.ALERT;
        outsideStart = null;
        save();
        stopTimer();
        showScreen('alert');
        renderStats();
    }

    // ---- INIT ----

    function init() {
        load();
        importHistorical();

        $('btn-alert-ack').addEventListener('click', acknowledgeAlert);
        $('btn-go-shelter').addEventListener('click', goToShelter);
        $('btn-not-going').addEventListener('click', notGoing);
        $('btn-exit-shelter').addEventListener('click', exitShelter);
        $('btn-outside-go').addEventListener('click', goToShelter);
        $('btn-outside-ok').addEventListener('click', iAmOkay);

        showScreen(state);
        if (state === STATES.SHELTER || state === STATES.OUTSIDE) {
            startTimer();
        }

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
})();
