const API_BASE = window.location.origin;

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

    balance -= bet;
    updateBalance();
    currentBet = bet;

    try {
        const res = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet })
        });
        const data = await res.json();
        if (!res.ok) {
            statusEl.textContent = '❌ ' + (data.error || 'Server error');
            balance += bet;
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

        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            const inc = 0.01 + (Math.random() * 0.02);
            multiplier += inc;
            multiplier = Math.round(multiplier * 100) / 100;
            updateMultiplier();

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
            body: JSON.stringify({ round_id: roundId, multiplier })
        });
        const data = await res.json();

        if (data.success) {
            balance += data.win_amount;
            updateBalance();
            statusEl.textContent = data.message;
            multiplierEl.style.color = '#00b894';
            addHistory(`✅ ${data.multiplier}x (+$${data.win_amount.toFixed(2)})`, true);
        } else if (data.crashed) {
            statusEl.textContent = data.message;
            multiplierEl.style.color = '#e17055';
            addHistory(`💥 ${data.crash_multiplier}x (Loss)`, false);
        } else {
            statusEl.textContent = '⚠️ ' + (data.error || 'Cashout failed');
        }
    } catch (err) {
        statusEl.textContent = '⚠️ Network error during cashout.';
    } finally {
        isRunning = false;
        placeBtn.disabled = false;
        cashBtn.disabled = true;
        roundId = null;
    }
}

function crash() {
    if (!isRunning) return;
    isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    statusEl.textContent = `💥 Crashed at ${multiplier.toFixed(2)}x! Lost $${currentBet.toFixed(2)}.`;
    multiplierEl.style.color = '#e17055';
    placeBtn.disabled = false;
    cashBtn.disabled = true;
    addHistory(`💥 ${multiplier.toFixed(2)}x (Loss)`, false);

    // Inform server to close the round
    fetch('/api/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: roundId, multiplier })
    }).catch(() => {});

    roundId = null;
}

// Event listeners
placeBtn.addEventListener('click', placeBet);
cashBtn.addEventListener('click', cashOut);

// Initial render
updateBalance();
updateMultiplier();
renderHistory();
