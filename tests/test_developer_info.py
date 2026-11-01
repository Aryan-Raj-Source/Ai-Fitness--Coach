"""Tests for Know Your Developer section and modal."""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestDeveloperSection:
    """Test Know Your Developer elements in frontend HTML and static assets."""

    def test_index_contains_developer_triggers(self, client):
        """Index page should contain sidebar trigger and footer credit."""
        resp = client.get('/')
        assert resp.status_code == 200
        html = resp.data.decode('utf-8')

        assert 'id="btnKnowDeveloper"' in html
        assert 'Know Your Developer' in html
        assert 'id="btnKnowDeveloperFooter"' in html

    def test_index_contains_developer_modal_and_details(self, client):
        """Developer modal should display required developer details and links."""
        resp = client.get('/')
        assert resp.status_code == 200
        html = resp.data.decode('utf-8')

        # Modal shell
        assert 'id="developerModal"' in html
        assert 'id="devModalClose"' in html
        assert 'id="devModalDismiss"' in html

        # Developer details
        assert 'Designed &amp; Developed by Aryan Raj' in html or 'Designed & Developed by Aryan Raj' in html
        assert 'Aryan Raj' in html
        assert 'B.Tech Computer Science with AI/ML' in html
        assert 'Manipal University Jaipur' in html

        # External links
        assert 'https://github.com/Aryan-Raj-Source' in html
        assert 'https://www.linkedin.com/in/aryan-raj-039832302/' in html

    def test_stylesheet_contains_developer_styles(self, client):
        """Static style.css should contain developer modal classes."""
        resp = client.get('/static/css/style.css')
        assert resp.status_code == 200
        css = resp.data.decode('utf-8')

        assert '.dev-modal' in css
        assert '.dev-trigger-btn' in css
        assert '.dev-avatar' in css
        assert '.dev-byline' in css

    def test_app_js_contains_developer_modal_binding(self, client):
        """Static app.js should bind developer modal events."""
        resp = client.get('/static/js/app.js')
        assert resp.status_code == 200
        js = resp.data.decode('utf-8')

        assert 'bindDeveloperModal' in js
        assert 'developerModal' in js
