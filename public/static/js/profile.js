window.FitCoach = window.FitCoach || {};

window.FitCoach.Profile = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var currentUnit = 'metric'; // 'metric' | 'imperial'
    var selectedGoal = 'fat_loss'; // 'fat_loss' | 'maintenance' | 'muscle_gain'

    var ACTIVITY_MULTIPLIERS = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };

    var GOAL_MACROS = {
        fat_loss: { protein: 0.35, carbs: 0.35, fat: 0.30, calDelta: -500, desc: 'Caloric Deficit for Fat Loss' },
        maintenance: { protein: 0.30, carbs: 0.40, fat: 0.30, calDelta: 0, desc: 'Caloric Balance for Maintenance' },
        muscle_gain: { protein: 0.30, carbs: 0.45, fat: 0.25, calDelta: 300, desc: 'Caloric Surplus for Lean Muscle Gain' }
    };

    function init() {
        bindEvents();
        refresh();
    }

    function bindEvents() {
        // Unit toggle
        var btnMetric = document.getElementById('btnMetric');
        var btnImperial = document.getElementById('btnImperial');

        if (btnMetric) {
            btnMetric.addEventListener('click', function() {
                setUnitSystem('metric');
            });
        }
        if (btnImperial) {
            btnImperial.addEventListener('click', function() {
                setUnitSystem('imperial');
            });
        }

        // Live calculation inputs
        var liveInputs = [
            'profileAge',
            'profileGender',
            'profileHeight',
            'profileWeight',
            'profileTargetWeight',
            'profileActivityLevel',
            'profileWorkoutDays',
            'profileWaterTarget'
        ];

        liveInputs.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateCalculationPreview);
                el.addEventListener('change', updateCalculationPreview);
            }
        });

        // Goal selection cards
        var goalCards = document.querySelectorAll('.goal-card-option');
        goalCards.forEach(function(card) {
            card.addEventListener('click', function() {
                var goal = this.getAttribute('data-goal');
                selectGoal(goal);
            });
        });

        // Save & Reset buttons
        var saveBtn = document.getElementById('saveProfileBtn');
        var resetBtn = document.getElementById('resetProfileBtn');

        if (saveBtn) {
            saveBtn.addEventListener('click', saveProfile);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', resetToDefaults);
        }
    }

    function setUnitSystem(unit) {
        if (unit === currentUnit) return;

        var heightEl = document.getElementById('profileHeight');
        var weightEl = document.getElementById('profileWeight');
        var targetWeightEl = document.getElementById('profileTargetWeight');
        var heightUnit = document.getElementById('heightUnitLabel');
        var weightUnit = document.getElementById('weightUnitLabel');
        var targetWeightUnit = document.getElementById('targetWeightUnitLabel');

        var btnMetric = document.getElementById('btnMetric');
        var btnImperial = document.getElementById('btnImperial');

        var heightVal = parseFloat(heightEl ? heightEl.value : 0);
        var weightVal = parseFloat(weightEl ? weightEl.value : 0);
        var targetVal = parseFloat(targetWeightEl ? targetWeightEl.value : 0);

        if (unit === 'imperial') {
            currentUnit = 'imperial';
            if (btnMetric) btnMetric.classList.remove('active');
            if (btnImperial) btnImperial.classList.add('active');

            if (heightUnit) heightUnit.textContent = 'in';
            if (weightUnit) weightUnit.textContent = 'lb';
            if (targetWeightUnit) targetWeightUnit.textContent = 'lb';

            if (heightVal > 0) heightEl.value = (heightVal * 0.393701).toFixed(1);
            if (weightVal > 0) weightEl.value = (weightVal * 2.20462).toFixed(1);
            if (targetVal > 0) targetWeightEl.value = (targetVal * 2.20462).toFixed(1);
        } else {
            currentUnit = 'metric';
            if (btnImperial) btnImperial.classList.remove('active');
            if (btnMetric) btnMetric.classList.add('active');

            if (heightUnit) heightUnit.textContent = 'cm';
            if (weightUnit) weightUnit.textContent = 'kg';
            if (targetWeightUnit) targetWeightUnit.textContent = 'kg';

            if (heightVal > 0) heightEl.value = (heightVal / 0.393701).toFixed(1);
            if (weightVal > 0) weightEl.value = (weightVal / 2.20462).toFixed(1);
            if (targetVal > 0) targetWeightEl.value = (targetVal / 2.20462).toFixed(1);
        }

        updateCalculationPreview();
    }

    function selectGoal(goal) {
        if (!GOAL_MACROS[goal]) goal = 'fat_loss';
        selectedGoal = goal;

        document.querySelectorAll('.goal-card-option').forEach(function(card) {
            if (card.getAttribute('data-goal') === goal) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        updateCalculationPreview();
    }

    function getNormalizedMetrics() {
        var age = parseInt(document.getElementById('profileAge').value, 10) || 25;
        var gender = document.getElementById('profileGender').value || 'male';
        var rawHeight = parseFloat(document.getElementById('profileHeight').value) || 175;
        var rawWeight = parseFloat(document.getElementById('profileWeight').value) || 75;
        var rawTargetWeight = parseFloat(document.getElementById('profileTargetWeight').value) || 0;
        var activity = document.getElementById('profileActivityLevel').value || 'moderate';
        var workoutDays = parseInt(document.getElementById('profileWorkoutDays').value, 10) || 4;
        var waterTarget = parseInt(document.getElementById('profileWaterTarget').value, 10) || 8;

        // Convert to standard metric for calculations
        var heightCm = currentUnit === 'imperial' ? (rawHeight / 0.393701) : rawHeight;
        var weightKg = currentUnit === 'imperial' ? (rawWeight / 2.20462) : rawWeight;
        var targetWeightKg = rawTargetWeight > 0 ? (currentUnit === 'imperial' ? (rawTargetWeight / 2.20462) : rawTargetWeight) : null;

        return {
            name: (document.getElementById('profileName').value || '').trim(),
            age: age,
            gender: gender,
            heightCm: Math.round(heightCm * 10) / 10,
            weightKg: Math.round(weightKg * 10) / 10,
            targetWeightKg: targetWeightKg ? Math.round(targetWeightKg * 10) / 10 : null,
            activity: activity,
            workoutDays: workoutDays,
            waterTarget: waterTarget,
            goal: selectedGoal,
            unit: currentUnit
        };
    }

    function calculateMetrics(metrics) {
        // Mifflin-St Jeor formula
        var bmr = 0;
        if (metrics.gender === 'male') {
            bmr = 10 * metrics.weightKg + 6.25 * metrics.heightCm - 5 * metrics.age + 5;
        } else {
            bmr = 10 * metrics.weightKg + 6.25 * metrics.heightCm - 5 * metrics.age - 161;
        }
        bmr = Math.max(800, Math.round(bmr));

        var mult = ACTIVITY_MULTIPLIERS[metrics.activity] || 1.55;
        var tdee = Math.round(bmr * mult);

        var goalConfig = GOAL_MACROS[metrics.goal] || GOAL_MACROS.maintenance;
        var targetCalories = Math.max(1200, Math.round(tdee + goalConfig.calDelta));

        var proteinGrams = Math.round((targetCalories * goalConfig.protein) / 4);
        var carbsGrams = Math.round((targetCalories * goalConfig.carbs) / 4);
        var fatGrams = Math.round((targetCalories * goalConfig.fat) / 9);

        // BMI
        var heightM = metrics.heightCm / 100;
        var bmi = heightM > 0 ? (metrics.weightKg / (heightM * heightM)) : 0;
        var bmiCategory = 'Normal';
        if (bmi < 18.5) bmiCategory = 'Underweight';
        else if (bmi < 25) bmiCategory = 'Normal';
        else if (bmi < 30) bmiCategory = 'Overweight';
        else bmiCategory = 'Obese';

        return {
            bmr: bmr,
            tdee: tdee,
            targetCalories: targetCalories,
            desc: goalConfig.desc,
            bmi: bmi.toFixed(1),
            bmiCategory: bmiCategory,
            protein: {
                grams: proteinGrams,
                cals: proteinGrams * 4,
                pct: Math.round(goalConfig.protein * 100)
            },
            carbs: {
                grams: carbsGrams,
                cals: carbsGrams * 4,
                pct: Math.round(goalConfig.carbs * 100)
            },
            fat: {
                grams: fatGrams,
                cals: fatGrams * 9,
                pct: Math.round(goalConfig.fat * 100)
            }
        };
    }

    function updateCalculationPreview() {
        var metrics = getNormalizedMetrics();
        var calc = calculateMetrics(metrics);

        // Update target hero
        Utils.setText('calcTargetCalories', Utils.formatNumber(calc.targetCalories) + ' kcal');
        Utils.setText('calcTargetDesc', calc.desc);

        // Update BMR & TDEE
        Utils.setText('calcBMR', Utils.formatNumber(calc.bmr) + ' kcal');
        Utils.setText('calcTDEE', Utils.formatNumber(calc.tdee) + ' kcal');

        // Update BMI
        Utils.setText('calcBMI', calc.bmi + ' — ' + calc.bmiCategory);

        // Update Macros
        Utils.setText('calcProtein', calc.protein.grams + 'g (' + calc.protein.pct + '% • ' + calc.protein.cals + ' kcal)');
        Utils.setText('calcCarbs', calc.carbs.grams + 'g (' + calc.carbs.pct + '% • ' + calc.carbs.cals + ' kcal)');
        Utils.setText('calcFat', calc.fat.grams + 'g (' + calc.fat.pct + '% • ' + calc.fat.cals + ' kcal)');

        var pBar = document.getElementById('calcProteinBar');
        var cBar = document.getElementById('calcCarbsBar');
        var fBar = document.getElementById('calcFatBar');

        if (pBar) pBar.style.width = calc.protein.pct + '%';
        if (cBar) cBar.style.width = calc.carbs.pct + '%';
        if (fBar) fBar.style.width = calc.fat.pct + '%';
    }

    function refresh() {
        var profile = Storage.getProfile();
        var badge = document.getElementById('profileStatusBadge');

        if (profile) {
            // Populate fields
            if (profile.name) document.getElementById('profileName').value = profile.name;
            if (profile.age) document.getElementById('profileAge').value = profile.age;
            if (profile.gender) document.getElementById('profileGender').value = profile.gender;
            if (profile.activity_level) document.getElementById('profileActivityLevel').value = profile.activity_level;
            if (profile.workout_days) document.getElementById('profileWorkoutDays').value = profile.workout_days;
            if (profile.targets && profile.targets.water) document.getElementById('profileWaterTarget').value = profile.targets.water;

            currentUnit = profile.unit || 'metric';
            var btnMetric = document.getElementById('btnMetric');
            var btnImperial = document.getElementById('btnImperial');
            var heightUnit = document.getElementById('heightUnitLabel');
            var weightUnit = document.getElementById('weightUnitLabel');
            var targetWeightUnit = document.getElementById('targetWeightUnitLabel');

            if (currentUnit === 'imperial') {
                if (btnMetric) btnMetric.classList.remove('active');
                if (btnImperial) btnImperial.classList.add('active');
                if (heightUnit) heightUnit.textContent = 'in';
                if (weightUnit) weightUnit.textContent = 'lb';
                if (targetWeightUnit) targetWeightUnit.textContent = 'lb';
                if (profile.height) document.getElementById('profileHeight').value = (profile.height * 0.393701).toFixed(1);
                if (profile.weight) document.getElementById('profileWeight').value = (profile.weight * 2.20462).toFixed(1);
                if (profile.targetWeight) document.getElementById('profileTargetWeight').value = (profile.targetWeight * 2.20462).toFixed(1);
            } else {
                if (btnImperial) btnImperial.classList.remove('active');
                if (btnMetric) btnMetric.classList.add('active');
                if (heightUnit) heightUnit.textContent = 'cm';
                if (weightUnit) weightUnit.textContent = 'kg';
                if (targetWeightUnit) targetWeightUnit.textContent = 'kg';
                if (profile.height) document.getElementById('profileHeight').value = profile.height;
                if (profile.weight) document.getElementById('profileWeight').value = profile.weight;
                if (profile.targetWeight) document.getElementById('profileTargetWeight').value = profile.targetWeight;
            }

            if (profile.goal) {
                selectGoal(profile.goal);
            } else {
                selectGoal('fat_loss');
            }

            if (badge) {
                badge.className = 'badge badge-success';
                var goalName = profile.goal ? profile.goal.replace('_', ' ').toUpperCase() : 'CONFIGURED';
                badge.textContent = '✅ Profile Active (' + goalName + ')';
            }
        } else {
            // Set sensible starter values
            document.getElementById('profileAge').value = 25;
            document.getElementById('profileHeight').value = 175;
            document.getElementById('profileWeight').value = 75;
            document.getElementById('profileTargetWeight').value = 70;
            selectGoal('fat_loss');

            if (badge) {
                badge.className = 'badge badge-warning';
                badge.textContent = '⚠️ Setup Required';
            }
        }

        hideErrors();
        updateCalculationPreview();
    }

    function showErrors(errors) {
        var box = document.getElementById('profileErrorBox');
        if (!box) return;
        box.innerHTML = '<strong>Validation Error:</strong><ul style="margin: 6px 0 0 16px; padding: 0;">' +
            errors.map(function(err) { return '<li>' + Utils.escapeHtml(err) + '</li>'; }).join('') +
            '</ul>';
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideErrors() {
        var box = document.getElementById('profileErrorBox');
        if (box) {
            box.style.display = 'none';
            box.innerHTML = '';
        }
    }

    function saveProfile() {
        var metrics = getNormalizedMetrics();
        var clientErrors = [];

        if (!metrics.age || metrics.age < 13 || metrics.age > 120) {
            clientErrors.push('Age must be between 13 and 120.');
        }
        if (!metrics.heightCm || metrics.heightCm < 50 || metrics.heightCm > 300) {
            clientErrors.push('Height must be between 50 and 300 cm.');
        }
        if (!metrics.weightKg || metrics.weightKg <= 0 || metrics.weightKg > 500) {
            clientErrors.push('Weight must be between 1 and 500 kg.');
        }

        if (clientErrors.length > 0) {
            showErrors(clientErrors);
            Utils.showToast(clientErrors[0], 'error');
            return;
        }

        var payload = {
            age: metrics.age,
            gender: metrics.gender,
            weight: metrics.weightKg,
            height: metrics.heightCm,
            activity_level: metrics.activity,
            goal: metrics.goal,
            workout_days: metrics.workoutDays
        };

        var saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        // Validate with backend API
        fetch('/api/profile/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            return res.json().then(function(data) {
                return { status: res.status, data: data };
            });
        })
        .then(function(result) {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Save Profile & Update Targets';
            }

            if (result.status !== 200 || !result.data.valid) {
                var errs = result.data.errors || ['Server validation failed.'];
                showErrors(errs);
                Utils.showToast(errs[0], 'error');
                return;
            }

            hideErrors();

            // Calculate final targets
            var calc = calculateMetrics(metrics);

            var profileToSave = {
                name: metrics.name,
                age: metrics.age,
                gender: metrics.gender,
                height: metrics.heightCm,
                weight: metrics.weightKg,
                targetWeight: metrics.targetWeightKg,
                unit: metrics.unit,
                activity_level: metrics.activity,
                workout_days: metrics.workoutDays,
                goal: metrics.goal,
                bmr: calc.bmr,
                tdee: calc.tdee,
                targets: {
                    calories: calc.targetCalories,
                    protein: calc.protein.grams,
                    carbs: calc.carbs.grams,
                    fat: calc.fat.grams,
                    water: metrics.waterTarget
                },
                updatedAt: new Date().toISOString()
            };

            Storage.saveProfile(profileToSave);

            // Log current weight to weight history for progress tracking
            Storage.addWeightEntry(Utils.getTodayKey(), metrics.weightKg, 'kg');

            // Refresh Dashboard module so calorie ring, macros, and welcome banner sync
            if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                window.FitCoach.Dashboard.refresh();
            }

            // Update badge in profile view
            var badge = document.getElementById('profileStatusBadge');
            if (badge) {
                badge.className = 'badge badge-success';
                var goalName = metrics.goal.replace('_', ' ').toUpperCase();
                badge.textContent = '✅ Profile Active (' + goalName + ')';
            }

            Utils.showToast('Profile & daily metabolic targets successfully updated!', 'success');
        })
        .catch(function(err) {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Save Profile & Update Targets';
            }
            console.error('FitCoach: Error saving profile:', err);
            Utils.showToast('Failed to validate profile with server. Check connection.', 'error');
        });
    }

    function resetToDefaults() {
        if (!confirm('Reset profile inputs to default recommendations?')) return;
        Storage.saveProfile(null);
        refresh();
        if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
            window.FitCoach.Dashboard.refresh();
        }
        Utils.showToast('Profile reset to default values.', 'info');
    }

    return {
        init: init,
        refresh: refresh,
        calculateMetrics: calculateMetrics
    };
})();
