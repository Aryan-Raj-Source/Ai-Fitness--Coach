import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.workout_generator import generate_workout_plan
from app import create_app


def test_generate_workout_plan_invalid():
    assert generate_workout_plan(None) is None
    assert generate_workout_plan("invalid") is None


def test_generate_workout_plan_3_days():
    profile = {
        'workout_days': 3,
        'fitness_level': 'intermediate',
        'goal': 'muscle_gain',
        'equipment': 'full_gym'
    }
    plan = generate_workout_plan(profile)
    assert plan is not None
    assert plan['days_per_week'] == 3
    assert len(plan['days']) == 3
    assert 'Push / Pull / Legs' in plan['split_type']
    assert plan['total_weekly_calories'] > 500

    # Verify day 1 has exercises
    day1 = plan['days'][0]
    assert len(day1['exercises']) >= 3
    for ex in day1['exercises']:
        assert 'name' in ex
        assert 'sets' in ex
        assert 'reps' in ex


def test_generate_workout_plan_4_days_upper_lower():
    profile = {
        'workout_days': 4,
        'fitness_level': 'beginner',
        'goal': 'fat_loss',
        'equipment': 'dumbbells'
    }
    plan = generate_workout_plan(profile)
    assert plan is not None
    assert plan['days_per_week'] == 4
    assert len(plan['days']) == 4
    assert 'Upper / Lower' in plan['split_type']
    # Check that exercises come from dumbbell library
    for day in plan['days']:
        for ex in day['exercises']:
            assert ex['sets'] == 3


def test_generate_workout_plan_bodyweight():
    profile = {
        'workout_days': 2,
        'fitness_level': 'advanced',
        'goal': 'maintenance',
        'equipment': 'bodyweight'
    }
    plan = generate_workout_plan(profile)
    assert plan is not None
    assert plan['days_per_week'] == 2
    assert len(plan['days']) == 2
    for day in plan['days']:
        for ex in day['exercises']:
            assert ex['sets'] == 4


def test_workout_routes():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        # Test generate
        res = client.post('/api/workouts/generate', json={
            'workout_days': 3,
            'fitness_level': 'intermediate',
            'equipment': 'full_gym',
            'goal': 'fat_loss'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['plan'] is not None
        assert data['plan']['days_per_week'] == 3

        # Test library
        lib_res = client.get('/api/workouts/library?equipment=dumbbells')
        assert lib_res.status_code == 200
        lib_data = lib_res.get_json()
        assert lib_data['equipment'] == 'dumbbells'
        assert 'Chest' in lib_data['exercises']
