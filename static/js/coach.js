window.FitCoach = window.FitCoach || {};

window.FitCoach.Coach = (function() {
    'use strict';

    var Utils = window.FitCoach.Utils;
    var Storage = window.FitCoach.Storage;

    var currentCategory = 'general';
    var isThinking = false;
    var coachConfig = {
        has_gemini: false,
        model: 'FitCoach Rule Engine'
    };

    // Speech Recognition state
    var recognition = null;
    var isRecording = false;
    var speechSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var recordingPrefix = '';

    function init() {
        bindEvents();
        initSpeechRecognition();
        checkCoachStatus();
        loadQuickTips();
        renderChatHistory();
        updateContextSummary();
    }

    function refresh() {
        stopVoiceRecognition();
        checkCoachStatus();
        updateContextSummary();
    }

    function bindEvents() {
        // Send button and enter key
        var sendBtn = document.getElementById('coachSendBtn');
        var input = document.getElementById('coachInput');
        var form = document.getElementById('coachForm');

        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleSend();
            });
        } else if (sendBtn) {
            sendBtn.addEventListener('click', handleSend);
        }

        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
        }

        // Category filter pills
        var catPills = document.querySelectorAll('.coach-category-pill');
        catPills.forEach(function(pill) {
            pill.addEventListener('click', function() {
                catPills.forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                currentCategory = this.getAttribute('data-category') || 'general';
                loadQuickTips(currentCategory);
            });
        });

        // Quick analysis trigger
        var analysisBtn = document.getElementById('coachQuickAnalysisBtn');
        if (analysisBtn) {
            analysisBtn.addEventListener('click', runQuickAnalysis);
        }

        // Clear history button
        var clearBtn = document.getElementById('coachClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (confirm('Clear your AI coaching chat history?')) {
                    Storage.clearCoachHistory();
                    renderChatHistory();
                    Utils.showToast('Chat history cleared', 'info');
                }
            });
        }
    }

    function checkCoachStatus() {
        fetch('/api/coach/status')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                coachConfig = data;
                renderStatusBadge();
            })
            .catch(function(err) {
                console.warn('FitCoach: Could not fetch coach status:', err);
            });
    }

    function renderStatusBadge() {
        var badgeEl = document.getElementById('coachStatusBadge');
        if (!badgeEl) return;

        if (coachConfig.has_gemini) {
            badgeEl.className = 'coach-status-badge status-active';
            badgeEl.innerHTML = '<span class="status-dot green"></span> Gemini AI Active <span class="model-tag">(' + Utils.escapeHtml(coachConfig.model) + ')</span>';
        } else {
            badgeEl.className = 'coach-status-badge status-fallback';
            badgeEl.innerHTML = '<span class="status-dot yellow"></span> Built-in Expert Engine <span class="model-tag">(Offline Mode)</span>';
        }
    }

    function updateContextSummary() {
        var summaryEl = document.getElementById('coachContextSummary');
        if (!summaryEl) return;

        var profile = Storage.getProfile();
        var today = Utils.getTodayKey ? Utils.getTodayKey() : Utils.formatDateKey(new Date());
        var nutrition = Storage.getDailyNutrition(today);
        var targets = Storage.getTargets();

        var goal = profile ? (profile.goal || 'maintenance').replace('_', ' ') : 'Not Set';
        var calEaten = nutrition ? Math.round(nutrition.calories) : 0;
        var calTarget = targets ? Math.round(targets.calories) : 2000;
        var pEaten = nutrition ? Math.round(nutrition.protein) : 0;
        var pTarget = targets ? Math.round(targets.protein) : 140;

        summaryEl.innerHTML = (
            '<div class="context-pill"><strong>Goal:</strong> ' + Utils.escapeHtml(goal.toUpperCase()) + '</div>' +
            '<div class="context-pill"><strong>Calories:</strong> ' + calEaten + ' / ' + calTarget + ' kcal</div>' +
            '<div class="context-pill"><strong>Protein:</strong> ' + pEaten + ' / ' + pTarget + 'g</div>'
        );
    }

    function loadQuickTips(category) {
        var url = '/api/coach/tips' + (category && category !== 'all' ? '?category=' + encodeURIComponent(category) : '');
        fetch(url)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                renderQuickChips(data.quick_prompts || []);
            })
            .catch(function(err) {
                console.warn('FitCoach: Could not load tips:', err);
            });
    }

    function renderQuickChips(prompts) {
        var container = document.getElementById('coachQuickChips');
        if (!container) return;

        if (!prompts || prompts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = prompts.map(function(p) {
            return (
                '<button type="button" class="coach-chip" data-prompt="' + Utils.escapeHtml(p.prompt) + '" data-category="' + Utils.escapeHtml(p.category) + '">' +
                    Utils.escapeHtml(p.title) +
                '</button>'
            );
        }).join('');

        container.querySelectorAll('.coach-chip').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var prompt = this.getAttribute('data-prompt');
                var cat = this.getAttribute('data-category') || currentCategory;
                sendMessage(prompt, cat);
            });
        });
    }

    function handleSend() {
        if (isRecording) {
            stopVoiceRecognition();
        }

        var input = document.getElementById('coachInput');
        if (!input || isThinking) return;

        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        sendMessage(text, currentCategory);
    }

    function buildClientContext() {
        var profile = Storage.getProfile();
        var today = Utils.getTodayKey ? Utils.getTodayKey() : Utils.formatDateKey(new Date());
        var meals = Storage.getMealsForDate(today);
        var nutrition = Storage.getDailyNutrition(today);
        var targets = Storage.getTargets();
        var workout = Storage.getWorkoutForDate(today);
        var plans = Storage.getWorkoutPlans();

        return {
            profile: profile,
            nutrition: {
                consumed: nutrition,
                targets: targets,
                meal_count: meals.length
            },
            workouts: {
                plan: plans ? plans[0] : null,
                completed_today: !!(workout && workout.completed)
            }
        };
    }

    function sendMessage(text, category) {
        if (isThinking) return;

        category = category || currentCategory || 'general';

        // 1. Add user message
        var userMsg = {
            id: 'msg_' + Date.now(),
            sender: 'user',
            text: text,
            category: category,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        Storage.addCoachMessage(userMsg);
        appendMessageToUI(userMsg);

        // 2. Set thinking state
        setThinking(true);

        // 3. Prepare payload and call backend
        var context = buildClientContext();
        var payload = {
            message: text,
            category: category,
            context: context
        };

        fetch('/api/coach/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            if (!res.ok) throw new Error('Coach service error: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            setThinking(false);
            var coachMsg = {
                id: 'msg_' + Date.now(),
                sender: 'coach',
                text: data.reply || 'No recommendation received.',
                source: data.source || 'builtin',
                model: data.model || 'FitCoach',
                category: data.category || category,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            Storage.addCoachMessage(coachMsg);
            appendMessageToUI(coachMsg);
            scrollToBottom();
        })
        .catch(function(err) {
            setThinking(false);
            console.error('FitCoach: Error from AI Coach:', err);
            var errorMsg = {
                id: 'msg_' + Date.now(),
                sender: 'coach',
                text: 'Sorry, I encountered a temporary problem generating a response. Please try asking again in a moment.',
                source: 'error',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            appendMessageToUI(errorMsg);
            scrollToBottom();
        });
    }

    function runQuickAnalysis() {
        if (isThinking) return;

        setThinking(true);
        var context = buildClientContext();

        fetch('/api/coach/quick-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(context)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            setThinking(false);
            var highlightsText = (data.highlights || []).map(function(h) {
                return '- ' + h;
            }).join('\n');

            var analysisReply = (
                '### ⚡ Today\'s Fitness Adherence Scorecard\n' +
                '**Status:** ' + data.status + '\n\n' +
                highlightsText + '\n\n' +
                '*Tip: Ask me for tailored meal ideas or workout tweaks based on these numbers!*'
            );

            var coachMsg = {
                id: 'msg_' + Date.now(),
                sender: 'coach',
                text: analysisReply,
                source: 'analysis',
                model: 'FitCoach Analyzer',
                category: 'analysis',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            Storage.addCoachMessage(coachMsg);
            appendMessageToUI(coachMsg);
            scrollToBottom();
        })
        .catch(function(err) {
            setThinking(false);
            Utils.showToast('Could not complete quick analysis', 'error');
        });
    }

    function setThinking(active) {
        isThinking = active;
        var indicator = document.getElementById('coachTypingIndicator');
        var sendBtn = document.getElementById('coachSendBtn');

        if (indicator) {
            indicator.style.display = active ? 'flex' : 'none';
        }
        if (sendBtn) {
            sendBtn.disabled = active;
        }
        if (active) {
            scrollToBottom();
        }
    }

    function renderChatHistory() {
        var container = document.getElementById('coachMessagesContainer');
        if (!container) return;

        var history = Storage.getCoachHistory();
        if (!history || history.length === 0) {
            container.innerHTML = (
                '<div class="coach-welcome-card">' +
                    '<div class="coach-avatar-large">🤖</div>' +
                    '<h3>Hello! I\'m your FitCoach AI.</h3>' +
                    '<p>Ask me anything about your workout programming, nutrition tracking, plateau busting, or recovery strategies. I automatically tailor advice to your profile and today\'s stats.</p>' +
                    '<div class="coach-welcome-actions">' +
                        '<button class="btn btn-sm btn-primary" onclick="window.FitCoach.Coach.askWelcomePrompt(\'nutrition\')">🥗 Review Today\'s Nutrition</button>' +
                        '<button class="btn btn-sm btn-secondary" onclick="window.FitCoach.Coach.askWelcomePrompt(\'workout\')">🏋️ Workout Tips</button>' +
                        '<button class="btn btn-sm btn-secondary" onclick="window.FitCoach.Coach.askWelcomePrompt(\'plateau\')">🧗 Break a Plateau</button>' +
                    '</div>' +
                '</div>'
            );
            return;
        }

        container.innerHTML = '';
        history.forEach(function(msg) {
            appendMessageToUI(msg);
        });
        scrollToBottom();
    }

    function appendMessageToUI(msg) {
        var container = document.getElementById('coachMessagesContainer');
        if (!container) return;

        // Remove welcome card if present
        var welcome = container.querySelector('.coach-welcome-card');
        if (welcome) welcome.remove();

        var isUser = msg.sender === 'user';
        var msgEl = document.createElement('div');
        msgEl.className = 'coach-message ' + (isUser ? 'coach-msg-user' : 'coach-msg-bot');

        var avatar = isUser ? '👤' : '🤖';
        var headerLabel = isUser ? 'You' : (msg.model || 'FitCoach AI');

        var sourceBadge = '';
        if (!isUser && msg.source === 'gemini') {
            sourceBadge = '<span class="msg-badge gemini-badge">Gemini AI</span>';
        } else if (!isUser && msg.source === 'builtin') {
            sourceBadge = '<span class="msg-badge builtin-badge">Expert Engine</span>';
        }

        var formattedContent = isUser ? Utils.escapeHtml(msg.text) : formatMarkdown(msg.text);

        msgEl.innerHTML = (
            '<div class="coach-msg-avatar">' + avatar + '</div>' +
            '<div class="coach-msg-content">' +
                '<div class="coach-msg-header">' +
                    '<span class="coach-msg-sender">' + Utils.escapeHtml(headerLabel) + '</span>' +
                    sourceBadge +
                    '<span class="coach-msg-time">' + Utils.escapeHtml(msg.timestamp || '') + '</span>' +
                '</div>' +
                '<div class="coach-msg-body">' + formattedContent + '</div>' +
            '</div>'
        );

        container.appendChild(msgEl);
    }

    function formatMarkdown(text) {
        if (!text) return '';

        // Basic clean safe markdown parser
        var lines = text.split('\n');
        var html = [];
        var inList = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            // Heading 3
            if (line.indexOf('### ') === 0) {
                if (inList) { html.push('</ul>'); inList = false; }
                html.push('<h4>' + parseInline(line.substring(4)) + '</h4>');
                continue;
            }

            // Bullet list item
            if (line.indexOf('- ') === 0 || line.indexOf('* ') === 0) {
                if (!inList) { html.push('<ul>'); inList = true; }
                html.push('<li>' + parseInline(line.substring(2)) + '</li>');
                continue;
            }

            // Empty line
            if (!line.trim()) {
                if (inList) { html.push('</ul>'); inList = false; }
                continue;
            }

            // Regular paragraph
            if (inList) { html.push('</ul>'); inList = false; }
            html.push('<p>' + parseInline(line) + '</p>');
        }

        if (inList) html.push('</ul>');
        return html.join('');
    }

    function parseInline(str) {
        var escaped = Utils.escapeHtml(str);
        // Bold: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italics: *text*
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Inline code: `text`
        escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');
        return escaped;
    }

    function scrollToBottom() {
        var container = document.getElementById('coachMessagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function askWelcomePrompt(cat) {
        var prompts = {
            nutrition: 'Analyze my current calorie and macronutrient intake today and recommend my next meal.',
            workout: 'How should I optimize my workout progression and sets/reps this week?',
            plateau: 'What are the most effective strategies to break through a fitness plateau?'
        };
        sendMessage(prompts[cat] || 'Give me today\'s top coaching recommendation.', cat);
    }

    // ---- Speech Recognition (Voice Input) ----
    function getSelectedLang() {
        var langSelect = document.getElementById('coachVoiceLang');
        if (langSelect && langSelect.value) {
            return langSelect.value;
        }
        return Storage.getVoiceLang ? Storage.getVoiceLang() : 'en-US';
    }

    function getLangLabel(code) {
        if (code === 'hi-IN') return 'Hindi';
        if (code === 'en-IN') return 'English (IN)';
        return 'English (US)';
    }

    function initSpeechRecognition() {
        var micBtn = document.getElementById('coachMicBtn');
        var langSelect = document.getElementById('coachVoiceLang');
        var cancelBtn = document.getElementById('coachVoiceCancelBtn');

        if (langSelect) {
            var savedLang = Storage.getVoiceLang ? Storage.getVoiceLang() : 'en-US';
            langSelect.value = savedLang;
            langSelect.addEventListener('change', function() {
                var lang = this.value;
                if (Storage.setVoiceLang) {
                    Storage.setVoiceLang(lang);
                }
                if (recognition) {
                    recognition.lang = lang;
                }
                if (isRecording) {
                    var statusText = document.getElementById('coachVoiceStatusText');
                    if (statusText) statusText.textContent = 'Listening (' + getLangLabel(lang) + ')... Speak your query';
                }
            });
        }

        if (micBtn) {
            if (!speechSupported) {
                micBtn.title = 'Voice input not supported in this browser (use Chrome/Edge/Safari)';
                micBtn.classList.add('unsupported');
            }
            micBtn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleVoiceRecognition();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                cancelVoiceRecognition();
            });
        }
    }

    function toggleVoiceRecognition() {
        if (!speechSupported) {
            Utils.showToast('Voice input is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.', 'warning');
            return;
        }

        if (isRecording) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    }

    function startVoiceRecognition() {
        if (isRecording) return;

        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            Utils.showToast('Voice recognition not available', 'error');
            return;
        }

        var input = document.getElementById('coachInput');
        recordingPrefix = input ? input.value.trim() : '';

        var lang = getSelectedLang();

        try {
            if (recognition) {
                try { recognition.abort(); } catch (e) {}
            }

            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = lang;

            recognition.onstart = function() {
                isRecording = true;
                setRecordingUI(true, lang);
            };

            recognition.onresult = function(event) {
                var interimTranscript = '';
                var finalTranscript = '';

                for (var i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                var recognizedText = (finalTranscript + ' ' + interimTranscript).trim();
                if (input && recognizedText) {
                    if (recordingPrefix) {
                        input.value = recordingPrefix + ' ' + recognizedText;
                    } else {
                        input.value = recognizedText;
                    }
                }
            };

            recognition.onerror = function(event) {
                console.warn('FitCoach: Speech recognition error:', event.error);
                var errType = event.error;

                if (errType === 'not-allowed' || errType === 'permission-denied') {
                    Utils.showToast('Microphone permission denied. Please allow microphone access in your browser settings.', 'error');
                } else if (errType === 'no-speech') {
                    Utils.showToast('No speech detected. Please speak closer to your microphone.', 'warning');
                } else if (errType === 'audio-capture') {
                    Utils.showToast('No microphone found. Please connect an audio input device.', 'error');
                } else if (errType === 'network') {
                    Utils.showToast('Speech recognition network error. Please check your internet connection.', 'error');
                } else if (errType !== 'aborted') {
                    Utils.showToast('Voice input notice: ' + errType, 'warning');
                }

                stopVoiceRecognition();
            };

            recognition.onend = function() {
                isRecording = false;
                setRecordingUI(false);
                if (input) {
                    input.focus();
                }
            };

            recognition.start();
        } catch (err) {
            console.error('FitCoach: Failed to start speech recognition:', err);
            Utils.showToast('Could not start voice recognition: ' + (err.message || 'Unknown error'), 'error');
            stopVoiceRecognition();
        }
    }

    function stopVoiceRecognition() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                try { recognition.abort(); } catch (e2) {}
            }
        }
        isRecording = false;
        setRecordingUI(false);
    }

    function cancelVoiceRecognition() {
        var input = document.getElementById('coachInput');
        if (recognition) {
            try {
                recognition.abort();
            } catch (e) {}
        }
        isRecording = false;
        setRecordingUI(false);
        if (input) {
            input.value = recordingPrefix;
            input.focus();
        }
        Utils.showToast('Voice input cancelled', 'info');
    }

    function setRecordingUI(active, lang) {
        var micBtn = document.getElementById('coachMicBtn');
        var statusBox = document.getElementById('coachVoiceStatus');
        var statusText = document.getElementById('coachVoiceStatusText');
        var input = document.getElementById('coachInput');

        if (micBtn) {
            if (active) {
                micBtn.classList.add('recording');
                micBtn.setAttribute('aria-pressed', 'true');
                micBtn.title = 'Listening... Click to stop';
            } else {
                micBtn.classList.remove('recording');
                micBtn.setAttribute('aria-pressed', 'false');
                micBtn.title = 'Click to speak (Voice input)';
            }
        }

        if (statusBox) {
            statusBox.style.display = active ? 'flex' : 'none';
        }

        if (statusText && active) {
            var label = getLangLabel(lang || getSelectedLang());
            statusText.textContent = 'Listening (' + label + ')... Speak your query, then review or edit before sending.';
        }

        if (input) {
            if (active) {
                input.placeholder = 'Listening... Your words will appear here';
            } else {
                input.placeholder = 'Ask about workouts, meal ideas, plateaus, form tips...';
            }
        }
    }

    return {
        init: init,
        refresh: refresh,
        sendMessage: sendMessage,
        askWelcomePrompt: askWelcomePrompt,
        runQuickAnalysis: runQuickAnalysis,
        toggleVoiceRecognition: toggleVoiceRecognition,
        startVoiceRecognition: startVoiceRecognition,
        stopVoiceRecognition: stopVoiceRecognition,
        cancelVoiceRecognition: cancelVoiceRecognition
    };
})();
