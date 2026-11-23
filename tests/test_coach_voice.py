"""Tests for Coach Voice Input / Speech-to-Text feature."""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestCoachVoiceInput:
    """Test frontend HTML and static assets for Voice Input feature."""

    def test_index_contains_voice_input_elements(self, client):
        """Index page should include microphone button, language selector, and listening indicator."""
        resp = client.get('/')
        assert resp.status_code == 200
        html = resp.data.decode('utf-8')

        # Microphone button and controls
        assert 'id="coachMicBtn"' in html
        assert 'id="coachVoiceControls"' in html or 'coach-voice-controls' in html
        assert 'id="coachVoiceLang"' in html
        assert 'id="coachVoiceStatus"' in html
        assert 'id="coachVoiceCancelBtn"' in html

        # Supported languages in dropdown
        assert 'value="en-US"' in html
        assert 'value="en-IN"' in html
        assert 'value="hi-IN"' in html

    def test_style_css_contains_voice_styles(self, client):
        """Style CSS should contain voice status and pulsing recording classes."""
        resp = client.get('/static/css/style.css')
        assert resp.status_code == 200
        css = resp.data.decode('utf-8')

        assert '.coach-voice-status' in css
        assert '.coach-mic-btn' in css
        assert '.coach-mic-btn.recording' in css
        assert 'pulse-ring' in css
        assert '.coach-voice-lang' in css

    def test_coach_js_contains_speech_recognition_logic(self, client):
        """Coach JS should contain speech recognition logic, handlers, and exports."""
        resp = client.get('/static/js/coach.js')
        assert resp.status_code == 200
        js = resp.data.decode('utf-8')

        assert 'SpeechRecognition' in js
        assert 'initSpeechRecognition' in js
        assert 'toggleVoiceRecognition' in js
        assert 'startVoiceRecognition' in js
        assert 'stopVoiceRecognition' in js
        assert 'cancelVoiceRecognition' in js
        assert 'en-US' in js
        assert 'hi-IN' in js

    def test_storage_js_contains_voice_lang_methods(self, client):
        """Storage JS should provide getVoiceLang and setVoiceLang methods."""
        resp = client.get('/static/js/storage.js')
        assert resp.status_code == 200
        js = resp.data.decode('utf-8')

        assert 'getVoiceLang' in js
        assert 'setVoiceLang' in js
        assert 'fitcoach_voice_lang' in js
