import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.macro_calculator import calculate_bmr, calculate_tdee, calculate_macros


def test_calculate_bmr_male():
    # 80kg, 180cm, 30yo male
    bmr = calculate_bmr(80, 180, 30, 'male')
    assert 1700 < bmr < 1800


def test_calculate_bmr_female():
    # 65kg, 165cm, 28yo female
    bmr = calculate_bmr(65, 165, 28, 'female')
    assert 1300 < bmr < 1500


def test_calculate_tdee():
    bmr = 1750
    tdee = calculate_tdee(bmr, 'moderate')
    assert tdee == bmr * 1.55


def test_calculate_macros_maintenance():
    macros = calculate_macros(2500, 'maintenance')
    assert macros['calories'] == 2500
    assert macros['protein'] > 0
    assert macros['carbs'] > 0
    assert macros['fat'] > 0


def test_calculate_macros_fat_loss():
    macros = calculate_macros(2500, 'fat_loss')
    assert macros['calories'] == 2000


def test_calculate_macros_muscle_gain():
    macros = calculate_macros(2500, 'muscle_gain')
    assert macros['calories'] == 2800


def test_calculate_macros_minimum_floor():
    macros = calculate_macros(1000, 'fat_loss')
    assert macros['calories'] >= 1200
