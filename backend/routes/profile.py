from flask import Blueprint, jsonify, request
from backend.utils.validators import validate_profile_data

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/validate', methods=['POST'])
def validate_profile():
    """Validate profile data server-side."""
    data = request.get_json()
    if not data:
        return jsonify({'valid': False, 'errors': ['No data provided']}), 400

    errors = validate_profile_data(data)
    if errors:
        return jsonify({'valid': False, 'errors': errors}), 400

    return jsonify({'valid': True, 'errors': []})
