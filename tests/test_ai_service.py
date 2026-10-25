"""Tests for Phase 7 AI Coaching Service and Coach API routes."""

import pytest
from unittest.mock import patch, MagicMock
from app import create_app
from backend.services.ai_service import (
    build_coaching_prompt,
    get_fallback_recommendation,
    generate_coaching_response,
    call_gemini_api,
    generate_ai_recommendation
)


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestAIServiceUnit:
    """Unit tests for AI service logic, prompt building, and fallback generation."""

    def test_build_coaching_prompt_contains_profile_context(self):
        profile = {
            'age': 28,
            'gender': 'male',
            'weight': 80,
            'height': 182,
            'goal': 'fat_loss',
            'activity_level': 'moderately_active',
            'workout_days': 4
        }
        nutrition = {
            'consumed': {'calories': 1800, 'protein': 140, 'carbs': 180, 'fat': 50},
            'targets': {'calories': 2200, 'protein': 160, 'carbs': 230, 'fat': 65}
        }
        prompt = build_coaching_prompt('nutrition', user_message="What should I have for dinner?", profile=profile, nutrition=nutrition)
        assert '80 kg' in prompt
        assert 'Fat Loss' in prompt
        assert '1800/2200 kcal' in prompt
        assert 'dinner' in prompt

    def test_get_fallback_nutrition_deficit_notice(self):
        nutrition = {
            'consumed': {'calories': 1200, 'protein': 90},
            'targets': {'calories': 2200, 'protein': 150}
        }
        text = get_fallback_recommendation('nutrition', nutrition=nutrition)
        assert 'Nutrition Coach Analysis' in text
        assert 'Calorie Deficit Alert' in text or 'Protein' in text

    def test_get_fallback_workout_progressive_overload(self):
        text = get_fallback_recommendation('workout')
        assert 'Progressive Overload' in text
        assert 'Rest Intervals' in text

    def test_get_fallback_plateau_strategies(self):
        text = get_fallback_recommendation('plateau')
        assert 'Plateau-Breaking Blueprint' in text
        assert 'NEAT' in text

    def test_get_fallback_recovery_tips(self):
        text = get_fallback_recommendation('recovery')
        assert 'Recovery & Soreness Management' in text
        assert 'Sleep Hygiene' in text

    def test_get_fallback_creatine_query(self):
        text = get_fallback_recommendation('general', user_message='Should I start taking creatine?')
        assert 'Creatine Monohydrate Guide' in text
        assert '3–5g' in text

    def test_get_fallback_cardio_query(self):
        text = get_fallback_recommendation('general', user_message='When should I do cardio?')
        assert 'Cardio Strategy for Your Goals' in text

    def test_generate_coaching_response_fallback_mode(self):
        # Without API key, should use built-in engine seamlessly
        res = generate_coaching_response(category='nutrition')
        assert res['status'] == 'success'
        assert res['source'] == 'builtin'
        assert 'Nutrition Coach Analysis' in res['reply']

    @patch('backend.services.ai_service.requests.post')
    def test_generate_coaching_response_with_gemini_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "Keep pushing! Add 5 lbs to your bench press this week."}]
                    }
                }
            ]
        }
        mock_post.return_value = mock_resp

        res = generate_coaching_response(category='workout', api_key='fake-key')
        assert res['status'] == 'success'
        assert res['source'] == 'gemini'
        assert 'Keep pushing!' in res['reply']

    @patch('backend.services.ai_service.requests.post')
    def test_generate_coaching_response_gemini_error_falls_back(self, mock_post):
        mock_post.side_effect = Exception("API rate limited or network failure")

        res = generate_coaching_response(category='workout', api_key='fake-key')
        assert res['status'] == 'success'
        assert res['source'] == 'builtin'
        assert 'Workout Progression' in res['reply']

    def test_generate_ai_recommendation_backward_compat(self):
        text = generate_ai_recommendation("How to improve cardio?")
        assert isinstance(text, str)
        assert len(text) > 0


class TestCoachRoutes:
    """Test the Flask HTTP routes for the coach blueprint."""

    def test_coach_status_route(self, client):
        resp = client.get('/api/coach/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['enabled'] is True
        assert 'has_gemini' in data
        assert 'model' in data

    def test_coach_tips_route_all(self, client):
        resp = client.get('/api/coach/tips')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'quick_prompts' in data
        assert len(data['quick_prompts']) >= 4

    def test_coach_tips_route_filtered(self, client):
        resp = client.get('/api/coach/tips?category=workout')
        assert resp.status_code == 200
        data = resp.get_json()
        prompts = data['quick_prompts']
        assert all(p['category'] == 'workout' for p in prompts)

    def test_coach_ask_route(self, client):
        payload = {
            'category': 'nutrition',
            'message': 'What is the best post-workout protein?',
            'context': {
                'profile': {'goal': 'muscle_gain', 'weight': 75}
            }
        }
        resp = client.post('/api/coach/ask', json=payload)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'success'
        assert 'reply' in data
        assert 'source' in data

    def test_coach_quick_analysis_route(self, client):
        payload = {
            'nutrition': {
                'consumed': {'calories': 2050, 'protein': 150},
                'targets': {'calories': 2000, 'protein': 150}
            },
            'workouts': {'completed_today': True},
            'profile': {'goal': 'maintenance'}
        }
        resp = client.post('/api/coach/quick-analysis', json=payload)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'status' in data
        assert 'highlights' in data
        assert len(data['highlights']) >= 2


class TestCoachPageAndAssets:
    """Test that the frontend HTML includes AI Coach elements and serves static assets."""

    def test_index_contains_coach_section(self, client):
        resp = client.get('/')
        assert resp.status_code == 200
        html = resp.data.decode('utf-8')
        assert 'section-coach' in html
        assert 'coachInput' in html
        assert 'coachSendBtn' in html
        assert 'coachStatusBadge' in html
        assert 'coachMessagesContainer' in html

    def test_index_nav_has_coach_link(self, client):
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'data-section="coach"' in html
        assert 'AI Coach' in html

    def test_coach_js_asset_served(self, client):
        resp = client.get('/static/js/coach.js')
        assert resp.status_code == 200
        content = resp.data.decode('utf-8')
        assert 'FitCoach.Coach' in content
        assert 'sendMessage' in content
        assert 'formatMarkdown' in content

