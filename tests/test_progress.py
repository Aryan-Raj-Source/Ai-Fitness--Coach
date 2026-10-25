"""Tests for Phase 6 - Progress Analytics endpoints and data management."""
import json
import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestProgressPageLoad:
    """Test that the progress section renders correctly."""

    def test_index_contains_progress_section(self, client):
        """The main page should include the progress analytics section."""
        resp = client.get('/')
        assert resp.status_code == 200
        html = resp.data.decode('utf-8')
        assert 'section-progress' in html
        assert 'Progress Analytics' in html

    def test_progress_has_time_range_controls(self, client):
        """Progress section should have time range selector buttons."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progressRange7' in html
        assert 'progressRange14' in html
        assert 'progressRange30' in html
        assert 'progressRange90' in html

    def test_progress_has_stat_cards(self, client):
        """Progress section should have summary stat cards."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progressCurrentWeight' in html
        assert 'progressStreak' in html
        assert 'progressAvgCalories' in html
        assert 'progressWorkoutsCompleted' in html

    def test_progress_has_charts(self, client):
        """Progress section should have chart canvas elements."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progressWeightChart' in html
        assert 'progressCalorieChart' in html
        assert 'progressMacroChart' in html
        assert 'progressBurnedChart' in html
        assert 'progressWaterChart' in html

    def test_progress_has_workout_log(self, client):
        """Progress section should have workout history log."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progressWorkoutLog' in html

    def test_progress_has_data_management(self, client):
        """Progress section should have data management controls."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progressExportBtn' in html
        assert 'progressImportInput' in html
        assert 'progressClearBtn' in html

    def test_progress_script_loaded(self, client):
        """progress.js should be included in script tags."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'progress.js' in html

    def test_nav_has_progress_link(self, client):
        """Navigation should include a link to the progress section."""
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        assert 'data-section="progress"' in html


class TestProgressStaticAssets:
    """Test that the progress JS file is served correctly."""

    def test_progress_js_served(self, client):
        """Static progress.js should be accessible."""
        resp = client.get('/static/js/progress.js')
        assert resp.status_code == 200
        js = resp.data.decode('utf-8')
        assert 'FitCoach.Progress' in js
        assert 'refresh' in js

    def test_progress_js_has_key_functions(self, client):
        """progress.js should contain expected function implementations."""
        resp = client.get('/static/js/progress.js')
        js = resp.data.decode('utf-8')
        assert 'renderWeightChart' in js
        assert 'renderCalorieChart' in js
        assert 'renderMacroChart' in js
        assert 'exportData' in js
        assert 'importData' in js
        assert 'computeStats' in js


class TestAPIStatus:
    """Test the status endpoint still works after Phase 6 changes."""

    def test_status_endpoint(self, client):
        resp = client.get('/api/status')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'ok'
        assert 'features' in data
