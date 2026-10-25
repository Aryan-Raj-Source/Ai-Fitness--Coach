window.FitCoach = window.FitCoach || {};

window.FitCoach.App = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var sections = ['dashboard', 'profile', 'workouts', 'nutrition', 'scanner', 'progress', 'coach'];
    var sectionTitles = {
        dashboard: 'Dashboard',
        profile: 'Profile & Goals',
        workouts: 'Workout Coach',
        nutrition: 'Nutrition Tracker',
        scanner: 'Barcode Scanner',
        progress: 'Progress Analytics',
        coach: 'AI Fitness Coach'
    };

    var modules = {
        dashboard: window.FitCoach.Dashboard,
        profile: window.FitCoach.Profile,
        workouts: window.FitCoach.Workouts,
        nutrition: window.FitCoach.Nutrition,
        scanner: window.FitCoach.Scanner,
        progress: window.FitCoach.Progress,
        coach: window.FitCoach.Coach
    };

    function init() {
        // Apply saved theme
        applyTheme(Storage.getTheme());

        // Initialize all modules
        Object.keys(modules).forEach(function(key) {
            if (modules[key] && modules[key].init) {
                try {
                    modules[key].init();
                } catch (e) {
                    console.error('FitCoach: Failed to init module "' + key + '":', e);
                }
            }
        });

        // Bind navigation
        bindNavigation();
        bindThemeToggle();
        bindMobileMenu();
        bindKeyboard();

        // Route to initial section
        var hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);

        // Listen for hash changes
        window.addEventListener('hashchange', function() {
            var hash = window.location.hash.replace('#', '') || 'dashboard';
            navigateTo(hash);
        });

        // Fetch backend status
        fetchStatus();
    }

    function bindNavigation() {
        var navItems = document.querySelectorAll('.nav-item[data-section]');
        navItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                var section = this.getAttribute('data-section');
                navigateTo(section);
                closeMobileMenu();
            });
        });
    }

    function bindThemeToggle() {
        var toggle = document.getElementById('themeToggle');
        var toggleMobile = document.getElementById('themeToggleMobile');

        function doToggle() {
            var current = document.body.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            Storage.setTheme(next);
        }

        if (toggle) toggle.addEventListener('click', doToggle);
        if (toggleMobile) toggleMobile.addEventListener('click', doToggle);
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        var icon = theme === 'dark' ? '🌙' : '☀️';
        var label = theme === 'dark' ? 'Dark Mode' : 'Light Mode';

        // Update all theme toggle buttons
        document.querySelectorAll('.theme-icon').forEach(function(el) {
            el.textContent = icon;
        });
        var themeLabel = document.querySelector('.theme-label');
        if (themeLabel) themeLabel.textContent = label;

        // Re-render charts with new theme colors after a brief delay
        setTimeout(function() {
            if (window.FitCoach.Charts && window.FitCoach.Charts.refreshAll) {
                window.FitCoach.Charts.refreshAll();
            }
        }, 50);
    }

    function bindMobileMenu() {
        var menuToggle = document.getElementById('menuToggle');
        var overlay = document.getElementById('sidebarOverlay');

        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                var sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }
    }

    function closeMobileMenu() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    function bindKeyboard() {
        document.addEventListener('keydown', function(e) {
            // Escape closes modals and mobile menu
            if (e.key === 'Escape') {
                closeMobileMenu();
                // Close any open modals
                document.querySelectorAll('.modal-overlay.active').forEach(function(modal) {
                    modal.classList.remove('active');
                });
            }
        });
    }

    function navigateTo(sectionName) {
        if (sections.indexOf(sectionName) === -1) sectionName = 'dashboard';

        // Update hash without triggering hashchange again
        if (window.location.hash !== '#' + sectionName) {
            history.replaceState(null, '', '#' + sectionName);
        }

        // Toggle section visibility
        sections.forEach(function(s) {
            var el = document.getElementById('section-' + s);
            if (el) {
                if (s === sectionName) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            }
        });

        // Update nav active state
        document.querySelectorAll('.nav-item[data-section]').forEach(function(item) {
            if (item.getAttribute('data-section') === sectionName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update page title
        Utils.setText('pageTitle', sectionTitles[sectionName] || 'FitCoach');

        // Refresh the target module
        if (modules[sectionName] && modules[sectionName].refresh) {
            try {
                modules[sectionName].refresh();
            } catch (e) {
                console.error('FitCoach: Failed to refresh module "' + sectionName + '":', e);
            }
        }

        // Scroll to top
        var contentArea = document.getElementById('contentArea');
        if (contentArea) contentArea.scrollTop = 0;
    }

    function fetchStatus() {
        fetch('/api/config')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.features) {
                    window.FitCoach._features = data.features;
                }
            })
            .catch(function(err) {
                console.warn('FitCoach: Could not fetch backend config:', err);
                // App works without backend - degrade gracefully
            });
    }

    return {
        init: init,
        navigateTo: navigateTo
    };
})();

// ---- Bootstrap the app on DOM ready ----
document.addEventListener('DOMContentLoaded', function() {
    window.FitCoach.App.init();
});
