window.FitCoach = window.FitCoach || {};

window.FitCoach.Workouts = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var currentPlan = null;
    var currentDayIndex = 0;

    function init() {
        bindEvents();
        loadOrGeneratePlan();
        renderTodaySession();
    }

    function bindEvents() {
        var toggleGenBtn = document.getElementById('toggleGeneratorBtn');
        var closeGenBtn = document.getElementById('closeGeneratorBtn');
        var genCard = document.getElementById('generatorCard');
        var generateBtn = document.getElementById('generatePlanBtn');
        var scheduleBtn = document.getElementById('scheduleTodayBtn');

        if (toggleGenBtn && genCard) {
            toggleGenBtn.addEventListener('click', function() {
                var isHidden = genCard.style.display === 'none';
                genCard.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    genCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        if (closeGenBtn && genCard) {
            closeGenBtn.addEventListener('click', function() {
                genCard.style.display = 'none';
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', onGeneratePlanClicked);
        }

        if (scheduleBtn) {
            scheduleBtn.addEventListener('click', scheduleCurrentDayForToday);
        }
    }

    function loadOrGeneratePlan() {
        var savedPlans = Storage.getWorkoutPlans();
        if (savedPlans && savedPlans.length > 0) {
            currentPlan = savedPlans[0];
            renderPlan(currentPlan);
            return;
        }

        // Try generating based on user profile
        var profile = Storage.getProfile() || {};
        var options = {
            workout_days: profile.workout_days || 4,
            fitness_level: 'intermediate',
            equipment: 'full_gym',
            goal: profile.goal || 'muscle_gain'
        };

        fetchPlanFromServer(options);
    }

    function fetchPlanFromServer(options) {
        fetch('/api/workouts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.plan) {
                currentPlan = data.plan;
                Storage.saveWorkoutPlans([currentPlan]);
                renderPlan(currentPlan);
            }
        })
        .catch(function(err) {
            console.error('FitCoach: Error fetching workout plan:', err);
        });
    }

    function onGeneratePlanClicked() {
        var days = parseInt(document.getElementById('workoutSplitDays').value, 10) || 4;
        var equipment = document.getElementById('workoutEquipment').value || 'full_gym';
        var level = document.getElementById('workoutLevel').value || 'intermediate';
        var goal = document.getElementById('workoutGoal').value || 'muscle_gain';

        var generateBtn = document.getElementById('generatePlanBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating Plan...';
        }

        var payload = {
            workout_days: days,
            equipment: equipment,
            fitness_level: level,
            goal: goal
        };

        fetch('/api/workouts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span>🚀</span> Generate & Apply Routine';
            }

            if (data && data.plan) {
                currentPlan = data.plan;
                currentDayIndex = 0;
                Storage.saveWorkoutPlans([currentPlan]);
                renderPlan(currentPlan);

                var genCard = document.getElementById('generatorCard');
                if (genCard) genCard.style.display = 'none';

                Utils.showToast('New ' + currentPlan.split_type + ' plan generated!', 'success');
            } else {
                Utils.showToast(data.error || 'Failed to generate plan.', 'error');
            }
        })
        .catch(function(err) {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span>🚀</span> Generate & Apply Routine';
            }
            console.error('FitCoach: Error generating workout:', err);
            Utils.showToast('Server connection error.', 'error');
        });
    }

    function renderPlan(plan) {
        if (!plan || !plan.days || plan.days.length === 0) return;

        // Update hero banner
        Utils.setText('programTitle', plan.name);
        Utils.setText('programBadge', plan.split_type);
        Utils.setText('chipDays', plan.days_per_week + ' Days/wk');
        Utils.setText('chipGear', plan.equipment === 'full_gym' ? 'Full Gym' : (plan.equipment === 'dumbbells' ? 'Dumbbells' : 'Bodyweight'));
        Utils.setText('chipBurn', '~' + Utils.formatNumber(plan.total_weekly_calories) + ' kcal/wk');

        // Render Day Tabs
        var tabsContainer = document.getElementById('workoutDayTabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';
        plan.days.forEach(function(day, index) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'workout-tab-btn' + (index === currentDayIndex ? ' active' : '');
            btn.textContent = day.day_name + ': ' + day.title.split('(')[0];
            btn.addEventListener('click', function() {
                currentDayIndex = index;
                document.querySelectorAll('.workout-tab-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                renderCurrentDay();
            });
            tabsContainer.appendChild(btn);
        });

        renderCurrentDay();
    }

    function renderCurrentDay() {
        if (!currentPlan || !currentPlan.days || !currentPlan.days[currentDayIndex]) return;

        var day = currentPlan.days[currentDayIndex];
        Utils.setText('currentDayTitle', day.day_name + ' — ' + day.title);
        Utils.setText('currentDayFocus', 'Target Muscle Groups: ' + day.focus);
        Utils.setText('currentDayDuration', day.duration_minutes + ' mins');
        Utils.setText('currentDayCalories', day.estimated_calories + ' kcal');

        var listContainer = document.getElementById('exerciseListContainer');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        day.exercises.forEach(function(ex, idx) {
            var card = document.createElement('div');
            card.className = 'exercise-card';

            var setBubbles = '';
            for (var s = 1; s <= ex.sets; s++) {
                setBubbles += '<div class="set-bubble" title="Set ' + s + ' (' + ex.reps + ' reps)" data-set="' + s + '">' + s + '</div>';
            }

            card.innerHTML =
                '<div class="exercise-header">' +
                    '<div style="display: flex; align-items: center; gap: 8px;">' +
                        '<span style="font-size: 1.1rem; color: var(--accent); font-weight: 700;">' + (idx + 1) + '.</span>' +
                        '<span class="exercise-title">' + Utils.escapeHtml(ex.name) + '</span>' +
                    '</div>' +
                    '<span class="muscle-badge">' + Utils.escapeHtml(ex.muscle_group) + '</span>' +
                '</div>' +
                '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">' +
                    '<div style="font-size: 0.875rem; color: var(--text-secondary);">' +
                        'Target: <strong>' + ex.sets + ' Sets</strong> × <strong>' + ex.reps + ' Reps</strong> &nbsp;|&nbsp; Rest: ' + ex.rest_seconds + 's' +
                    '</div>' +
                    '<div class="sets-tracker">' + setBubbles + '</div>' +
                '</div>' +
                (ex.tips ? '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">💡 Form Tip: ' + Utils.escapeHtml(ex.tips) + '</div>' : '');

            // Interactive set bubbles
            card.querySelectorAll('.set-bubble').forEach(function(bubble) {
                bubble.addEventListener('click', function(e) {
                    e.stopPropagation();
                    this.classList.toggle('done');
                    var allDone = card.querySelectorAll('.set-bubble.done').length === ex.sets;
                    if (allDone) {
                        card.classList.add('completed');
                    } else {
                        card.classList.remove('completed');
                    }
                });
            });

            listContainer.appendChild(card);
        });
    }

    function scheduleCurrentDayForToday() {
        if (!currentPlan || !currentPlan.days || !currentPlan.days[currentDayIndex]) return;

        var day = currentPlan.days[currentDayIndex];
        var today = Utils.getTodayKey();

        var workoutEntry = {
            id: Utils.generateId(),
            name: day.day_name + ': ' + day.title,
            focus: day.focus,
            duration: day.duration_minutes,
            caloriesBurned: day.estimated_calories,
            completed: false,
            scheduledDate: today,
            exercises: day.exercises.map(function(ex) {
                return {
                    name: ex.name,
                    muscle_group: ex.muscle_group,
                    sets: ex.sets,
                    reps: ex.reps,
                    completedSets: 0
                };
            })
        };

        Storage.saveWorkout(today, workoutEntry);
        renderTodaySession();

        if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
            window.FitCoach.Dashboard.refresh();
        }

        Utils.showToast('Scheduled "' + workoutEntry.name + '" for today!', 'success');
    }

    function renderTodaySession() {
        var today = Utils.getTodayKey();
        var workout = Storage.getWorkoutForDate(today);
        var container = document.getElementById('todaySessionContent');
        var badge = document.getElementById('todayStatusBadge');

        if (!container) return;

        if (!workout) {
            if (badge) {
                badge.className = 'badge badge-warning';
                badge.textContent = 'Not Scheduled';
            }
            container.innerHTML =
                '<div class="empty-state" style="padding: 24px;">' +
                    '<span class="empty-icon">🏋️</span>' +
                    '<h4 style="font-size: 1.1rem; margin: 0;">No workout logged for today yet</h4>' +
                    '<p class="text-muted" style="margin: 0; font-size: 0.9rem;">Pick a routine above and click "Schedule for Today" to begin tracking your workout session.</p>' +
                '</div>';
            return;
        }

        if (workout.completed) {
            if (badge) {
                badge.className = 'badge badge-success';
                badge.textContent = '✅ Completed';
            }

            container.innerHTML =
                '<div style="background-color: var(--bg-input); border: 1px solid var(--accent); border-radius: var(--radius-md); padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">' +
                    '<div>' +
                        '<h4 style="font-size: 1.15rem; margin-bottom: 4px; color: var(--accent);">' + Utils.escapeHtml(workout.name) + '</h4>' +
                        '<p class="text-muted" style="margin: 0; font-size: 0.85rem;">' + (workout.focus || 'Completed Workout') + '</p>' +
                    '</div>' +
                    '<div style="display: flex; gap: 16px; align-items: center;">' +
                        '<div class="routine-chip"><span>🔥</span> <span><strong>' + (workout.caloriesBurned || 0) + '</strong> kcal burned</span></div>' +
                        '<div class="routine-chip"><span>⏱️</span> <span><strong>' + (workout.duration || 45) + '</strong> mins</span></div>' +
                        '<button type="button" class="btn btn-sm btn-secondary" id="resetWorkoutBtn">Restart Session</button>' +
                    '</div>' +
                '</div>';

            var resetBtn = document.getElementById('resetWorkoutBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', function() {
                    workout.completed = false;
                    Storage.saveWorkout(today, workout);
                    renderTodaySession();
                    if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                        window.FitCoach.Dashboard.refresh();
                    }
                    Utils.showToast('Workout status reset to in progress.', 'info');
                });
            }
        } else {
            if (badge) {
                badge.className = 'badge badge-warning';
                badge.textContent = '📋 In Progress';
            }

            var exItems = (workout.exercises || []).map(function(ex, i) {
                return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background-color: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">' +
                    '<div><strong>' + (i + 1) + '. ' + Utils.escapeHtml(ex.name) + '</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">(' + ex.muscle_group + ')</span></div>' +
                    '<div style="font-size: 0.85rem; color: var(--text-secondary);">' + ex.sets + ' Sets × ' + ex.reps + '</div>' +
                '</div>';
            }).join('');

            container.innerHTML =
                '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">' +
                    '<div>' +
                        '<h4 style="font-size: 1.1rem; margin-bottom: 2px;">' + Utils.escapeHtml(workout.name) + '</h4>' +
                        '<p class="text-muted" style="margin: 0; font-size: 0.85rem;">' + (workout.focus || '') + '</p>' +
                    '</div>' +
                    '<div style="display: flex; gap: 10px;">' +
                        '<button type="button" class="btn btn-primary" id="finishWorkoutBtn">' +
                            '<span>🏆</span> Complete Workout & Record Burn' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">' +
                    exItems +
                '</div>';

            var finishBtn = document.getElementById('finishWorkoutBtn');
            if (finishBtn) {
                finishBtn.addEventListener('click', function() {
                    workout.completed = true;
                    workout.completedAt = new Date().toISOString();
                    Storage.saveWorkout(today, workout);
                    renderTodaySession();

                    if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                        window.FitCoach.Dashboard.refresh();
                    }

                    Utils.showToast('Congratulations! Workout completed & ' + workout.caloriesBurned + ' kcal recorded on your dashboard.', 'success');
                });
            }
        }
    }

    function refresh() {
        if (!currentPlan) {
            loadOrGeneratePlan();
        } else {
            renderPlan(currentPlan);
        }
        renderTodaySession();
    }

    return {
        init: init,
        refresh: refresh,
        renderPlan: renderPlan
    };
})();
