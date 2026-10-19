import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_profile_validate_success(client):
    res = client.post('/api/profile/validate', json={
        'age': 25,
        'weight': 75,
        'height': 175,
        'goal': 'fat_loss',
        'activity_level': 'moderate',
        'workout_days': 4
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['valid'] is True


def test_profile_validate_failure(client):
    res = client.post('/api/profile/validate', json={
        'age': 5,
        'weight': -10
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['valid'] is False
    assert len(data['errors']) > 0


def test_profile_calculate_endpoint(client):
    res = client.post('/api/profile/calculate', json={
        'age': 28,
        'gender': 'male',
        'weight': 80,
        'height': 180,
        'activity_level': 'moderate',
        'goal': 'fat_loss'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'bmr' in data
    assert 'tdee' in data
    assert 'targets' in data
    assert data['targets']['calories'] > 1200
    assert data['targets']['protein'] > 0
    assert data['targets']['carbs'] > 0
    assert data['targets']['fat'] > 0
