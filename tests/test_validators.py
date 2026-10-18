import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.validators import validate_profile_data, validate_food_entry


def test_valid_profile():
    data = {'age': 30, 'weight': 80, 'height': 180, 'goal': 'fat_loss'}
    assert validate_profile_data(data) == []


def test_invalid_age():
    assert len(validate_profile_data({'age': 5})) > 0
    assert len(validate_profile_data({'age': 200})) > 0


def test_invalid_weight():
    assert len(validate_profile_data({'weight': -10})) > 0
    assert len(validate_profile_data({'weight': 600})) > 0


def test_invalid_goal():
    assert len(validate_profile_data({'goal': 'invalid'})) > 0


def test_valid_food_entry():
    data = {'name': 'Chicken Breast', 'calories': 165, 'servings': 1, 'meal': 'lunch'}
    assert validate_food_entry(data) == []


def test_food_entry_missing_name():
    assert len(validate_food_entry({'calories': 100})) > 0


def test_food_entry_invalid_meal():
    assert len(validate_food_entry({'name': 'Test', 'meal': 'brunch'})) > 0
