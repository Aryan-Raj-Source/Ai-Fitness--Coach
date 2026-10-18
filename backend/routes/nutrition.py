from flask import Blueprint, jsonify, request

nutrition_bp = Blueprint('nutrition', __name__)


@nutrition_bp.route('/search', methods=['GET'])
def search_food():
    """Search for food items. Implemented in Phase 4."""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    return jsonify({'results': [], 'source': 'none', 'message': 'Nutrition search will be available in a future update.'})


@nutrition_bp.route('/barcode/<barcode>', methods=['GET'])
def lookup_barcode(barcode):
    """Look up a food item by barcode. Implemented in Phase 5."""
    if not barcode or not barcode.strip():
        return jsonify({'error': 'Barcode is required'}), 400
    return jsonify({'found': False, 'message': 'Barcode lookup will be available in a future update.'})
