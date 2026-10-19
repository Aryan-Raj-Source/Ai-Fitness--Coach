"""Workout plan generation service.

Provides rule-based workout generation based on user fitness level,
split preferences, available equipment, and fitness objectives.
"""

# Exercise database categorized by equipment and muscle group
EXERCISE_DATABASE = {
    'full_gym': {
        'Chest': [
            {'name': 'Barbell Bench Press', 'reps': '8-10', 'tips': 'Keep shoulders pinned back and drive with chest.'},
            {'name': 'Incline Dumbbell Press', 'reps': '10-12', 'tips': 'Set bench at 30 degrees to target upper chest.'},
            {'name': 'Cable Chest Flyes', 'reps': '12-15', 'tips': 'Squeeze chest at peak contraction and control the eccentric.'},
            {'name': 'Dips (Chest Focus)', 'reps': '8-12', 'tips': 'Lean slightly forward to bias lower pecs.'}
        ],
        'Back': [
            {'name': 'Barbell Bent-Over Row', 'reps': '8-10', 'tips': 'Hinge at hips, pull towards lower ribcage.'},
            {'name': 'Lat Pulldown', 'reps': '10-12', 'tips': 'Drive elbows down to engage lats.'},
            {'name': 'Seated Cable Row', 'reps': '10-12', 'tips': 'Retract shoulder blades and pause for 1 second.'},
            {'name': 'Barbell Deadlift', 'reps': '5-8', 'tips': 'Maintain neutral spine, push the floor away.'}
        ],
        'Legs': [
            {'name': 'Barbell Back Squat', 'reps': '8-10', 'tips': 'Break at hips and knees simultaneously; hit parallel depth.'},
            {'name': 'Leg Press', 'reps': '10-12', 'tips': 'Place feet shoulder-width, avoid locking knees at lockout.'},
            {'name': 'Romanian Deadlift', 'reps': '10-12', 'tips': 'Hinge hips back feeling deep stretch in hamstrings.'},
            {'name': 'Standing Calf Raises', 'reps': '15-20', 'tips': 'Full stretch at bottom, squeeze hard at the peak.'},
            {'name': 'Leg Extensions', 'reps': '12-15', 'tips': 'Pause at the top for quad peak contraction.'}
        ],
        'Shoulders': [
            {'name': 'Overhead Barbell Press', 'reps': '8-10', 'tips': 'Brace core and press straight overhead.'},
            {'name': 'Dumbbell Lateral Raise', 'reps': '12-15', 'tips': 'Lead with elbows, keep slight forward tilt.'},
            {'name': 'Face Pulls', 'reps': '15-20', 'tips': 'Pull rope towards eyes, external rotate wrists.'}
        ],
        'Arms': [
            {'name': 'Barbell Bicep Curl', 'reps': '10-12', 'tips': 'Keep elbows pinned to your sides throughout.'},
            {'name': 'Triceps Rope Pushdown', 'reps': '12-15', 'tips': 'Spread the rope at full lockout for triceps squeeze.'},
            {'name': 'Hammer Curls', 'reps': '10-12', 'tips': 'Targets brachialis and forearm flexors.'}
        ],
        'Core': [
            {'name': 'Hanging Knee Raises', 'reps': '12-15', 'tips': 'Tuck pelvis up to engage lower abdominals.'},
            {'name': 'Cable Woodchoppers', 'reps': '12-15/side', 'tips': 'Rotate through torso, brace abdominal wall.'},
            {'name': 'Plank', 'reps': '45-60s', 'tips': 'Keep hips level, squeeze glutes and core.'}
        ]
    },
    'dumbbells': {
        'Chest': [
            {'name': 'Dumbbell Flat Press', 'reps': '8-12', 'tips': 'Control the descent, press up and converge slightly.'},
            {'name': 'Dumbbell Floor Press', 'reps': '10-12', 'tips': 'Pausing on floor reduces shoulder strain.'},
            {'name': 'Dumbbell Push-ups', 'reps': '10-15', 'tips': 'Extra range of motion using dumbbell handles.'}
        ],
        'Back': [
            {'name': 'Single-Arm Dumbbell Row', 'reps': '10-12/side', 'tips': 'Pull dumbbell towards hip, avoid twisting torso.'},
            {'name': 'Dumbbell Romanian Deadlift', 'reps': '10-12', 'tips': 'Hinge hips back, keep weights close to shins.'},
            {'name': 'Dumbbell Pullover', 'reps': '12-15', 'tips': 'Reach back over bench feeling lat expansion.'}
        ],
        'Legs': [
            {'name': 'Dumbbell Goblet Squat', 'reps': '10-12', 'tips': 'Hold weight against chest, elbows inside knees.'},
            {'name': 'Bulgarian Split Squat', 'reps': '8-10/leg', 'tips': 'Rear foot elevated, sink down into front heel.'},
            {'name': 'Dumbbell Walking Lunges', 'reps': '10-12/leg', 'tips': 'Take long strides, maintain upright posture.'},
            {'name': 'Single-Leg Dumbbell Calf Raise', 'reps': '15-20', 'tips': 'Hold onto wall for balance.'}
        ],
        'Shoulders': [
            {'name': 'Seated Dumbbell Shoulder Press', 'reps': '8-10', 'tips': 'Press overhead without excessive arching.'},
            {'name': 'Dumbbell Lateral Raise', 'reps': '12-15', 'tips': 'Maintain soft bend in elbows, control eccentric.'},
            {'name': 'Bent-Over Rear Delt Fly', 'reps': '12-15', 'tips': 'Squeeze posterior deltoids at peak.'}
        ],
        'Arms': [
            {'name': 'Dumbbell Bicep Curl', 'reps': '10-12', 'tips': 'Supinate wrists as you curl upward.'},
            {'name': 'Dumbbell Overhead Triceps Extension', 'reps': '10-12', 'tips': 'Keep elbows pointing forward.'},
            {'name': 'Hammer Curls', 'reps': '10-12', 'tips': 'Neutral palms build arm thickness.'}
        ],
        'Core': [
            {'name': 'Dumbbell Russian Twists', 'reps': '15-20', 'tips': 'Elevate feet and rotate shoulders.'},
            {'name': 'Weighted Plank', 'reps': '45-60s', 'tips': 'Place small dumbbell plate on lower back.'}
        ]
    },
    'bodyweight': {
        'Chest': [
            {'name': 'Standard Push-ups', 'reps': '12-18', 'tips': 'Full lock at top, chest one inch off the floor.'},
            {'name': 'Incline / Diamond Push-ups', 'reps': '10-15', 'tips': 'Close hand placement shifts load to triceps & chest.'},
            {'name': 'Wide Grip Push-ups', 'reps': '12-15', 'tips': 'Broad hand placement for pectoral activation.'}
        ],
        'Back': [
            {'name': 'Inverted Rows (or Towel Rows)', 'reps': '10-12', 'tips': 'Pull chest to bar/table edge, squeeze upper back.'},
            {'name': 'Superman Holds', 'reps': '12-15 reps (3s hold)', 'tips': 'Lift chest and thighs off floor simultaneously.'},
            {'name': 'Prone Cobra', 'reps': '15-20', 'tips': 'Retract shoulder blades, rotate thumbs to ceiling.'}
        ],
        'Legs': [
            {'name': 'Bodyweight Squats', 'reps': '15-20', 'tips': 'Full range of motion, drive knees out over toes.'},
            {'name': 'Walking Lunges', 'reps': '12-15/leg', 'tips': 'Keep torso tall, 90 degree bend in both knees.'},
            {'name': 'Single-Leg Glute Bridges', 'reps': '12-15/leg', 'tips': 'Drive through heel, squeeze glute at peak.'},
            {'name': 'Calf Raises on Step', 'reps': '20-25', 'tips': 'Deep stretch below step level.'}
        ],
        'Shoulders': [
            {'name': 'Pike Push-ups', 'reps': '8-12', 'tips': 'Hips high in pike position, lower head between hands.'},
            {'name': 'Decline Push-ups', 'reps': '10-12', 'tips': 'Elevate feet on bench or chair.'}
        ],
        'Arms': [
            {'name': 'Bench / Chair Dips', 'reps': '12-15', 'tips': 'Keep hips close to the chair, lower to 90 degrees.'},
            {'name': 'Close-Grip Push-ups', 'reps': '10-12', 'tips': 'Keep elbows tucked tightly to ribs.'}
        ],
        'Core': [
            {'name': 'Standard Forearm Plank', 'reps': '45-60s', 'tips': 'Keep straight line from head to heels.'},
            {'name': 'Mountain Climbers', 'reps': '30s', 'tips': 'Drive knees rapidly toward chest.'},
            {'name': 'Bicycle Crunches', 'reps': '20 total', 'tips': 'Slow controlled rotation, touch elbow to opposite knee.'}
        ]
    }
}


