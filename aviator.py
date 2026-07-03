import tkinter as tk
from tkinter import messagebox
import random
import math

# -------------------------- Game Configuration --------------------------
INITIAL_BALANCE = 1000.0
BET_AMOUNT = 10.0          # fixed bet per round
UPDATE_INTERVAL = 50       # milliseconds
MAX_MULTIPLIER = 100.0     # safety cap

# -------------------------- Crash Point Generator -----------------------
def generate_crash_point(house_edge=0.01):
    r = random.random()
    if r < house_edge:
        return 1.00
    return max(1.00, 1.0 / (1.0 - r) * (1.0 - house_edge))

# -------------------------- Game Class ----------------------------------
class AviatorGame:
    def __init__(self, master):
        self.master = master
        master.title("✈️ Aviator – Crash Game")
        master.geometry("500x450")
        master.resizable(False, False)

        self.balance = INITIAL_BALANCE
        self.bet = BET_AMOUNT
        self.crash_point = 1.00
        self.multiplier = 1.00
        self.round_active = False
        self.cashed_out = False
        self.running = False
        self.after_id = None
        self.history = []

        # ---------- GUI Elements ----------
        tk.Label(master, text="✈️ AVIATOR", font=("Helvetica", 24, "bold")).pack(pady=10)

        self.balance_label = tk.Label(master, text=f"Balance: ${self.balance:.2f}", font=("Helvetica", 14))
        self.balance_label.pack()
        self.bet_label = tk.Label(master, text=f"Bet: ${self.bet:.2f}", font=("Helvetica", 12))
        self.bet_label.pack(pady=5)

        self.mult_label = tk.Label(master, text="1.00x", font=("Helvetica", 48, "bold"), fg="blue")
        self.mult_label.pack(pady=20)

        self.status = tk.Label(master, text="Press 'Place Bet' to start", font=("Helvetica", 12))
        self.status.pack()

        btn_frame = tk.Frame(master)
        btn_frame.pack(pady=15)

        self.place_btn = tk.Button(btn_frame, text="Place Bet", command=self.place_bet,
                                   width=12, height=2, bg="lightgreen")
        self.place_btn.grid(row=0, column=0, padx=10)

        self.cash_btn = tk.Button(btn_frame, text="Cash Out", command=self.cash_out,
                                  width=12, height=2, bg="orange", state=tk.DISABLED)
        self.cash_btn.grid(row=0, column=1, padx=10)

        tk.Label(master, text="Recent Results:", font=("Helvetica", 12)).pack(pady=(10,0))
        self.history_label = tk.Label(master, text="", font=("Helvetica", 10))
        self.history_label.pack()

        tk.Button(master, text="Quit", command=master.quit, bg="lightcoral").pack(pady=10)

    # -------------------------- Game Logic ------------------------------
    def place_bet(self):
        if self.running:
            return
        if self.balance < self.bet:
            messagebox.showerror("Insufficient balance",
                                 f"Your balance is ${self.balance:.2f}.\nMinimum bet is ${self.bet:.2f}.")
            return

        self.balance -= self.bet
        self.update_balance_display()

        self.crash_point = generate_crash_point()
        self.multiplier = 1.00
        self.cashed_out = False
        self.round_active = True
        self.running = True

        self.mult_label.config(text="1.00x", fg="blue")
        self.status.config(text="Game running... Cash out before crash!", fg="black")
        self.place_btn.config(state=tk.DISABLED)
        self.cash_btn.config(state=tk.NORMAL)

        self.update_multiplier()

    def update_multiplier(self):
        if not self.running:
            return

        increment = 0.01 + random.uniform(0.001, 0.02)
        self.multiplier += increment
        self.multiplier = round(self.multiplier, 2)

        self.mult_label.config(text=f"{self.multiplier:.2f}x")

        if self.multiplier >= self.crash_point:
            self.crash()
            return

        self.after_id = self.master.after(UPDATE_INTERVAL, self.update_multiplier)

    def cash_out(self):
        if not self.running or self.cashed_out or not self.round_active:
            return

        self.cashed_out = True
        self.running = False
        if self.after_id:
            self.master.after_cancel(self.after_id)
            self.after_id = None

        win_amount = self.bet * self.multiplier
        self.balance += win_amount
        self.update_balance_display()

        self.mult_label.config(fg="green")
        self.status.config(text=f"✅ Cashed out at {self.multiplier:.2f}x! Won ${win_amount:.2f}", fg="green")
        self.cash_btn.config(state=tk.DISABLED)
        self.place_btn.config(state=tk.NORMAL)
        self.round_active = False

        self.add_history(f"Win {self.multiplier:.2f}x", "green")

    def crash(self):
        self.running = False
        self.round_active = False
        if self.after_id:
            self.master.after_cancel(self.after_id)
            self.after_id = None

        self.mult_label.config(text=f"{self.multiplier:.2f}x 💥", fg="red")
        self.status.config(text=f"💥 Crash at {self.multiplier:.2f}x! Lost ${self.bet:.2f}", fg="red")
        self.cash_btn.config(state=tk.DISABLED)
        self.place_btn.config(state=tk.NORMAL)

        self.add_history(f"Crash {self.multiplier:.2f}x", "red")

    def add_history(self, text, color):
        self.history.append((text, color))
        if len(self.history) > 5:
            self.history.pop(0)
        history_text = "  ".join([f"[{t}]" for t, _ in self.history])
        self.history_label.config(text=history_text, fg="black")

    def update_balance_display(self):
        self.balance_label.config(text=f"Balance: ${self.balance:.2f}")

# -------------------------- Run the Application -------------------------
if __name__ == "__main__":
    root = tk.Tk()
    game = AviatorGame(root)
    root.mainloop()
