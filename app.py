from flask import Flask, render_template, request, jsonify
import random
import uuid

app = Flask(__name__)
app.secret_key = 'change-this-to-a-secret-in-production'

# In-memory store for active rounds (resets on restart)
active_rounds = {}

def generate_crash_point(house_edge=0.01):
    """
    Returns a random crash multiplier >= 1.00.
    P(crash > x) = 1/(x) * (1 - house_edge)
    """
    r = random.random()
    if r < house_edge:
        return 1.00
    return max(1.00, 1.0 / (1.0 - r) * (1.0 - house_edge))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start', methods=['POST'])
def start_round():
    """Start a new round – generate crash point, return round_id."""
    data = request.get_json()
    bet = float(data.get('bet', 10.0))
    if bet <= 0:
        return jsonify({'error': 'Bet must be positive'}), 400

    crash_point = generate_crash_point()
    round_id = str(uuid.uuid4())
    active_rounds[round_id] = {
        'crash_point': crash_point,
        'bet': bet,
        'active': True
    }
    return jsonify({
        'round_id': round_id,
        'crash_point': crash_point
    })

@app.route('/api/cashout', methods=['POST'])
def cash_out():
    """Cash out at a given multiplier – server validates against crash point."""
    data = request.get_json()
    round_id = data.get('round_id')
    multiplier = float(data.get('multiplier'))

    if round_id not in active_rounds:
        return jsonify({'success': False, 'error': 'Invalid or expired round'}), 400

    round_data = active_rounds[round_id]
    if not round_data['active']:
        return jsonify({'success': False, 'error': 'Round already finished'}), 400

    crash_point = round_data['crash_point']
    bet = round_data['bet']

    # If the multiplier reached or exceeded the crash point, it's a crash
    if multiplier >= crash_point:
        round_data['active'] = False
        return jsonify({
            'success': False,
            'crashed': True,
            'crash_multiplier': crash_point,
            'message': f'💥 Crashed at {crash_point:.2f}x! You lost ${bet:.2f}.'
        })

    # Otherwise, player wins
    win_amount = bet * multiplier
    round_data['active'] = False
    return jsonify({
        'success': True,
        'win_amount': round(win_amount, 2),
        'multiplier': round(multiplier, 2),
        'message': f'✅ Cashed out at {multiplier:.2f}x! Won ${win_amount:.2f}.'
    })

if __name__ == '__main__':
    # For local development
    app.run(debug=True, host='0.0.0.0', port=5000)
