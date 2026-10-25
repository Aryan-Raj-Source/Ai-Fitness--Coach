"""AI Coach blueprint endpoints.

Handles interactive coaching questions, daily recommendations, and AI status inquiries.
"""

from flask import Blueprint, jsonify, request
from config import Config
from backend.services.ai_service import (
    generate_coaching_response,
    DEFAULT_MODEL
)

coach_bp = Blueprint('coach', __name__)


@coach_bp.route('/status', methods=['GET'])
def coach_status():
    """Return status of AI coaching service and Gemini integration."""
    has_gemini = Config.has_gemini()
    return jsonify({
        'enabled': True,
        'has_gemini': has_gemini,
        'model': DEFAULT_MODEL if has_gemini else 'FitCoach Rule Engine',
        'status': 'ready'
    })


@coach_bp.route('/ask', methods=['POST'])
def coach_ask():
    """Process an AI coaching request with user message and client context."""
    data = request.get_json() or {}

    category = data.get('category', 'general')
    user_message = data.get('message', '').strip()
    context = data.get('context', {})

    # If both message and category are empty, provide general coaching
    if not user_message and not category:
        category = 'general'

    response = generate_coaching_response(
        category=category,
        user_message=user_message,
        context=context
    )

    return jsonify(response)


@coach_bp.route('/tips', methods=['GET'])
def get_quick_tips():
    """Return curated quick coaching prompts and tips."""
    category = request.args.get('category', 'all')

    prompts = [
        {
            'id': 'p_nutrition',
            'category': 'nutrition',
            'title': '🥗 Analyze Today\'s Nutrition',
            'prompt': 'Analyze my current calorie and macronutrient intake for today. Where can I improve?'
        },
        {
            'id': 'p_workout',
            'category': 'workout',
            'title': '🏋️ Workout Progression Tips',
            'prompt': 'How should I apply progressive overload to my current workout routine this week?'
        },
        {
            'id': 'p_plateau',
            'category': 'plateau',
            'title': '🧗 Break Through a Plateau',
            'prompt': 'My scale weight / strength has plateaued for 2 weeks. What adjustments should I make?'
        },
        {
            'id': 'p_recovery',
            'category': 'recovery',
            'title': '🧘 Recovery & Soreness Advice',
            'prompt': 'What are science-backed ways to speed up muscle recovery and reduce DOMS?'
        },
        {
            'id': 'p_creatine',
            'category': 'nutrition',
            'title': '💊 Creatine & Supplements',
            'prompt': 'Should I take creatine monohydrate, how much, and what are the proven benefits?'
        },
        {
            'id': 'p_cardio',
            'category': 'workout',
            'title': '🏃 Cardio vs Lifting Strategy',
            'prompt': 'How should I time my cardio sessions around resistance training for my goals?'
        }
    ]

    if category != 'all':
        prompts = [p for p in prompts if p['category'] == category]

    return jsonify({'quick_prompts': prompts})


@coach_bp.route('/quick-analysis', methods=['POST'])
def quick_analysis():
    """Generate an instant scorecard and summary of today's fitness adherence."""
    data = request.get_json() or {}
    nutrition = data.get('nutrition', {})
    workouts = data.get('workouts', {})
    profile = data.get('profile', {})

    consumed = nutrition.get('consumed', {})
    targets = nutrition.get('targets', {})

    cal_eaten = consumed.get('calories', 0)
    cal_target = targets.get('calories', 2000)
    p_eaten = consumed.get('protein', 0)
    p_target = targets.get('protein', 140)

    highlights = []
    status = 'On Track'

    # Calorie evaluation
    if cal_target > 0:
        ratio = cal_eaten / cal_target
        if 0.85 <= ratio <= 1.1:
            highlights.append(f"Calorie intake is well-balanced ({cal_eaten:.0f} / {cal_target:.0f} kcal).")
        elif ratio < 0.85:
            highlights.append(f"Calories are currently under target ({cal_eaten:.0f} / {cal_target:.0f} kcal).")
        else:
            highlights.append(f"Calories exceeded daily target by {cal_eaten - cal_target:.0f} kcal.")
            status = 'Slight Surplus'

    # Protein evaluation
    if p_target > 0:
        if p_eaten >= p_target * 0.85:
            highlights.append(f"Great protein intake ({p_eaten:.0f}g / {p_target:.0f}g target).")
        else:
            highlights.append(f"Protein is below optimal ({p_eaten:.0f}g / {p_target:.0f}g).")

    # Workout evaluation
    completed_today = workouts.get('completed_today', False)
    if completed_today:
        highlights.append("Workout logged for today! Outstanding discipline.")
    else:
        highlights.append("No workout recorded for today yet.")

    return jsonify({
        'status': status,
        'highlights': highlights,
        'timestamp': data.get('timestamp')
    })
