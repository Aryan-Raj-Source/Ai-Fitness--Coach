window.FitCoach = window.FitCoach || {};

window.FitCoach.Dashboard = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;
    var Charts = window.FitCoach.Charts;

    function init() {
        bindEvents();
        refresh();
    }

    function bindEvents() {
        // Quick action buttons
        var qaLogFood = document.getElementById('qaLogFood');
        var qaStartWorkout = document.getElementById('qaStartWorkout');
        var qaAddWater = document.getElementById('qaAddWater');
        var qaUpdateWeight = document.getElementById('qaUpdateWeight');
        var addWaterBtn = document.getElementById('addWaterBtn');

        if (qaLogFood) qaLogFood.addEventListener('click', function() {
            window.FitCoach.App.navigateTo('nutrition');
        });
        if (qaStartWorkout) qaStartWorkout.addEventListener('click', function() {
            window.FitCoach.App.navigateTo('workouts');
        });
        if (qaAddWater) qaAddWater.addEventListener('click', function() {
            addWaterGlass();
        });
        if (qaUpdateWeight) qaUpdateWeight.addEventListener('click', function() {
            openWeightModal();
        });
        if (addWaterBtn) addWaterBtn.addEventListener('click', function() {
            addWaterGlass();
        });

        // Weight modal
        var weightModalClose = document.getElementById('weightModalClose');
        var weightModalCancel = document.getElementById('weightModalCancel');
        var weightModalSave = document.getElementById('weightModalSave');
        var weightModal = document.getElementById('weightModal');

        if (weightModalClose) weightModalClose.addEventListener('click', closeWeightModal);
        if (weightModalCancel) weightModalCancel.addEventListener('click', closeWeightModal);
        if (weightModalSave) weightModalSave.addEventListener('click', saveWeight);
        if (weightModal) weightModal.addEventListener('click', function(e) {
            if (e.target === weightModal) closeWeightModal();
        });
    }

    function refresh() {
        var today = Utils.getTodayKey();
        var targets = Storage.getTargets();
        var nutrition = Storage.getDailyNutrition(today);
        var water = Storage.getWaterForDate(today);
        var workout = Storage.getWorkoutForDate(today);
        var caloriesBurned = Storage.getCaloriesBurnedForDate(today);

        // Setup banner visibility
        var setupBanner = document.getElementById('setupBanner');
        if (setupBanner) {
            setupBanner.style.display = Storage.hasProfile() ? 'none' : '';
        }

        // Calories
        Utils.setText('calConsumed', Utils.formatNumber(nutrition.calories));
        Utils.setText('calTarget', Utils.formatNumber(targets.calories));
        var remaining = targets.calories - nutrition.calories;
        Utils.setText('calRemaining', Utils.formatNumber(Math.abs(remaining)) + ' kcal ' + (remaining >= 0 ? 'remaining' : 'over'));
        Charts.drawCalorieRing('calorieRing', nutrition.calories, targets.calories);

        // Macros
        updateMacroBar('protein', nutrition.protein, targets.protein);
        updateMacroBar('carbs', nutrition.carbs, targets.carbs);
        updateMacroBar('fat', nutrition.fat, targets.fat);

        // Calories burned
        Utils.setText('caloriesBurned', Utils.formatNumber(caloriesBurned));

        // Workout status
        if (workout) {
            if (workout.completed) {
                Utils.setText('workoutStatus', '✅');
                Utils.setText('workoutLabel', workout.name || 'Completed');
            } else {
                Utils.setText('workoutStatus', '📋');
                Utils.setText('workoutLabel', workout.name || 'In progress');
            }
        } else {
            Utils.setText('workoutStatus', '—');
            Utils.setText('workoutLabel', 'No workout today');
        }

        // Water
        Utils.setText('waterIntake', water);
        Utils.setText('waterTarget', targets.water);
        renderWaterDrops(water, targets.water);

        // Meals summary
        renderMealsSummary(today);

        // Workout summary
        renderWorkoutSummary(workout);

        // Weekly charts
        renderWeeklyCharts();
    }

    function updateMacroBar(macro, current, target) {
        var pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        var barId = macro === 'carbs' ? 'carbsBar' : macro + 'Bar';
        var valueId = macro === 'carbs' ? 'carbsValue' : macro + 'Value';

        var bar = document.getElementById(barId);
        var valueEl = document.getElementById(valueId);

        if (bar) {
            bar.style.width = pct + '%';
            bar.setAttribute('aria-valuenow', Math.round(pct));
        }
        if (valueEl) {
            valueEl.textContent = Math.round(current) + ' / ' + target + 'g';
        }
    }

    function renderWaterDrops(current, target) {
        var container = document.getElementById('waterDrops');
        if (!container) return;
        var html = '';
        for (var i = 0; i < target; i++) {
            html += '<span class="water-drop ' + (i < current ? 'filled' : '') + '" aria-hidden="true">💧</span>';
        }
        container.innerHTML = html;
    }

    function renderMealsSummary(dateKey) {
        var container = document.getElementById('mealsSummary');
        if (!container) return;

        var meals = Storage.getMealsForDate(dateKey);
        if (meals.length === 0) {
            container.innerHTML = '<div class="empty-state">' +
                '<span class="empty-icon">🍽️</span>' +
                '<p>No meals logged today</p>' +
                '<a href="#nutrition" class="btn btn-sm btn-accent">Log a meal</a>' +
                '</div>';
            return;
        }

        var html = '';
        var mealGroups = { breakfast: [], lunch: [], dinner: [], snack: [] };
        meals.forEach(function(m) {
            var cat = m.meal || 'snack';
            if (!mealGroups[cat]) mealGroups[cat] = [];
            mealGroups[cat].push(m);
        });

        var mealLabels = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍪 Snack' };
        Object.keys(mealGroups).forEach(function(cat) {
            if (mealGroups[cat].length === 0) return;
            var totalCal = mealGroups[cat].reduce(function(sum, m) {
                return sum + (m.calories || 0) * (m.servings || 1);
            }, 0);
            html += '<div class="summary-item">' +
                '<span class="summary-item-label">' + mealLabels[cat] + '</span>' +
                '<span class="summary-item-value">' + Math.round(totalCal) + ' kcal</span>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function renderWorkoutSummary(workout) {
        var container = document.getElementById('workoutSummary');
        if (!container) return;

        if (!workout) {
            container.innerHTML = '<div class="empty-state">' +
                '<span class="empty-icon">🏋️</span>' +
                '<p>No workout scheduled</p>' +
                '<a href="#workouts" class="btn btn-sm btn-accent">Plan a workout</a>' +
                '</div>';
            return;
        }

        var html = '<div class="summary-item">' +
            '<span class="summary-item-label">' + Utils.escapeHtml(workout.name || 'Workout') + '</span>' +
            '<span class="summary-item-value">' + (workout.completed ? '✅ Done' : '📋 Planned') + '</span>' +
            '</div>';

        if (workout.exercises && workout.exercises.length > 0) {
            html += '<p class="text-muted" style="margin-top:8px">' + workout.exercises.length + ' exercises';
            if (workout.caloriesBurned) {
                html += ' · ' + workout.caloriesBurned + ' kcal burned';
            }
            html += '</p>';
        }

        container.innerHTML = html;
    }

    function renderWeeklyCharts() {
        var weekDates = Utils.getWeekDates();
        var labels = weekDates.map(function(d) { return Utils.getDayLabel(d); });

        // Weekly activity data
        var burnedData = weekDates.map(function(d) { return Storage.getCaloriesBurnedForDate(d); });

        // Weekly nutrition data
        var calData = [], protData = [], carbData = [], fatData = [];
        weekDates.forEach(function(d) {
            var n = Storage.getDailyNutrition(d);
            calData.push(n.calories);
            protData.push(n.protein);
            carbData.push(n.carbs);
            fatData.push(n.fat);
        });

        Charts.drawWeeklyActivity('weeklyActivityChart', labels, burnedData);
        Charts.drawWeeklyNutrition('weeklyNutritionChart', labels, calData, protData, carbData, fatData);
    }

    // ---- Water ----
    function addWaterGlass() {
        var today = Utils.getTodayKey();
        Storage.addWater(today, 1);
        Utils.showToast('Water logged! 💧', 'success');
        refresh();
    }

    // ---- Weight Modal ----
    function openWeightModal() {
        var modal = document.getElementById('weightModal');
        var input = document.getElementById('weightInput');
        var unitEl = document.getElementById('weightUnit');
        var prefs = Storage.getPreferences();
        var latest = Storage.getLatestWeight();

        if (unitEl) unitEl.textContent = prefs.units === 'imperial' ? 'lbs' : 'kg';
        if (input) {
            input.value = latest ? latest.weight : '';
            input.focus();
        }
        if (modal) modal.classList.add('active');
    }

    function closeWeightModal() {
        var modal = document.getElementById('weightModal');
        if (modal) modal.classList.remove('active');
    }

    function saveWeight() {
        var input = document.getElementById('weightInput');
        if (!input) return;

        var weight = parseFloat(input.value);
        if (isNaN(weight) || weight <= 0 || weight > 500) {
            Utils.showToast('Please enter a valid weight.', 'error');
            return;
        }

        var prefs = Storage.getPreferences();
        var unit = prefs.units === 'imperial' ? 'lbs' : 'kg';
        Storage.addWeightEntry(Utils.getTodayKey(), weight, unit);
        Utils.showToast('Weight updated! ⚖️', 'success');
        closeWeightModal();
        refresh();
    }

    return {
        init: init,
        refresh: refresh
    };
})();
