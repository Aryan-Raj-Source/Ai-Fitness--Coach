import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.nutrition_api import search_local_foods, COMMON_FOODS
from app import create_app


def test_search_local_foods_exact():
    results = search_local_foods('Chicken Breast')
    assert len(results) > 0
    assert 'Chicken Breast' in results[0]['name']
    assert results[0]['protein'] > 20


def test_search_local_foods_case_insensitive():
    results = search_local_foods('banana')
    assert len(results) > 0
    assert results[0]['name'] == 'Banana'
    assert results[0]['calories'] > 0


def test_search_local_foods_empty():
    assert search_local_foods('') == []
    assert search_local_foods('xyznonexistentfood12345') == []


def test_nutrition_search_route():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        res = client.get('/api/nutrition/search?q=rice')
        assert res.status_code == 200
        data = res.get_json()
        assert data['count'] > 0
        assert any('Rice' in r['name'] for r in data['results'])


def test_nutrition_common_route():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        res = client.get('/api/nutrition/common')
        assert res.status_code == 200
        data = res.get_json()
        assert len(data['foods']) > 0


def test_nutrition_validate_route():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        valid_res = client.post('/api/nutrition/validate', json={
            'name': 'Oatmeal',
            'calories': 150,
            'servings': 1,
            'meal': 'breakfast'
        })
        assert valid_res.status_code == 200
        assert valid_res.get_json()['valid'] is True

        invalid_res = client.post('/api/nutrition/validate', json={
            'calories': -50,
            'meal': 'unknown'
        })
        assert invalid_res.status_code == 400
        assert invalid_res.get_json()['valid'] is False


def test_barcode_lookup_sample():
    from backend.services.nutrition_api import lookup_openfoodfacts
    res = lookup_openfoodfacts('737628064502')
    assert res is not None
    assert 'Thai Kitchen' in res['name']
    assert res['calories'] == 200


def test_barcode_lookup_route():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        res = client.get('/api/nutrition/barcode/737628064502')
        assert res.status_code == 200
        data = res.get_json()
        assert data['found'] is True
        assert data['product']['name'] is not None

        not_found = client.get('/api/nutrition/barcode/0000000000000')
        # Could be 404
        assert not_found.status_code == 404