def _get_exercises_for_equipment(equipment):
    eq = equipment if equipment in EXERCISE_DATABASE else 'full_gym'
    return EXERCISE_DATABASE[eq]


def _build_day_routine(day_num, title, focus, muscle_groups, equipment, sets, reps_override=None, cal_est=320, duration=45):
    """Build a structured day routine from muscle groups and equipment."""
    eq_lib = _get_exercises_for_equipment(equipment)
    selected_exercises = []
    exercise_id_counter = 1

    for group in muscle_groups:
        available = eq_lib.get(group, [])
        # take top 1 or 2 exercises per group
        take_count = 2 if len(muscle_groups) <= 3 else 1
        for ex in available[:take_count]:
            selected_exercises.append({
                'id': f'ex_d{day_num}_{exercise_id_counter}',
                'name': ex['name'],
                'muscle_group': group,
                'sets': sets,
                'reps': reps_override or ex.get('reps', '10-12'),
                'rest_seconds': 60 if sets <= 3 else 90,
                'tips': ex.get('tips', 'Maintain controlled cadence and form.')
            })
            exercise_id_counter += 1

    return {
        'day_number': day_num,
        'day_name': f'Day {day_num}',
        'title': title,
        'focus': focus,
        'duration_minutes': duration,
        'estimated_calories': cal_est,
        'exercises': selected_exercises
    }


