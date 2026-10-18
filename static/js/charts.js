window.FitCoach = window.FitCoach || {};

window.FitCoach.Charts = (function() {
    'use strict';

    var chartInstances = {};

    function getThemeColors() {
        var style = getComputedStyle(document.documentElement);
        return {
            text: style.getPropertyValue('--text-primary').trim() || '#e2e8f0',
            textSecondary: style.getPropertyValue('--text-secondary').trim() || '#94a3b8',
            grid: style.getPropertyValue('--border-color').trim() || '#2a2e42',
            accent: style.getPropertyValue('--accent').trim() || '#4ade80',
            protein: style.getPropertyValue('--protein-color').trim() || '#60a5fa',
            carbs: style.getPropertyValue('--carbs-color').trim() || '#fbbf24',
            fat: style.getPropertyValue('--fat-color').trim() || '#f87171',
            cardBg: style.getPropertyValue('--bg-card').trim() || '#1e2235'
        };
    }

    function destroyChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    function isChartJsAvailable() {
        return typeof Chart !== 'undefined';
    }

    // Draw the calorie ring (doughnut chart)
    function drawCalorieRing(canvasId, consumed, target) {
        if (!isChartJsAvailable()) return;
        destroyChart(canvasId);

        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        var colors = getThemeColors();
        var remaining = Math.max(0, target - consumed);
        var overAmount = consumed > target ? consumed - target : 0;

        var data, bgColors;
        if (overAmount > 0) {
            data = [target, overAmount];
            bgColors = [colors.accent, '#f87171'];
        } else {
            data = [consumed, remaining];
            bgColors = [colors.accent, colors.grid];
        }

        chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    cutout: '78%'
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: {
                    animateRotate: true,
                    duration: 800
                }
            }
        });
    }

    // Weekly activity bar chart
    function drawWeeklyActivity(canvasId, labels, caloriesBurned, workoutMinutes) {
        if (!isChartJsAvailable()) return;
        destroyChart(canvasId);

        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        var colors = getThemeColors();

        chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calories Burned',
                    data: caloriesBurned,
                    backgroundColor: colors.accent + 'cc',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: colors.textSecondary, boxWidth: 12, padding: 16 }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary },
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

    // Weekly nutrition line chart
    function drawWeeklyNutrition(canvasId, labels, calories, protein, carbs, fat) {
        if (!isChartJsAvailable()) return;
        destroyChart(canvasId);

        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        var colors = getThemeColors();

        chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Calories',
                        data: calories,
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '20',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Protein (g)',
                        data: protein,
                        borderColor: colors.protein,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Carbs (g)',
                        data: carbs,
                        borderColor: colors.carbs,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Fat (g)',
                        data: fat,
                        borderColor: colors.fat,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: colors.textSecondary, boxWidth: 12, padding: 12, usePointStyle: true }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: colors.textSecondary },
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

    // Refresh all active charts (call after theme change)
    function refreshAll() {
        // Dashboard will re-render its charts
        if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
            window.FitCoach.Dashboard.refresh();
        }
    }

    return {
        drawCalorieRing: drawCalorieRing,
        drawWeeklyActivity: drawWeeklyActivity,
        drawWeeklyNutrition: drawWeeklyNutrition,
        destroyChart: destroyChart,
        refreshAll: refreshAll,
        getThemeColors: getThemeColors
    };
})();
