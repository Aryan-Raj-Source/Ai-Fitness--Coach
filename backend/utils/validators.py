"""Input validation utilities."""


def validate_profile_data(data):
    """Validate profile data and return list of error messages."""
    errors = []

    if 'age' in data:
        age = data['age']
        if not isinstance(age, (int, float)) or age < 13 or age > 120:
            errors.append('Age must be between 13 and 120.')

    if 'weight' in data:
        weight = data['weight']
        if not isinstance(weight, (int, float)) or weight <= 0 or weight > 500:
            errors.append('Weight must be a positive number up to 500.')

    if 'height' in data:
        height = data['height']
        if not isinstance(height, (int, float)) or height <= 0 or height > 300:
            errors.append('Height must be a positive number up to 300.')

    if 'goal' in data:
        valid_goals = ['fat_loss', 'muscle_gain', 'maintenance']
        if data['goal'] not in valid_goals:
            errors.append(f'Goal must be one of: {", ".join(valid_goals)}')

    if 'activity_level' in data:
        valid_levels = ['sedentary', 'light', 'moderate', 'active', 'very_active']
        if data['activity_level'] not in valid_levels:
            errors.append(f'Activity level must be one of: {", ".join(valid_levels)}')

    if 'workout_days' in data:
        days = data['workout_days']
        if not isinstance(days, (int, float)) or days < 1 or days > 7:
            errors.append('Workout days must be between 1 and 7.')

    return errors


def validate_food_entry(data):
    """Validate a food log entry."""
    errors = []

    if not data.get('name'):
        errors.append('Food name is required.')

    if 'calories' in data:
        if not isinstance(data['calories'], (int, float)) or data['calories'] < 0:
            errors.append('Calories must be a non-negative number.')

    if 'servings' in data:
        if not isinstance(data['servings'], (int, float)) or data['servings'] <= 0:
            errors.append('Servings must be a positive number.')

    valid_meals = ['breakfast', 'lunch', 'dinner', 'snack']
    if 'meal' in data and data['meal'] not in valid_meals:
        errors.append(f'Meal must be one of: {", ".join(valid_meals)}')

    return errors
