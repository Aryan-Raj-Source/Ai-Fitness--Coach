from flask import Blueprint, jsonify, request
from config import Config
from backend.services.nutrition_api import search_local_foods, search_nutritionix, lookup_openfoodfacts, COMMON_FOODS
from backend.utils.validators import validate_food_entry

nutrition_bp = Blueprint('nutrition', __name__)


@nutrition_bp.route('/search', methods=['GET'])
def search_food():
    """Search for food items across Nutritionix and verified local database."""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Search query is required'}), 400

    results = []
    source = 'local'

    # Try Nutritionix if credentials are configured
    if Config.has_nutritionix():
        try:
            results = search_nutritionix(query, Config.NUTRITIONIX_APP_ID, Config.NUTRITIONIX_API_KEY)
            if results:
                source = 'nutritionix'
        except Exception:
            results = []

    # Fallback to local verified database if no Nutritionix results
    if not results:
        results = search_local_foods(query)
        source = 'local'

    return jsonify({
        'query': query,
        'results': results,
        'count': len(results),
        'source': source
    })


@nutrition_bp.route('/barcode/<barcode>', methods=['GET'])
def lookup_barcode(barcode):
    """Look up a food item by barcode via OpenFoodFacts."""
    if not barcode or not barcode.strip():
        return jsonify({'error': 'Barcode is required'}), 400

    product = lookup_openfoodfacts(barcode.strip())
    if product:
        return jsonify({
            'found': True,
            'product': product
        })

    return jsonify({
        'found': False,
        'message': f'Product with barcode {barcode} was not found in OpenFoodFacts database.'
    }), 404


@nutrition_bp.route('/common', methods=['GET'])
def get_common_foods():
    """Return common quick-add food suggestions."""
    limit = int(request.args.get('limit', 12))
    return jsonify({
        'foods': COMMON_FOODS[:limit]
    })


@nutrition_bp.route('/validate', methods=['POST'])
def validate_meal_entry():
    """Validate food entry server-side."""
    data = request.get_json() or {}
    errors = validate_food_entry(data)
    if errors:
        return jsonify({'valid': False, 'errors': errors}), 400
    return jsonify({'valid': True, 'errors': []})
