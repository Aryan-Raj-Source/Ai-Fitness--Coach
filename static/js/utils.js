/**
 * FitCoach Utility Functions
 * Toast notifications, formatting helpers, date utilities, DOM helpers.
 */
window.FitCoach = window.FitCoach || {};

window.FitCoach.Utils = (function() {
    'use strict';

    // ---- Toast Notifications ----
    function showToast(message, type, duration) {
        // type: 'success' | 'error' | 'warning' | 'info'
        // duration: ms, default 3000
        type = type || 'info';
        duration = duration || 3000;
        var container = document.getElementById('toastContainer');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        
        var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
                          '<span class="toast-message">' + escapeHtml(message) + '</span>' +
                          '<button class="toast-close" aria-label="Dismiss">&times;</button>';

        toast.querySelector('.toast-close').addEventListener('click', function() {
            dismissToast(toast);
        });

        container.appendChild(toast);

        // Force reflow for animation
        toast.offsetHeight;
        toast.classList.add('toast-visible');

        var timer = setTimeout(function() {
            dismissToast(toast);
        }, duration);

        toast._timer = timer;
    }

    function dismissToast(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;
        clearTimeout(toast._timer);
        toast.classList.add('toast-fade-out');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    // ---- HTML Escaping ----
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ---- Date Utilities ----
    function getTodayKey() {
        // Returns 'YYYY-MM-DD' for today
        return formatDateKey(new Date());
    }

    function formatDateKey(date) {
        var d = new Date(date);
        var year = d.getFullYear();
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function getWeekDates() {
        // Returns array of 7 date keys for current week (Mon-Sun)
        var now = new Date();
        var dayOfWeek = now.getDay();
        var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        var dates = [];
        for (var i = 0; i < 7; i++) {
            var d = new Date(now);
            d.setDate(now.getDate() + mondayOffset + i);
            dates.push(formatDateKey(d));
        }
        return dates;
    }

    function getDayLabel(dateKey) {
        var d = new Date(dateKey + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function formatDate(dateKey) {
        var d = new Date(dateKey + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ---- Number Formatting ----
    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return Math.round(num).toLocaleString();
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // ---- DOM Helpers ----
    function $(selector) {
        return document.querySelector(selector);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setHtml(id, html) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function show(el) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.style.display = '';
    }

    function hide(el) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.style.display = 'none';
    }

    // ---- Debounce ----
    function debounce(fn, delay) {
        var timer;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() {
                fn.apply(context, args);
            }, delay);
        };
    }

    // ---- UUID Generator ----
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    return {
        showToast: showToast,
        escapeHtml: escapeHtml,
        getTodayKey: getTodayKey,
        formatDateKey: formatDateKey,
        getWeekDates: getWeekDates,
        getDayLabel: getDayLabel,
        formatDate: formatDate,
        formatNumber: formatNumber,
        clamp: clamp,
        $: $,
        $$: $$,
        setText: setText,
        setHtml: setHtml,
        show: show,
        hide: hide,
        debounce: debounce,
        generateId: generateId
    };
})();
