"""Macro and calorie calculation service.

Calculates TDEE, BMR, and macro targets based on user profile.
Full implementation in Phase 2.
"""


def calculate_bmr(weight_kg, height_cm, age, gender='male'):
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor equation."""
    if gender == 'male':
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161


def calculate_tdee(bmr, activity_level='moderate'):
    """Calculate Total Daily Energy Expenditure."""
    multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
    }
    return bmr * multipliers.get(activity_level, 1.55)


def calculate_macros(tdee, goal='maintenance'):
    """Calculate macro targets based on TDEE and goal."""
    adjustments = {
        'fat_loss': -500,
        'muscle_gain': 300,
        'maintenance': 0
    }
    target_calories = tdee + adjustments.get(goal, 0)
    target_calories = max(1200, target_calories)  # Safety floor

    # Macro split varies by goal
    if goal == 'fat_loss':
        protein_pct, carb_pct, fat_pct = 0.35, 0.35, 0.30
    elif goal == 'muscle_gain':
        protein_pct, carb_pct, fat_pct = 0.30, 0.45, 0.25
    else:
        protein_pct, carb_pct, fat_pct = 0.30, 0.40, 0.30

    return {
        'calories': round(target_calories),
        'protein': round(target_calories * protein_pct / 4),
        'carbs': round(target_calories * carb_pct / 4),
        'fat': round(target_calories * fat_pct / 9)
    }