def generate_workout_plan(profile):
    """Generate a structured workout plan based on user profile.
    
    Args:
        profile (dict): User profile with keys:
            - workout_days (int): 1 to 7
            - fitness_level (str): 'beginner', 'intermediate', 'advanced'
            - goal (str): 'fat_loss', 'muscle_gain', 'maintenance'
            - equipment (str): 'full_gym', 'dumbbells', 'bodyweight'
    
    Returns:
        dict: Complete structured workout plan or None if invalid.
    """
    if not profile or not isinstance(profile, dict):
        return None

    days = int(profile.get('workout_days', 3))
    days = max(1, min(7, days))

    level = profile.get('fitness_level', 'intermediate').lower()
    if level not in ['beginner', 'intermediate', 'advanced']:
        level = 'intermediate'

    goal = profile.get('goal', 'maintenance').lower()
    if goal not in ['fat_loss', 'muscle_gain', 'maintenance']:
        goal = 'maintenance'

    equipment = profile.get('equipment', 'full_gym').lower()
    if equipment not in ['full_gym', 'dumbbells', 'bodyweight']:
        equipment = 'full_gym'

    # Sets and reps strategy based on level & goal
    sets = 3
    if level == 'beginner':
        sets = 3
    elif level == 'advanced':
        sets = 4

    # Calorie burn scaling
    cal_multiplier = 1.0
    if goal == 'fat_loss':
        cal_multiplier = 1.2
    elif goal == 'muscle_gain':
        cal_multiplier = 0.95

    routine_days = []

    if days == 1:
        split_name = 'Full Body Blast'
        routine_days.append(_build_day_routine(
            1, 'Full Body Foundations', 'Chest, Back, Legs, Shoulders, Core',
            ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'],
            equipment, sets, cal_est=int(380 * cal_multiplier), duration=50
        ))
    elif days == 2:
        split_name = 'Full Body A/B'
        routine_days.append(_build_day_routine(
            1, 'Full Body A (Strength & Push)', 'Legs, Chest, Arms',
            ['Legs', 'Chest', 'Arms', 'Core'],
            equipment, sets, cal_est=int(340 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            2, 'Full Body B (Hypertrophy & Pull)', 'Back, Shoulders, Legs',
            ['Back', 'Legs', 'Shoulders', 'Core'],
            equipment, sets, cal_est=int(350 * cal_multiplier), duration=45
        ))
    elif days == 3:
        split_name = 'Push / Pull / Legs (PPL)'
        routine_days.append(_build_day_routine(
            1, 'Push Day', 'Chest, Shoulders, Triceps',
            ['Chest', 'Shoulders', 'Arms'],
            equipment, sets, cal_est=int(320 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            2, 'Pull Day', 'Back, Rear Delts, Biceps',
            ['Back', 'Arms', 'Core'],
            equipment, sets, cal_est=int(330 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            3, 'Legs & Core Day', 'Quads, Hamstrings, Calves, Abs',
            ['Legs', 'Core'],
            equipment, sets, cal_est=int(360 * cal_multiplier), duration=50
        ))
    elif days == 4:
        split_name = 'Upper / Lower Split'
        routine_days.append(_build_day_routine(
            1, 'Upper Body A', 'Chest & Back Power',
            ['Chest', 'Back', 'Arms'],
            equipment, sets, cal_est=int(320 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            2, 'Lower Body A', 'Quads, Glutes & Abs',
            ['Legs', 'Core'],
            equipment, sets, cal_est=int(350 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            3, 'Upper Body B', 'Shoulders, Back & Arms',
            ['Shoulders', 'Back', 'Arms'],
            equipment, sets, cal_est=int(310 * cal_multiplier), duration=45
        ))
        routine_days.append(_build_day_routine(
            4, 'Lower Body B', 'Hamstrings, Calves & Core',
            ['Legs', 'Core'],
            equipment, sets, cal_est=int(340 * cal_multiplier), duration=45
        ))
    elif days == 5:
        split_name = 'Push / Pull / Legs / Upper / Lower'
        routine_days.append(_build_day_routine(1, 'Push Day', 'Chest, Shoulders, Triceps', ['Chest', 'Shoulders', 'Arms'], equipment, sets, cal_est=int(310 * cal_multiplier)))
        routine_days.append(_build_day_routine(2, 'Pull Day', 'Back, Rear Delts, Biceps', ['Back', 'Arms'], equipment, sets, cal_est=int(320 * cal_multiplier)))
        routine_days.append(_build_day_routine(3, 'Legs Day', 'Quads, Hamstrings, Calves', ['Legs', 'Core'], equipment, sets, cal_est=int(360 * cal_multiplier)))
        routine_days.append(_build_day_routine(4, 'Upper Body Hypertrophy', 'Chest, Back, Arms', ['Chest', 'Back', 'Arms'], equipment, sets, cal_est=int(330 * cal_multiplier)))
        routine_days.append(_build_day_routine(5, 'Lower Body & Core', 'Legs, Abs, Conditioning', ['Legs', 'Core'], equipment, sets, cal_est=int(340 * cal_multiplier)))
    elif days == 6:
        split_name = 'Push / Pull / Legs (6-Day Split)'
        routine_days.append(_build_day_routine(1, 'Push A (Heavy)', 'Chest, Shoulders, Triceps', ['Chest', 'Shoulders', 'Arms'], equipment, sets, cal_est=int(320 * cal_multiplier)))
        routine_days.append(_build_day_routine(2, 'Pull A (Heavy)', 'Back, Rear Delts, Biceps', ['Back', 'Arms'], equipment, sets, cal_est=int(320 * cal_multiplier)))
        routine_days.append(_build_day_routine(3, 'Legs A (Quad Focus)', 'Quads, Calves, Abs', ['Legs', 'Core'], equipment, sets, cal_est=int(350 * cal_multiplier)))
        routine_days.append(_build_day_routine(4, 'Push B (Hypertrophy)', 'Incline Chest, Lateral Delts', ['Chest', 'Shoulders', 'Arms'], equipment, sets, cal_est=int(300 * cal_multiplier)))
        routine_days.append(_build_day_routine(5, 'Pull B (Hypertrophy)', 'Upper Back, Lats, Biceps', ['Back', 'Arms'], equipment, sets, cal_est=int(310 * cal_multiplier)))
        routine_days.append(_build_day_routine(6, 'Legs B (Hamstring Focus)', 'Hamstrings, Glutes, Abs', ['Legs', 'Core'], equipment, sets, cal_est=int(340 * cal_multiplier)))
    else:  # 7 days
        split_name = 'Daily Athlete Split'
        routine_days.append(_build_day_routine(1, 'Chest & Triceps', 'Chest, Triceps', ['Chest', 'Arms'], equipment, sets, cal_est=int(310 * cal_multiplier)))
        routine_days.append(_build_day_routine(2, 'Back & Biceps', 'Back, Biceps', ['Back', 'Arms'], equipment, sets, cal_est=int(310 * cal_multiplier)))
        routine_days.append(_build_day_routine(3, 'Legs & Calves', 'Quads, Calves', ['Legs'], equipment, sets, cal_est=int(350 * cal_multiplier)))
        routine_days.append(_build_day_routine(4, 'Shoulders & Abs', 'Shoulders, Core', ['Shoulders', 'Core'], equipment, sets, cal_est=int(300 * cal_multiplier)))
        routine_days.append(_build_day_routine(5, 'Posterior Chain', 'Hamstrings, Lower Back, Glutes', ['Legs', 'Back'], equipment, sets, cal_est=int(330 * cal_multiplier)))
        routine_days.append(_build_day_routine(6, 'Arms & Core Sculpt', 'Biceps, Triceps, Abs', ['Arms', 'Core'], equipment, sets, cal_est=int(280 * cal_multiplier)))
        routine_days.append(_build_day_routine(7, 'Mobility & Active Recovery', 'Core, Flexibility, Light Cardio', ['Core'], equipment, sets=2, cal_est=int(200 * cal_multiplier), duration=30))

    total_cal = sum(d['estimated_calories'] for d in routine_days)

    return {
        'name': f"{days}-Day {goal.replace('_', ' ').title()} Program",
        'split_type': split_name,
        'days_per_week': days,
        'fitness_level': level,
        'equipment': equipment,
        'goal': goal,
        'total_weekly_calories': total_cal,
        'days': routine_days
    }
