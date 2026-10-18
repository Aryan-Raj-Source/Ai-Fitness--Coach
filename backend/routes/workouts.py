from flask import Blueprint, jsonify, request

workouts_bp = Blueprint('workouts', __name__)


@workouts_bp.route('/generate', methods=['POST'])
def generate_workout():
    """Generate a workout plan. Implemented in Phase 3."""
    return jsonify({'plan': None, 'message': 'Workout generation will be available in a future update.'})
