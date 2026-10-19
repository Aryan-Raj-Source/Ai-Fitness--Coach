from flask import Blueprint, jsonify, request
from backend.services.workout_generator import generate_workout_plan, EXERCISE_DATABASE

workouts_bp = Blueprint('workouts', __name__)


@workouts_bp.route('/generate', methods=['POST'])
def generate_workout():
    """Generate a workout plan based on user profile or request preferences."""
    data = request.get_json() or {}

    plan = generate_workout_plan(data)
    if not plan:
        return jsonify({'plan': None, 'error': 'Failed to generate workout plan. Check input parameters.'}), 400

    return jsonify({
        'plan': plan,
        'message': f"Successfully generated {plan['days_per_week']}-day {plan['split_type']} plan."
    })


@workouts_bp.route('/library', methods=['GET'])
def get_exercise_library():
    """Return categorized exercise library by equipment."""
    equipment = request.args.get('equipment', 'full_gym')
    if equipment not in EXERCISE_DATABASE:
        equipment = 'full_gym'
    return jsonify({
        'equipment': equipment,
        'exercises': EXERCISE_DATABASE.get(equipment, {})
    })
