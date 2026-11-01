window.FitCoach = window.FitCoach || {};

window.FitCoach.Scanner = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var html5QrCode = null;
    var isCameraActive = false;
    var currentProduct = null;

    function init() {
        bindEvents();
    }

    function bindEvents() {
        // Toggle camera button
        var toggleCamBtn = document.getElementById('btnToggleCamera');
        if (toggleCamBtn) {
            toggleCamBtn.addEventListener('click', toggleCameraScanner);
        }

        // Manual lookup
        var manualBtn = document.getElementById('btnManualLookup');
        var manualInput = document.getElementById('barcodeInputManual');

        if (manualBtn) {
            manualBtn.addEventListener('click', function() {
                var code = (manualInput ? manualInput.value : '').trim();
                if (code) lookupBarcode(code);
            });
        }

        if (manualInput) {
            manualInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var code = this.value.trim();
                    if (code) lookupBarcode(code);
                }
            });
        }

        // Sample barcode cards
        document.querySelectorAll('.sample-barcode-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var code = this.getAttribute('data-code');
                if (manualInput) manualInput.value = code;
                lookupBarcode(code);
            });
        });

        // Servings multiplier in result card
        var servingsInput = document.getElementById('scannedServingsCount');
        if (servingsInput) {
            servingsInput.addEventListener('input', updateScannedTotals);
            servingsInput.addEventListener('change', updateScannedTotals);
        }

        // Log to meals button
        var logBtn = document.getElementById('btnLogScannedFood');
        if (logBtn) {
            logBtn.addEventListener('click', logScannedProductToMeals);
        }
    }

    function toggleCameraScanner() {
        if (isCameraActive) {
            stopCameraScanner();
        } else {
            startCameraScanner();
        }
    }

    function startCameraScanner() {
        if (typeof window.Html5Qrcode === 'undefined') {
            Utils.showToast('Barcode scanner library is loading. Please try again.', 'warning');
            return;
        }

        var btn = document.getElementById('btnToggleCamera');
        var prompt = document.getElementById('cameraInactivePrompt');
        var status = document.getElementById('scannerStatusText');

        if (prompt) prompt.style.display = 'none';
        if (status) status.textContent = '🎥 Camera active. Center the barcode in view...';

        try {
            html5QrCode = new window.Html5Qrcode('reader');
            var config = {
                fps: 10,
                qrbox: { width: 260, height: 200 }
            };

            html5QrCode.start(
                { facingMode: 'environment' },
                config,
                function(decodedText) {
                    // Barcode successfully detected
                    if (status) status.textContent = '✅ Scanned barcode: ' + decodedText;
                    stopCameraScanner();
                    lookupBarcode(decodedText);
                },
                function() {
                    // Scanning error or no barcode in current frame; safe to ignore
                }
            )
            .then(function() {
                isCameraActive = true;
                if (btn) {
                    btn.innerHTML = '<span>⏹️</span> Stop Camera';
                    btn.className = 'btn btn-sm btn-secondary';
                }
            })
            .catch(function(err) {
                console.warn('FitCoach: Camera start failed or permission denied:', err);
                if (prompt) {
                    prompt.style.display = 'block';
                    prompt.innerHTML =
                        '<span style="font-size: 2rem; display: block; margin-bottom: 6px;">⚠️</span>' +
                        '<p style="margin: 0; font-size: 0.85rem; color: var(--danger);">' +
                            'Camera access denied or unavailable on this device. Use manual lookup below.' +
                        '</p>';
                }
                if (btn) {
                    btn.innerHTML = '<span>▶️</span> Start Camera';
                    btn.className = 'btn btn-sm btn-primary';
                }
                isCameraActive = false;
            });
        } catch (e) {
            console.error('FitCoach: Error initializing camera:', e);
            if (prompt) prompt.style.display = 'block';
        }
    }

    function stopCameraScanner() {
        if (html5QrCode && isCameraActive) {
            html5QrCode.stop().then(function() {
                html5QrCode.clear();
                isCameraActive = false;
                var btn = document.getElementById('btnToggleCamera');
                var prompt = document.getElementById('cameraInactivePrompt');
                var status = document.getElementById('scannerStatusText');

                if (btn) {
                    btn.innerHTML = '<span>▶️</span> Start Camera';
                    btn.className = 'btn btn-sm btn-primary';
                }
                if (prompt) prompt.style.display = 'block';
                if (status) status.textContent = '💡 Works with standard UPC, EAN-13, and EAN-8 barcodes.';
            }).catch(function(err) {
                console.warn('FitCoach: Error stopping camera:', err);
                isCameraActive = false;
            });
        }
    }

    function lookupBarcode(barcode) {
        var clean = barcode.replace(/\D/g, '');
        if (!clean) {
            Utils.showToast('Please enter a valid numeric barcode.', 'warning');
            return;
        }

        var status = document.getElementById('scannerStatusText');
        if (status) status.textContent = '🔍 Querying database for barcode: ' + clean + '...';

        fetch('/api/nutrition/barcode/' + encodeURIComponent(clean))
        .then(function(res) {
            return res.json().then(function(data) {
                return { status: res.status, data: data };
            });
        })
        .then(function(result) {
            if (result.status === 200 && result.data && result.data.found && result.data.product) {
                displayProductResult(result.data.product);
                Utils.showToast('Product found: ' + result.data.product.name, 'success');
                if (status) status.textContent = '✅ Product found: ' + result.data.product.name;
            } else {
                Utils.showToast('Barcode ' + clean + ' not found in OpenFoodFacts.', 'error');
                if (status) status.textContent = '❌ Product not found for barcode ' + clean;
            }
        })
        .catch(function(err) {
            console.error('FitCoach: Barcode lookup error:', err);
            Utils.showToast('Network error during barcode lookup.', 'error');
        });
    }

    function displayProductResult(product) {
        currentProduct = product;

        var emptyState = document.getElementById('scanEmptyState');
        var content = document.getElementById('scannedProductContent');
        var servingsInput = document.getElementById('scannedServingsCount');

        if (emptyState) emptyState.style.display = 'none';
        if (content) {
            content.style.display = 'flex';
            content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (servingsInput) servingsInput.value = '1';

        Utils.setText('scannedName', product.name || 'Packaged Product');
        Utils.setText('scannedBarcodeDisplay', 'Barcode: ' + product.barcode);
        Utils.setText('scannedServingSize', product.serving_size ? 'Serving: ' + product.serving_size : 'Per 100g');
        Utils.setText('scannedCals', product.calories + ' kcal');
        Utils.setText('scannedProtein', product.protein + 'g');
        Utils.setText('scannedCarbs', product.carbs + 'g');
        Utils.setText('scannedFat', product.fat + 'g');

        updateScannedTotals();
    }

    function updateScannedTotals() {
        if (!currentProduct) return;

        var servings = parseFloat(document.getElementById('scannedServingsCount').value) || 1;
        servings = Math.max(0.1, servings);

        var totalCals = Math.round(currentProduct.calories * servings);
        Utils.setText('scannedTotalCals', totalCals + ' kcal');
    }

    function logScannedProductToMeals() {
        if (!currentProduct) {
            Utils.showToast('No product selected.', 'error');
            return;
        }

        var meal = document.getElementById('scannedTargetMeal').value || 'lunch';
        var servings = parseFloat(document.getElementById('scannedServingsCount').value) || 1;
        servings = Math.max(0.1, servings);

        var totalCals = Math.round(currentProduct.calories * servings);
        var totalProtein = Math.round(currentProduct.protein * servings * 10) / 10;
        var totalCarbs = Math.round(currentProduct.carbs * servings * 10) / 10;
        var totalFat = Math.round(currentProduct.fat * servings * 10) / 10;

        var entry = {
            id: Utils.generateId(),
            name: currentProduct.name,
            meal: meal,
            calories: totalCals,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            servings: servings,
            servingUnit: currentProduct.serving_size || 'serving',
            barcode: currentProduct.barcode,
            time: new Date().toISOString()
        };

        var today = Utils.getTodayKey();
        Storage.saveMeal(today, entry);

        // Update dashboard
        if (window.FitCoach.Dashboard && window.FitCoach.Dashboard.refresh) {
            window.FitCoach.Dashboard.refresh();
        }

        Utils.showToast('Logged ' + entry.name + ' to ' + meal + ' (' + totalCals + ' kcal)!', 'success');
    }

    function refresh() {
        // Safe refresh; stop camera if active
        if (isCameraActive) {
            stopCameraScanner();
        }
    }

    return {
        init: init,
        refresh: refresh,
        lookupBarcode: lookupBarcode
    };
})();
