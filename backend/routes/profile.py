from flask import Blueprint, jsonify, request
from backend.utils.validators import validate_profile_data
from backend.services.macro_calculator import calculate_bmr, calculate_tdee, calculate_macros

profile_bp = Blueprint('profile', __name__)


def _sanitize_profile_data(data):
    """Ensure numeric types are converted from strings if needed."""
    sanitized = dict(data)
    numeric_fields = ['age', 'weight', 'height', 'workout_days']
    for field in numeric_fields:
        if field in sanitized and sanitized[field] is not None and sanitized[field] != '':
            try:
                sanitized[field] = float(sanitized[field])
                if field in ['age', 'workout_days']:
                    sanitized[field] = int(sanitized[field])
            except (ValueError, TypeError):
                pass
    return sanitized


@profile_bp.route('/validate', methods=['POST'])
def validate_profile():
    """Validate profile data server-side."""
    data = request.get_json()
    if not data:
        return jsonify({'valid': False, 'errors': ['No data provided']}), 400

    sanitized = _sanitize_profile_data(data)
    errors = validate_profile_data(sanitized)
    if errors:
        return jsonify({'valid': False, 'errors': errors}), 400

    return jsonify({'valid': True, 'errors': []})


@profile_bp.route('/calculate', methods=['POST'])
def calculate_profile():
    """Calculate BMR, TDEE, and recommended macro targets based on profile data."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    sanitized = _sanitize_profile_data(data)
    errors = validate_profile_data(sanitized)
    if errors:
        return jsonify({'error': 'Validation failed', 'errors': errors}), 400

    weight = float(sanitized.get('weight', 70))
    height = float(sanitized.get('height', 175))
    age = int(sanitized.get('age', 25))
    gender = sanitized.get('gender', 'male')
    activity = sanitized.get('activity_level', 'moderate')
    goal = sanitized.get('goal', 'maintenance')

    bmr = round(calculate_bmr(weight, height, age, gender))
    tdee = round(calculate_tdee(bmr, activity))
    macros = calculate_macros(tdee, goal)

    return jsonify({
        'bmr': bmr,
        'tdee': tdee,
        'targets': macros
    })

