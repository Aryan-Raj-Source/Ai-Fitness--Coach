window.FitCoach = window.FitCoach || {};

window.FitCoach.Progress = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;
    var Charts = window.FitCoach.Charts;

    var currentRange = 7;
    var chartInstances = {};

    function init() {
        bindEvents();
    }

    function bindEvents() {
        // Time range buttons
        var rangeButtons = document.querySelectorAll('#section-progress .segmented-btn[data-range]');
        rangeButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                rangeButtons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentRange = parseInt(btn.getAttribute('data-range'), 10);
                refresh();
            });
        });

        // Weight logging buttons
        var addWeightBtn = document.getElementById('progressAddWeightBtn');
        var addWeightEmptyBtn = document.getElementById('progressAddWeightEmptyBtn');
        if (addWeightBtn) addWeightBtn.addEventListener('click', openWeightModal);
        if (addWeightEmptyBtn) addWeightEmptyBtn.addEventListener('click', openWeightModal);

        // Data management
        var exportBtn = document.getElementById('progressExportBtn');
        var importInput = document.getElementById('progressImportInput');
        var clearBtn = document.getElementById('progressClearBtn');

        if (exportBtn) exportBtn.addEventListener('click', exportData);
        if (importInput) importInput.addEventListener('change', importData);
        if (clearBtn) clearBtn.addEventListener('click', clearData);
    }

    function openWeightModal() {
        // Reuse the dashboard weight modal
        var modal = document.getElementById('weightModal');
        var input = document.getElementById('weightInput');
        var unitEl = document.getElementById('weightUnit');
        var prefs = Storage.getPreferences();
        var latest = Storage.getLatestWeight();

        if (unitEl) unitEl.textContent = prefs.units === 'imperial' ? 'lbs' : 'kg';
        if (input) {
            input.value = latest ? latest.weight : '';
        }
        if (modal) modal.classList.add('active');
        if (input) input.focus();
    }

    // ---- Date range helpers ----
    function getDateRange(days) {
        var dates = [];
        var now = new Date();
        for (var i = days - 1; i >= 0; i--) {
            var d = new Date(now);
            d.setDate(now.getDate() - i);
            dates.push(Utils.formatDateKey(d));
        }
        return dates;
    }

    function getLabel(dateKey, range) {
        if (range <= 14) {
            return Utils.getDayLabel(dateKey) + ' ' + Utils.formatDate(dateKey);
        }
        return Utils.formatDate(dateKey);
    }

    // ---- Summary Stats ----
    function computeStats(dates) {
        var stats = {
            currentWeight: null,
            weightDelta: null,
            weightUnit: 'kg',
            streak: 0,
            avgCalories: 0,
            calorieDelta: null,
            workoutsCompleted: 0,
            totalBurned: 0
        };

        // Weight
        var weightHistory = Storage.getWeightHistory();
        if (weightHistory.length > 0) {
            var latest = weightHistory[weightHistory.length - 1];
            stats.currentWeight = latest.weight;
            stats.weightUnit = latest.unit || 'kg';

            // Find earliest weight in range
            var startDate = dates[0];
            var inRangeWeights = weightHistory.filter(function(e) {
                return e.date >= startDate;
            });
            if (inRangeWeights.length >= 2) {
                stats.weightDelta = inRangeWeights[inRangeWeights.length - 1].weight - inRangeWeights[0].weight;
            }
        }

        // Streak — count consecutive days (from today backwards) with logged meals or workouts
        var today = Utils.getTodayKey();
        var streak = 0;
        var checkDate = new Date();
        for (var i = 0; i < 365; i++) {
            var key = Utils.formatDateKey(checkDate);
            var meals = Storage.getMealsForDate(key);
            var workout = Storage.getWorkoutForDate(key);
            if (meals.length > 0 || (workout && workout.completed)) {
                streak++;
            } else if (i > 0) {
                break; // Allow today to be empty (still building)
            } else {
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }
        stats.streak = streak;

        // Avg calories & macro totals
        var totalCal = 0;
        var daysWithData = 0;
        var totalProtein = 0, totalCarbs = 0, totalFat = 0;
        var workoutsCompleted = 0;
        var totalBurned = 0;

        dates.forEach(function(d) {
            var nutrition = Storage.getDailyNutrition(d);
            if (nutrition.calories > 0) {
                totalCal += nutrition.calories;
                totalProtein += nutrition.protein;
                totalCarbs += nutrition.carbs;
                totalFat += nutrition.fat;
                daysWithData++;
            }

            var workout = Storage.getWorkoutForDate(d);
            if (workout && workout.completed) {
                workoutsCompleted++;
                totalBurned += workout.caloriesBurned || 0;
            }
        });

        stats.avgCalories = daysWithData > 0 ? Math.round(totalCal / daysWithData) : 0;
        stats.workoutsCompleted = workoutsCompleted;
        stats.totalBurned = totalBurned;

        // Calorie delta vs target
        var targets = Storage.getTargets();
        if (daysWithData > 0 && targets.calories) {
            stats.calorieDelta = stats.avgCalories - targets.calories;
        }

        stats.avgProtein = daysWithData > 0 ? Math.round(totalProtein / daysWithData) : 0;
        stats.avgCarbs = daysWithData > 0 ? Math.round(totalCarbs / daysWithData) : 0;
        stats.avgFat = daysWithData > 0 ? Math.round(totalFat / daysWithData) : 0;

        return stats;
    }

    function renderSummary(stats) {
        // Weight
        if (stats.currentWeight !== null) {
            Utils.setText('progressCurrentWeight', stats.currentWeight + ' ' + stats.weightUnit);
        } else {
            Utils.setText('progressCurrentWeight', '—');
        }

        if (stats.weightDelta !== null) {
            var sign = stats.weightDelta > 0 ? '+' : '';
            var cls = stats.weightDelta > 0 ? 'delta-up' : stats.weightDelta < 0 ? 'delta-down' : '';
            var el = document.getElementById('progressWeightDelta');
            if (el) {
                el.textContent = sign + stats.weightDelta.toFixed(1) + ' ' + stats.weightUnit;
                el.className = 'progress-stat-delta ' + cls;
            }
        } else {
            var el = document.getElementById('progressWeightDelta');
            if (el) { el.textContent = ''; el.className = 'progress-stat-delta'; }
        }

        // Streak
        Utils.setText('progressStreak', stats.streak);
        Utils.setText('progressStreakDetail', stats.streak === 1 ? 'consecutive day' : 'consecutive days');

        // Avg Calories
        Utils.setText('progressAvgCalories', Utils.formatNumber(stats.avgCalories));
        if (stats.calorieDelta !== null) {
            var cdSign = stats.calorieDelta > 0 ? '+' : '';
            var cdEl = document.getElementById('progressCalorieDelta');
            if (cdEl) {
                cdEl.textContent = cdSign + stats.calorieDelta + ' vs target';
                cdEl.className = 'progress-stat-delta ' + (stats.calorieDelta > 0 ? 'delta-up' : 'delta-down');
            }
        } else {
            var cdEl = document.getElementById('progressCalorieDelta');
            if (cdEl) { cdEl.textContent = ''; cdEl.className = 'progress-stat-delta'; }
        }

        // Workouts
        Utils.setText('progressWorkoutsCompleted', stats.workoutsCompleted);
        var burnedEl = document.getElementById('progressTotalBurned');
        if (burnedEl) {
            burnedEl.textContent = stats.totalBurned > 0 ? Utils.formatNumber(stats.totalBurned) + ' kcal burned' : '';
        }
    }

    // ---- Chart Rendering ----
    function destroyChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    function isChartJsAvailable() {
        return typeof Chart !== 'undefined';
    }

    function renderWeightChart(dates) {
        if (!isChartJsAvailable()) return;
        destroyChart('progressWeightChart');

        var weightHistory = Storage.getWeightHistory();
        var canvas = document.getElementById('progressWeightChart');
        var emptyEl = document.getElementById('progressWeightEmpty');

        if (weightHistory.length === 0) {
            if (canvas) canvas.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
            return;
        } else {
            if (canvas) canvas.style.display = '';
            if (emptyEl) emptyEl.style.display = 'none';
        }

        // Filter weights to range
        var startDate = dates[0];
        var inRange = weightHistory.filter(function(e) { return e.date >= startDate; });
        if (inRange.length === 0) {
            // Show last known weight as a single point
            inRange = [weightHistory[weightHistory.length - 1]];
        }

        var labels = inRange.map(function(e) { return Utils.formatDate(e.date); });
        var data = inRange.map(function(e) { return e.weight; });
        var colors = Charts.getThemeColors();

        chartInstances['progressWeightChart'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (' + (inRange[0].unit || 'kg') + ')',
                    data: data,
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167, 139, 250, 0.1)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#a78bfa',
                    pointBorderColor: colors.cardBg,
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.textSecondary, boxWidth: 12, usePointStyle: true } },
                    tooltip: {
                        backgroundColor: colors.cardBg,
                        titleColor: colors.text,
                        bodyColor: colors.textSecondary,
                        borderColor: colors.grid,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: colors.textSecondary },
                        grid: { color: colors.grid + '40' }
                    }
                }
            }
        });
    }

    function renderCalorieChart(dates) {
        if (!isChartJsAvailable()) return;
        destroyChart('progressCalorieChart');

        var canvas = document.getElementById('progressCalorieChart');
        if (!canvas) return;

        var colors = Charts.getThemeColors();
        var targets = Storage.getTargets();
        var labels = [];
        var calData = [];
        var targetLine = [];

        dates.forEach(function(d) {
            labels.push(getLabel(d, currentRange));
            var nutrition = Storage.getDailyNutrition(d);
            calData.push(nutrition.calories);
            targetLine.push(targets.calories);
        });

        chartInstances['progressCalorieChart'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Calories Consumed',
                        data: calData,
                        backgroundColor: calData.map(function(c, i) {
                            return c > targetLine[i] ? '#f8717199' : colors.accent + 'aa';
                        }),
                        borderRadius: 4,
                        barPercentage: 0.65
                    },
                    {
                        label: 'Target',
                        data: targetLine,
                        type: 'line',
                        borderColor: '#fbbf24',
                        borderDash: [6, 4],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.textSecondary, boxWidth: 12, padding: 12, usePointStyle: true } }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary, maxTicksLimit: currentRange <= 14 ? 14 : 10 },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: colors.textSecondary },
                        grid: { color: colors.grid + '40' }
                    }
                }
            }
        });
    }

    function renderMacroChart(stats) {
        if (!isChartJsAvailable()) return;
        destroyChart('progressMacroChart');

        var canvas = document.getElementById('progressMacroChart');
        if (!canvas) return;

        var colors = Charts.getThemeColors();
        var targets = Storage.getTargets();

        chartInstances['progressMacroChart'] = new Chart(canvas.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [
                    {
                        label: 'Average Intake',
                        data: [stats.avgProtein, stats.avgCarbs, stats.avgFat],
                        backgroundColor: 'rgba(74, 222, 128, 0.15)',
                        borderColor: colors.accent,
                        borderWidth: 2,
                        pointBackgroundColor: colors.accent,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Target',
                        data: [targets.protein, targets.carbs, targets.fat],
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        borderColor: '#fbbf24',
                        borderDash: [4, 4],
                        borderWidth: 2,
                        pointBackgroundColor: '#fbbf24',
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.textSecondary, boxWidth: 12, padding: 12, usePointStyle: true } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { color: colors.textSecondary, backdropColor: 'transparent' },
                        grid: { color: colors.grid + '60' },
                        pointLabels: { color: colors.text, font: { size: 13, weight: '600' } },
                        angleLines: { color: colors.grid + '60' }
                    }
                }
            }
        });
    }

    function renderBurnedChart(dates) {
        if (!isChartJsAvailable()) return;
        destroyChart('progressBurnedChart');

        var canvas = document.getElementById('progressBurnedChart');
        if (!canvas) return;

        var colors = Charts.getThemeColors();
        var labels = [];
        var burnedData = [];

        dates.forEach(function(d) {
            labels.push(getLabel(d, currentRange));
            burnedData.push(Storage.getCaloriesBurnedForDate(d));
        });

        chartInstances['progressBurnedChart'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calories Burned',
                    data: burnedData,
                    backgroundColor: '#f97316aa',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.textSecondary, boxWidth: 12, usePointStyle: true } }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary, maxTicksLimit: currentRange <= 14 ? 14 : 10 },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: colors.textSecondary },
                        grid: { color: colors.grid + '40' }
                    }
                }
            }
        });
    }

    function renderWaterChart(dates) {
        if (!isChartJsAvailable()) return;
        destroyChart('progressWaterChart');

        var canvas = document.getElementById('progressWaterChart');
        if (!canvas) return;

        var colors = Charts.getThemeColors();
        var targets = Storage.getTargets();
        var labels = [];
        var waterData = [];
        var waterTarget = [];

        dates.forEach(function(d) {
            labels.push(getLabel(d, currentRange));
            waterData.push(Storage.getWaterForDate(d));
            waterTarget.push(targets.water);
        });

        chartInstances['progressWaterChart'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Glasses',
                        data: waterData,
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#38bdf8',
                        borderWidth: 2.5
                    },
                    {
                        label: 'Goal',
                        data: waterTarget,
                        borderColor: colors.textSecondary,
                        borderDash: [6, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.textSecondary, boxWidth: 12, padding: 12, usePointStyle: true } }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary, maxTicksLimit: currentRange <= 14 ? 14 : 10 },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: colors.textSecondary, stepSize: 1 },
                        grid: { color: colors.grid + '40' }
                    }
                }
            }
        });
    }

    // ---- Workout History Log ----
    function renderWorkoutLog(dates) {
        var container = document.getElementById('progressWorkoutLog');
        if (!container) return;

        var allWorkouts = Storage.getAllWorkouts();
        // Collect workouts within range, sorted descending
        var entries = [];
        dates.forEach(function(d) {
            if (allWorkouts[d] && allWorkouts[d].completed) {
                entries.push({ date: d, workout: allWorkouts[d] });
            }
        });
        entries.reverse();

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">' +
                '<span class="empty-icon">🏋️</span>' +
                '<p>No workouts completed in this period</p>' +
                '<a href="#workouts" class="btn btn-sm btn-accent">Plan a workout</a>' +
                '</div>';
            return;
        }

        var html = '<div class="progress-workout-entries">';
        entries.forEach(function(entry) {
            var w = entry.workout;
            var exerciseCount = (w.exercises && w.exercises.length) || 0;
            html += '<div class="progress-workout-entry">' +
                '<div class="progress-workout-date">' +
                    '<span class="progress-workout-day">' + Utils.getDayLabel(entry.date) + '</span>' +
                    '<span class="progress-workout-datetext">' + Utils.formatDate(entry.date) + '</span>' +
                '</div>' +
                '<div class="progress-workout-info">' +
                    '<span class="progress-workout-name">' + Utils.escapeHtml(w.name || 'Workout') + '</span>' +
                    '<span class="progress-workout-meta">' +
                        exerciseCount + ' exercise' + (exerciseCount !== 1 ? 's' : '');
            if (w.duration) {
                html += ' · ' + w.duration + ' min';
            }
            if (w.caloriesBurned) {
                html += ' · ' + w.caloriesBurned + ' kcal';
            }
            html += '</span>' +
                '</div>' +
                '<span class="progress-workout-badge">✅</span>' +
                '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ---- Data Management ----
    function exportData() {
        var data = Storage.exportAllData();
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'fitcoach-backup-' + Utils.getTodayKey() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.showToast('Data exported successfully! 📥', 'success');
    }

    function importData(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var data = JSON.parse(ev.target.result);
                var success = Storage.importAllData(data);
                if (success) {
                    Utils.showToast('Data imported successfully! 📤', 'success');
                    refresh();
                    // Refresh dashboard too
                    if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                        window.FitCoach.Dashboard.refresh();
                    }
                } else {
                    Utils.showToast('Import failed. Check file format.', 'error');
                }
            } catch (err) {
                Utils.showToast('Invalid JSON file.', 'error');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be re-imported
        e.target.value = '';
    }

    function clearData() {
        if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
        if (!confirm('Really? This will remove your profile, meals, workouts, and weight history forever.')) return;

        Storage.clearAllData();
        Utils.showToast('All data cleared. 🗑️', 'info');
        refresh();
        // Refresh dashboard
        if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
            window.FitCoach.Dashboard.refresh();
        }
    }

    // ---- Main Refresh ----
    function refresh() {
        var dates = getDateRange(currentRange);
        var stats = computeStats(dates);

        renderSummary(stats);
        renderWeightChart(dates);
        renderCalorieChart(dates);
        renderMacroChart(stats);
        renderBurnedChart(dates);
        renderWaterChart(dates);
        renderWorkoutLog(dates);
    }

    return {
        init: init,
        refresh: refresh
    };
})();
