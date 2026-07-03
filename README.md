# ✈️ Aviator – Crash Game

A classic “crash” betting game written in Python with Tkinter.  
Place a bet, watch the multiplier rise, and cash out before it crashes!

## Features
- Randomised crash point with a 1% house edge.
- Real‑time multiplier updates every 50 ms.
- Track your balance and last 5 results.
- Simple, clean interface.

## How to Play
1. Run the game (see below).
2. Click **Place Bet** – your bet is deducted from the balance.
3. The multiplier starts at 1.00x and climbs.
4. Click **Cash Out** anytime to lock in your profit:  
   **Win = Bet × Current Multiplier**
5. If the multiplier crashes before you cash out, you lose the bet.
6. Start a new round with another bet.

## Running Locally (without Docker)
Make sure you have Python 3.6+ installed (Tkinter comes bundled with most distributions).

```bash
python aviator.py
