const API_BASE = window.location.origin;  // works on Render & local

let balance = 1000.00;
let currentBet = 10.00;
let roundId = null;
let crashPoint = 1.00;
let multiplier = 1.00;
let isRunning = false;
let isCashedOut = false;
let intervalId = null;
let history = [];

const balanceEl = document.getElementById('balance');
const multiplierEl = document.getElementById('multiplier');
const statusEl = document.getElementById('status');
const betInput = document.getElementById('betAmount');
const placeBtn = document.getElementById('placeBtn');
const cashBtn = document.getElementById('cashBtn');
const historyList = document.getElementById('historyList');

function updateBalance() {
    balanceEl.textContent = balance.toFixed(2);
}

function updateMultiplier() {
    multiplierEl.textContent = multiplier.toFixed(2);
    // Color changes based on multiplier
    if (multiplier >= 5) multiplierEl.style.color = '#e17055';
    else if (multiplier >= 2) multiplierEl.style.color = '#fdcb6e';
    else multiplierEl.style.color = '#00d4ff';
}

function addHistory(text, isWin) {
    history.unshift({ text, isWin });
    if (history.length > 10) history.pop();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = history.map(h =>
        `<span class="history-item ${h.isWin ? 'win' : 'loss'}">${h.text}</span>`
    ).join('');
}

async function placeBet() {
    if (isRunning) return;

    const bet = parseFloat(betInput.value);
    if (isNaN(bet) || bet <= 0) {
        statusEl.textContent = '⚠️ Enter a valid bet amount.';
        return;
    }
    if (bet > balance) {
        statusEl.textContent = '❌ Insufficient balance.';
        return;
    }

    // Deduct bet locally (server will validate later)
    balance -= bet;
    updateBalance();
    currentBet = bet;

    // Start round via API
    try {
        const res = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet: bet })
        });
        const data = await res.json();
        if (!res.ok) {
            statusEl.textContent = '❌ ' + (data.error || 'Server error');
            balance += bet; // refund
            updateBalance();
            return;
        }

        roundId = data.round_id;
        crashPoint = data.crash_point;
        multiplier = 1.00;
        isRunning = true;
        isCashedOut = false;

        placeBtn.disabled = true;
        cashBtn.disabled = false;
        statusEl.textContent = '✈️ Flying... Cash out before crash!';
        updateMultiplier();

        // Start animation
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            // Increase multiplier with slight random speed
            const inc = 0.01 + (Math.random() * 0.02);
            multiplier += inc;
            multiplier = Math.round(multiplier * 100) / 100;
            updateMultiplier();

            // Check if crashed
            if (multiplier >= crashPoint) {
                crash();
            }
        }, 50);

    } catch (err) {
        statusEl.textContent = '⚠️ Network error. Please try again.';
        balance += bet;
        updateBalance();
    }
}

async function cashOut() {
    if (!isRunning || isCashedOut) return;

    isCashedOut = true;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    try {
        const res = await fetch('/api/cashout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                round_id: roundId,
                multiplier: multiplier
            })
        });
        const data = await res.json();

        if (data.success) {
            balance += data.win_amount;
            updateBalance();
            statusEl.textContent = data.message;
            multiplierEl.style.color = '#00b894';
            addHistory(`✅ ${data.multiplier}x (+$${data.win_amount.toFixed(2)})`, true);
        } else if (data.crashed) {
            // The server says it actually crashed (should match our local crash)
            statusEl.textContent = data.message;
            multiplierEl.style.color = '#e17055';
            addHistory(`💥 ${data.crash_multiplier}x (Loss)`, false);
        } else {
            statusEl.textContent = '⚠️ ' + (data.error || 'Cashout failed');
            // re-enable? better to reset
        }
    } catch (err) {
        statusEl.textContent = '⚠️ Network error during cashout.';
    }

    // Reset round state
    isRunning = false;
    placeBtn.disabled = false;
    cashBtn.disabled = true;
    roundId = null;
}

function crash() {
    // Called locally when multiplier reaches crash point
    if (!isRunning) return;
    isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    // We don't add balance here – the server will validate, but we already know it's a loss
    // The server might have a slightly different crash point due to floating point,
    // but we use the same generation logic, so it's fine.
    // For consistency, we call cashOut() which will hit the API,
    // but since we are already at crash point, the server will return crashed.
    // However, cashOut() requires a button click. We'll auto-cashout at crash.
    // Actually, we should just show the crash and reset.
    statusEl.textContent = `💥 Crashed at ${multiplier.toFixed(2)}x! Lost $${currentBet.toFixed(2)}.`;
    multiplierEl.style.color = '#e17055';
    placeBtn.disabled = false;
    cashBtn.disabled = true;
    addHistory(`💥 ${multiplier.toFixed(2)}x (Loss)`, false);
    // No balance change – already deducted.
    // But we should still tell the server to close the round to avoid stale state.
    // We'll just let the server's round expire or call a cleanup.
    // For simplicity, we call cashOut() silently if it's still active.
    // Actually, let's just send a quick POST to /api/cashout to mark round inactive.
    fetch('/api/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            round_id: roundId,
            multiplier: multiplier
        })
    }).catch(() => {});
    roundId = null;
    isRunning = false;
}

// Event listeners
placeBtn.addEventListener('click', placeBet);
cashBtn.addEventListener('click', cashOut);

// Initial state
updateBalance();
updateMultiplier();
renderHistory();
