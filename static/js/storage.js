window.FitCoach = window.FitCoach || {};

window.FitCoach.Storage = (function() {
    'use strict';

    var KEYS = {
        PROFILE: 'fitcoach_profile',
        MEALS: 'fitcoach_meals',
        WORKOUTS: 'fitcoach_workouts',
        WORKOUT_PLANS: 'fitcoach_workout_plans',
        WATER: 'fitcoach_water',
        WEIGHT_HISTORY: 'fitcoach_weight_history',
        PREFERENCES: 'fitcoach_preferences',
        THEME: 'fitcoach_theme'
    };

    // ---- Safe JSON helpers ----
    function safeGet(key, defaultValue) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return defaultValue;
            var parsed = JSON.parse(raw);
            // Validate it's the expected type
            if (defaultValue !== null && defaultValue !== undefined) {
                if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
                if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && (typeof parsed !== 'object' || Array.isArray(parsed))) return defaultValue;
            }
            return parsed;
        } catch (e) {
            console.warn('FitCoach: Failed to parse localStorage key "' + key + '":', e);
            return defaultValue;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('FitCoach: Failed to write localStorage key "' + key + '":', e);
            window.FitCoach.Utils.showToast('Failed to save data. Storage may be full.', 'error');
            return false;
        }
    }

    // ---- Profile ----
    function getProfile() {
        return safeGet(KEYS.PROFILE, null);
    }

    function saveProfile(profile) {
        return safeSet(KEYS.PROFILE, profile);
    }

    function hasProfile() {
        return getProfile() !== null;
    }

    // ---- Default Targets (used when no profile exists) ----
    function getTargets() {
        var profile = getProfile();
        if (profile && profile.targets) {
            return profile.targets;
        }
        return {
            calories: 2000,
            protein: 150,
            carbs: 250,
            fat: 65,
            water: 8
        };
    }

    // ---- Meals ----
    // Stored as { 'YYYY-MM-DD': [ { id, name, meal, calories, protein, carbs, fat, servings, time } ] }
    function getMealsForDate(dateKey) {
        var all = safeGet(KEYS.MEALS, {});
        return Array.isArray(all[dateKey]) ? all[dateKey] : [];
    }

    function saveMeal(dateKey, mealEntry) {
        var all = safeGet(KEYS.MEALS, {});
        if (!Array.isArray(all[dateKey])) all[dateKey] = [];
        mealEntry.id = mealEntry.id || window.FitCoach.Utils.generateId();
        mealEntry.time = mealEntry.time || new Date().toISOString();
        all[dateKey].push(mealEntry);
        return safeSet(KEYS.MEALS, all);
    }

    function updateMeal(dateKey, mealId, updatedEntry) {
        var all = safeGet(KEYS.MEALS, {});
        if (!Array.isArray(all[dateKey])) return false;
        var index = all[dateKey].findIndex(function(m) { return m.id === mealId; });
        if (index === -1) return false;
        all[dateKey][index] = Object.assign({}, all[dateKey][index], updatedEntry);
        return safeSet(KEYS.MEALS, all);
    }

    function deleteMeal(dateKey, mealId) {
        var all = safeGet(KEYS.MEALS, {});
        if (!Array.isArray(all[dateKey])) return false;
        all[dateKey] = all[dateKey].filter(function(m) { return m.id !== mealId; });
        return safeSet(KEYS.MEALS, all);
    }

    function getAllMeals() {
        return safeGet(KEYS.MEALS, {});
    }

    // ---- Daily Nutrition Totals ----
    function getDailyNutrition(dateKey) {
        var meals = getMealsForDate(dateKey);
        var totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        meals.forEach(function(meal) {
            var servings = meal.servings || 1;
            totals.calories += (meal.calories || 0) * servings;
            totals.protein += (meal.protein || 0) * servings;
            totals.carbs += (meal.carbs || 0) * servings;
            totals.fat += (meal.fat || 0) * servings;
        });
        // Round all values
        totals.calories = Math.round(totals.calories);
        totals.protein = Math.round(totals.protein);
        totals.carbs = Math.round(totals.carbs);
        totals.fat = Math.round(totals.fat);
        return totals;
    }

    // ---- Workouts ----
    // Stored as { 'YYYY-MM-DD': { id, name, exercises: [...], completed, caloriesBurned, duration, completedAt } }
    function getWorkoutForDate(dateKey) {
        var all = safeGet(KEYS.WORKOUTS, {});
        return all[dateKey] || null;
    }

    function saveWorkout(dateKey, workout) {
        var all = safeGet(KEYS.WORKOUTS, {});
        workout.id = workout.id || window.FitCoach.Utils.generateId();
        all[dateKey] = workout;
        return safeSet(KEYS.WORKOUTS, all);
    }

    function getAllWorkouts() {
        return safeGet(KEYS.WORKOUTS, {});
    }

    // ---- Workout Plans ----
    function getWorkoutPlans() {
        return safeGet(KEYS.WORKOUT_PLANS, []);
    }

    function saveWorkoutPlans(plans) {
        return safeSet(KEYS.WORKOUT_PLANS, plans);
    }

    // ---- Water ----
    // Stored as { 'YYYY-MM-DD': number }
    function getWaterForDate(dateKey) {
        var all = safeGet(KEYS.WATER, {});
        return typeof all[dateKey] === 'number' ? all[dateKey] : 0;
    }

    function addWater(dateKey, glasses) {
        var all = safeGet(KEYS.WATER, {});
        all[dateKey] = (typeof all[dateKey] === 'number' ? all[dateKey] : 0) + (glasses || 1);
        return safeSet(KEYS.WATER, all);
    }

    function setWater(dateKey, glasses) {
        var all = safeGet(KEYS.WATER, {});
        all[dateKey] = glasses;
        return safeSet(KEYS.WATER, all);
    }

    function getAllWater() {
        return safeGet(KEYS.WATER, {});
    }

    // ---- Weight History ----
    // Stored as [ { date: 'YYYY-MM-DD', weight: number, unit: 'kg'|'lbs' } ]
    function getWeightHistory() {
        return safeGet(KEYS.WEIGHT_HISTORY, []);
    }

    function addWeightEntry(dateKey, weight, unit) {
        var history = getWeightHistory();
        // Remove existing entry for same date
        history = history.filter(function(e) { return e.date !== dateKey; });
        history.push({ date: dateKey, weight: weight, unit: unit || 'kg' });
        // Sort by date
        history.sort(function(a, b) { return a.date.localeCompare(b.date); });
        return safeSet(KEYS.WEIGHT_HISTORY, history);
    }

    function getLatestWeight() {
        var history = getWeightHistory();
        return history.length > 0 ? history[history.length - 1] : null;
    }

    // ---- Preferences ----
    function getPreferences() {
        return safeGet(KEYS.PREFERENCES, {
            units: 'metric',
            theme: 'dark'
        });
    }

    function savePreferences(prefs) {
        return safeSet(KEYS.PREFERENCES, prefs);
    }

    // ---- Theme ----
    function getTheme() {
        return safeGet(KEYS.THEME, 'dark');
    }

    function setTheme(theme) {
        return safeSet(KEYS.THEME, theme);
    }

    // ---- Calories Burned Today ----
    function getCaloriesBurnedForDate(dateKey) {
        var workout = getWorkoutForDate(dateKey);
        if (workout && workout.completed && workout.caloriesBurned) {
            return workout.caloriesBurned;
        }
        return 0;
    }

    // ---- Data Export / Import ----
    function exportAllData() {
        var data = {};
        Object.keys(KEYS).forEach(function(k) {
            data[KEYS[k]] = safeGet(KEYS[k], null);
        });
        return data;
    }

    function importAllData(data) {
        try {
            Object.keys(KEYS).forEach(function(k) {
                var key = KEYS[k];
                if (data.hasOwnProperty(key) && data[key] !== null) {
                    safeSet(key, data[key]);
                }
            });
            return true;
        } catch (e) {
            console.error('FitCoach: Import failed:', e);
            return false;
        }
    }

    function clearAllData() {
        Object.keys(KEYS).forEach(function(k) {
            localStorage.removeItem(KEYS[k]);
        });
    }

    return {
        // Profile
        getProfile: getProfile,
        saveProfile: saveProfile,
        hasProfile: hasProfile,
        getTargets: getTargets,
        // Meals
        getMealsForDate: getMealsForDate,
        saveMeal: saveMeal,
        updateMeal: updateMeal,
        deleteMeal: deleteMeal,
        getAllMeals: getAllMeals,
        getDailyNutrition: getDailyNutrition,
        // Workouts
        getWorkoutForDate: getWorkoutForDate,
        saveWorkout: saveWorkout,
        getAllWorkouts: getAllWorkouts,
        getWorkoutPlans: getWorkoutPlans,
        saveWorkoutPlans: saveWorkoutPlans,
        // Water
        getWaterForDate: getWaterForDate,
        addWater: addWater,
        setWater: setWater,
        getAllWater: getAllWater,
        // Weight
        getWeightHistory: getWeightHistory,
        addWeightEntry: addWeightEntry,
        getLatestWeight: getLatestWeight,
        // Preferences
        getPreferences: getPreferences,
        savePreferences: savePreferences,
        // Theme
        getTheme: getTheme,
        setTheme: setTheme,
        // Calories burned
        getCaloriesBurnedForDate: getCaloriesBurnedForDate,
        // Data management
        exportAllData: exportAllData,
        importAllData: importAllData,
        clearAllData: clearAllData
    };
})();
