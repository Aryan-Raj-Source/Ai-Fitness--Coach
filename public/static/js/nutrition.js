window.FitCoach = window.FitCoach || {};

window.FitCoach.Nutrition = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var selectedDateKey = Utils.getTodayKey();
    var currentActiveMeal = 'breakfast';
    var selectedFoodItem = null;
    var activeModalTab = 'search'; // 'search' | 'custom'
    var searchDebounceTimer = null;

    var QUICK_CHIPS = [
        'Chicken Breast', 'Whole Egg', 'Oatmeal', 'White Rice',
        'Salmon', 'Banana', 'Whey Protein', 'Avocado', 'Greek Yogurt'
    ];

    function init() {
        bindEvents();
        renderQuickChips();
        renderAll();
    }

    function bindEvents() {
        // Date navigation
        var prevBtn = document.getElementById('ntrPrevDayBtn');
        var nextBtn = document.getElementById('ntrNextDayBtn');
        var todayBtn = document.getElementById('ntrTodayBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                shiftDate(-1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                shiftDate(1);
            });
        }
        if (todayBtn) {
            todayBtn.addEventListener('click', function() {
                selectedDateKey = Utils.getTodayKey();
                renderAll();
            });
        }

        // Top quick log button
        var openQuickLogBtn = document.getElementById('openQuickLogBtn');
        if (openQuickLogBtn) {
            openQuickLogBtn.addEventListener('click', function() {
                openFoodModal('breakfast');
            });
        }

        // Meal add buttons
        document.querySelectorAll('.log-meal-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var meal = this.getAttribute('data-meal') || 'breakfast';
                openFoodModal(meal);
            });
        });

        // Modal close / cancel
        var modalClose = document.getElementById('foodModalClose');
        var modalCancel = document.getElementById('foodModalCancel');
        var foodModal = document.getElementById('foodModal');

        if (modalClose) modalClose.addEventListener('click', closeFoodModal);
        if (modalCancel) modalCancel.addEventListener('click', closeFoodModal);
        if (foodModal) {
            foodModal.addEventListener('click', function(e) {
                if (e.target === foodModal) closeFoodModal();
            });
        }

        // Modal Tabs
        var tabSearch = document.getElementById('tabSearchFood');
        var tabCustom = document.getElementById('tabCustomFood');
        if (tabSearch) {
            tabSearch.addEventListener('click', function() {
                switchModalTab('search');
            });
        }
        if (tabCustom) {
            tabCustom.addEventListener('click', function() {
                switchModalTab('custom');
            });
        }

        // Search Input
        var searchInput = document.getElementById('foodSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                var query = this.value.trim();
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(function() {
                    performSearch(query);
                }, 200);
            });
        }

        // Servings count change
        var servingsInput = document.getElementById('foodServingsCount');
        if (servingsInput) {
            servingsInput.addEventListener('input', updateSelectedFoodPreview);
            servingsInput.addEventListener('change', updateSelectedFoodPreview);
        }

        // Add to meal button
        var addBtn = document.getElementById('foodModalAddBtn');
        if (addBtn) {
            addBtn.addEventListener('click', onAddFoodClicked);
        }
    }

    function shiftDate(days) {
        var d = new Date(selectedDateKey + 'T00:00:00');
        d.setDate(d.getDate() + days);
        selectedDateKey = Utils.formatDateKey(d);
        renderAll();
    }

    function switchModalTab(tab) {
        activeModalTab = tab;
        var tabSearch = document.getElementById('tabSearchFood');
        var tabCustom = document.getElementById('tabCustomFood');
        var paneSearch = document.getElementById('paneSearchFood');
        var paneCustom = document.getElementById('paneCustomFood');

        if (tab === 'search') {
            if (tabSearch) tabSearch.classList.add('active');
            if (tabCustom) tabCustom.classList.remove('active');
            if (paneSearch) paneSearch.style.display = 'flex';
            if (paneCustom) paneCustom.style.display = 'none';
        } else {
            if (tabCustom) tabCustom.classList.add('active');
            if (tabSearch) tabSearch.classList.remove('active');
            if (paneSearch) paneSearch.style.display = 'none';
            if (paneCustom) paneCustom.style.display = 'flex';
        }
    }

    function renderQuickChips() {
        var container = document.getElementById('foodQuickChips');
        if (!container) return;

        container.innerHTML = '';
        QUICK_CHIPS.forEach(function(foodName) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'quick-chip';
            chip.textContent = foodName;
            chip.addEventListener('click', function() {
                var input = document.getElementById('foodSearchInput');
                if (input) {
                    input.value = foodName;
                    performSearch(foodName);
                }
            });
            container.appendChild(chip);
        });
    }

    function openFoodModal(meal) {
        currentActiveMeal = meal || 'breakfast';
        var modal = document.getElementById('foodModal');
        var modalTitle = document.getElementById('foodModalTitle');
        var mealSelect1 = document.getElementById('foodTargetMealSelect');
        var mealSelect2 = document.getElementById('customFoodMealSelect');
        var searchInput = document.getElementById('foodSearchInput');
        var selectedDetails = document.getElementById('foodSelectedDetails');

        if (modalTitle) {
            var label = meal.charAt(0).toUpperCase() + meal.slice(1);
            modalTitle.textContent = 'Log Food to ' + label;
        }

        if (mealSelect1) mealSelect1.value = currentActiveMeal;
        if (mealSelect2) mealSelect2.value = currentActiveMeal;

        selectedFoodItem = null;
        if (selectedDetails) selectedDetails.style.display = 'none';
        if (searchInput) {
            searchInput.value = '';
            setTimeout(function() { searchInput.focus(); }, 100);
        }

        switchModalTab('search');
        performSearch('Chicken'); // sensible initial list

        if (modal) modal.classList.add('active');
    }

    function closeFoodModal() {
        var modal = document.getElementById('foodModal');
        if (modal) modal.classList.remove('active');
        selectedFoodItem = null;
    }

    function performSearch(query) {
        var resultsContainer = document.getElementById('foodSearchResults');
        if (!resultsContainer) return;

        if (!query) {
            resultsContainer.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: 12px;">Type a food item or pick a quick suggestion above.</p>';
            return;
        }

        fetch('/api/nutrition/search?q=' + encodeURIComponent(query))
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var items = (data && data.results) ? data.results : [];
            if (items.length === 0) {
                resultsContainer.innerHTML =
                    '<div style="text-align: center; padding: 16px; font-size: 0.85rem; color: var(--text-muted);">' +
                        'No matches found for "' + Utils.escapeHtml(query) + '". Try another keyword or use the Custom Food tab.' +
                    '</div>';
                return;
            }

            var html = '';
            items.forEach(function(food, i) {
                html +=
                    '<div class="search-result-item" data-index="' + i + '">' +
                        '<div>' +
                            '<div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">' + Utils.escapeHtml(food.name) + '</div>' +
                            '<div style="font-size: 0.78rem; color: var(--text-muted);">' +
                                food.serving_size + ' &nbsp;|&nbsp; ' +
                                '<span style="color: var(--protein-color);">' + food.protein + 'g P</span> &nbsp;•&nbsp; ' +
                                '<span style="color: var(--carbs-color);">' + food.carbs + 'g C</span> &nbsp;•&nbsp; ' +
                                '<span style="color: var(--fat-color);">' + food.fat + 'g F</span>' +
                            '</div>' +
                        '</div>' +
                        '<div style="font-weight: 700; color: var(--accent); font-size: 0.95rem;">' +
                            food.calories + ' <span style="font-size: 0.75rem; font-weight: 500;">kcal</span>' +
                        '</div>' +
                    '</div>';
            });

            resultsContainer.innerHTML = html;

            // Bind click handlers to items
            resultsContainer.querySelectorAll('.search-result-item').forEach(function(el, i) {
                el.addEventListener('click', function() {
                    resultsContainer.querySelectorAll('.search-result-item').forEach(function(item) { item.classList.remove('selected'); });
                    el.classList.add('selected');
                    selectFood(items[i]);
                });
            });
        })
        .catch(function(err) {
            console.error('FitCoach: Error searching nutrition:', err);
        });
    }

    function selectFood(food) {
        selectedFoodItem = food;
        var selectedDetails = document.getElementById('foodSelectedDetails');
        var servingsInput = document.getElementById('foodServingsCount');

        if (servingsInput) servingsInput.value = '1';
        if (selectedDetails) {
            selectedDetails.style.display = 'block';
            selectedDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        Utils.setText('selectedFoodName', food.name);
        Utils.setText('selectedFoodServing', food.serving_size || '1 serving');

        updateSelectedFoodPreview();
    }

    function updateSelectedFoodPreview() {
        if (!selectedFoodItem) return;

        var servings = parseFloat(document.getElementById('foodServingsCount').value) || 1;
        servings = Math.max(0.1, servings);

        var cals = Math.round(selectedFoodItem.calories * servings);
        var protein = Math.round(selectedFoodItem.protein * servings * 10) / 10;
        var carbs = Math.round(selectedFoodItem.carbs * servings * 10) / 10;
        var fat = Math.round(selectedFoodItem.fat * servings * 10) / 10;

        Utils.setText('previewFoodCals', cals);
        Utils.setText('previewFoodProtein', protein + 'g');
        Utils.setText('previewFoodCarbs', carbs + 'g');
        Utils.setText('previewFoodFat', fat + 'g');
    }

    function onAddFoodClicked() {
        if (activeModalTab === 'search') {
            if (!selectedFoodItem) {
                Utils.showToast('Please select a food item from the list.', 'warning');
                return;
            }

            var servings = parseFloat(document.getElementById('foodServingsCount').value) || 1;
            var meal = document.getElementById('foodTargetMealSelect').value || currentActiveMeal;

            var entry = {
                id: Utils.generateId(),
                name: selectedFoodItem.name,
                meal: meal,
                calories: Math.round(selectedFoodItem.calories * servings),
                protein: Math.round(selectedFoodItem.protein * servings * 10) / 10,
                carbs: Math.round(selectedFoodItem.carbs * servings * 10) / 10,
                fat: Math.round(selectedFoodItem.fat * servings * 10) / 10,
                servings: servings,
                servingUnit: selectedFoodItem.serving_size || 'serving',
                time: new Date().toISOString()
            };

            Storage.saveMeal(selectedDateKey, entry);
            closeFoodModal();
            renderAll();

            if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                window.FitCoach.Dashboard.refresh();
            }

            Utils.showToast('Logged ' + entry.name + ' to ' + meal + '!', 'success');
        } else {
            // Custom food entry
            var name = (document.getElementById('customFoodName').value || '').trim();
            var meal = document.getElementById('customFoodMealSelect').value || currentActiveMeal;
            var cals = parseFloat(document.getElementById('customFoodCals').value);
            var protein = parseFloat(document.getElementById('customFoodProtein').value) || 0;
            var carbs = parseFloat(document.getElementById('customFoodCarbs').value) || 0;
            var fat = parseFloat(document.getElementById('customFoodFat').value) || 0;

            if (!name) {
                Utils.showToast('Food name is required.', 'error');
                return;
            }
            if (isNaN(cals) || cals < 0) {
                Utils.showToast('Please enter valid calories.', 'error');
                return;
            }

            var customEntry = {
                id: Utils.generateId(),
                name: name,
                meal: meal,
                calories: Math.round(cals),
                protein: Math.round(protein * 10) / 10,
                carbs: Math.round(carbs * 10) / 10,
                fat: Math.round(fat * 10) / 10,
                servings: 1,
                servingUnit: 'serving',
                time: new Date().toISOString()
            };

            Storage.saveMeal(selectedDateKey, customEntry);
            closeFoodModal();
            renderAll();

            if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                window.FitCoach.Dashboard.refresh();
            }

            Utils.showToast('Logged ' + customEntry.name + ' to ' + meal + '!', 'success');
        }
    }

    function renderAll() {
        var todayKey = Utils.getTodayKey();
        var dateLabel = document.getElementById('ntrDateLabel');
        if (dateLabel) {
            if (selectedDateKey === todayKey) {
                dateLabel.textContent = 'Today, ' + Utils.formatDate(selectedDateKey);
            } else {
                dateLabel.textContent = Utils.getDayLabel(selectedDateKey) + ', ' + Utils.formatDate(selectedDateKey);
            }
        }

        var targets = Storage.getTargets();
        var totals = Storage.getDailyNutrition(selectedDateKey);
        var meals = Storage.getMealsForDate(selectedDateKey);

        // Update Calories budget
        Utils.setText('ntrCalConsumed', Utils.formatNumber(totals.calories));
        Utils.setText('ntrCalTarget', Utils.formatNumber(targets.calories));

        var remaining = targets.calories - totals.calories;
        var calRemainingText = Utils.formatNumber(Math.abs(remaining)) + ' kcal ' + (remaining >= 0 ? 'remaining' : 'over budget');
        Utils.setText('ntrCalRemaining', calRemainingText);

        var calPct = targets.calories > 0 ? Math.min(100, Math.round((totals.calories / targets.calories) * 100)) : 0;
        var calBar = document.getElementById('ntrCalBar');
        if (calBar) {
            calBar.style.width = calPct + '%';
            calBar.style.backgroundColor = remaining >= 0 ? 'var(--accent)' : 'var(--danger)';
        }

        // Update Macros
        Utils.setText('ntrProteinVal', Math.round(totals.protein) + ' / ' + targets.protein + 'g');
        Utils.setText('ntrCarbsVal', Math.round(totals.carbs) + ' / ' + targets.carbs + 'g');
        Utils.setText('ntrFatVal', Math.round(totals.fat) + ' / ' + targets.fat + 'g');

        var pPct = targets.protein > 0 ? Math.min(100, Math.round((totals.protein / targets.protein) * 100)) : 0;
        var cPct = targets.carbs > 0 ? Math.min(100, Math.round((totals.carbs / targets.carbs) * 100)) : 0;
        var fPct = targets.fat > 0 ? Math.min(100, Math.round((totals.fat / targets.fat) * 100)) : 0;

        var pBar = document.getElementById('ntrProteinBar');
        var cBar = document.getElementById('ntrCarbsBar');
        var fBar = document.getElementById('ntrFatBar');

        if (pBar) pBar.style.width = pPct + '%';
        if (cBar) cBar.style.width = cPct + '%';
        if (fBar) fBar.style.width = fPct + '%';

        // Render each meal category
        renderMealCategory('breakfast', meals);
        renderMealCategory('lunch', meals);
        renderMealCategory('dinner', meals);
        renderMealCategory('snack', meals);
    }

    function renderMealCategory(cat, allMeals) {
        var listContainerId = 'list' + cat.charAt(0).toUpperCase() + cat.slice(1);
        var calsBadgeId = 'cals' + cat.charAt(0).toUpperCase() + cat.slice(1);

        var container = document.getElementById(listContainerId);
        var calsBadge = document.getElementById(calsBadgeId);
        if (!container) return;

        var categoryMeals = allMeals.filter(function(m) {
            var mealCat = m.meal || 'snack';
            return mealCat === cat;
        });

        var catCals = categoryMeals.reduce(function(sum, m) {
            return sum + (m.calories || 0);
        }, 0);

        if (calsBadge) {
            calsBadge.textContent = Utils.formatNumber(catCals) + ' kcal';
        }

        if (categoryMeals.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; padding: 14px; font-size: 0.85rem; color: var(--text-muted);">' +
                    'No items logged for this meal yet.' +
                '</div>';
            return;
        }

        var html = '';
        categoryMeals.forEach(function(item) {
            html +=
                '<div class="food-log-item" id="item_' + item.id + '">' +
                    '<div class="food-item-info">' +
                        '<span class="food-item-name">' + Utils.escapeHtml(item.name) + '</span>' +
                        '<div class="food-item-meta">' +
                            '<span>' + item.servings + ' × ' + (item.servingUnit || 'serving') + '</span>' +
                            '<span>•</span>' +
                            '<span style="color: var(--protein-color);">' + item.protein + 'g P</span>' +
                            '<span>•</span>' +
                            '<span style="color: var(--carbs-color);">' + item.carbs + 'g C</span>' +
                            '<span>•</span>' +
                            '<span style="color: var(--fat-color);">' + item.fat + 'g F</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display: flex; align-items: center; gap: 12px;">' +
                        '<span style="font-weight: 700; color: var(--accent); font-size: 0.95rem;">' + item.calories + ' kcal</span>' +
                        '<button type="button" class="food-item-delete" data-id="' + item.id + '" title="Remove item" aria-label="Delete food item">&times;</button>' +
                    '</div>' +
                '</div>';
        });

        container.innerHTML = html;

        // Bind delete listeners
        container.querySelectorAll('.food-item-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                Storage.deleteMeal(selectedDateKey, id);
                renderAll();

                if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
                    window.FitCoach.Dashboard.refresh();
                }

                Utils.showToast('Item removed.', 'info');
            });
        });
    }

    function refresh() {
        renderAll();
    }

    return {
        init: init,
        refresh: refresh,
        openFoodModal: openFoodModal
    };
})();
