from flask import Blueprint, jsonify
from config import Config

api_bp = Blueprint('api', __name__)


@api_bp.route('/health')
def health():
    return jsonify({'status': 'healthy'})


@api_bp.route('/config')
def get_config():
    """Return non-sensitive configuration for the frontend."""
    return jsonify({
        'features': {
            'nutrition_api': Config.has_nutritionix(),
            'ai_coaching': Config.has_gemini()
        }
    })
