import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config import Config
from backend.routes.api import api_bp
from backend.routes.nutrition import nutrition_bp
from backend.routes.workouts import workouts_bp
from backend.routes.profile import profile_bp
from backend.routes.coach import coach_bp

# Absolute paths so templates/static resolve in serverless and local environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'public', 'static') if os.path.exists(os.path.join(BASE_DIR, 'public', 'static')) else os.path.join(BASE_DIR, 'static')


class VercelPathFixer:
    """WSGI middleware ensuring correct PATH_INFO under Vercel rewrites."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched_path = environ.get('HTTP_X_MATCHED_PATH')
        if matched_path and matched_path not in ('/api/index', '/api/index.py'):
            environ['PATH_INFO'] = matched_path
        elif environ.get('PATH_INFO') in ('/api/index', '/api/index.py'):
            environ['PATH_INFO'] = '/'
        return self.wsgi_app(environ, start_response)


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, 'templates'),
        static_folder=STATIC_DIR,
    )
    app.config.from_object(Config)
    CORS(app)

    # Apply Vercel WSGI path normalization
    app.wsgi_app = VercelPathFixer(app.wsgi_app)

    # ── Security headers (production hardening) ──────────────────────
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # ── Error handlers (JSON API-friendly) ───────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(nutrition_bp, url_prefix='/api/nutrition')
    app.register_blueprint(workouts_bp, url_prefix='/api/workouts')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(coach_bp, url_prefix='/api/coach')

    @app.route('/')
    @app.route('/api/index')
    @app.route('/api/index.py')
    def index():
        return render_template('index.html')

    @app.route('/api/status')
    def status():
        return jsonify({
            'status': 'ok',
            'features': {
                'nutrition_api': Config.has_nutritionix(),
                'ai_coaching': Config.has_gemini()
            }
        })

    return app


# ── WSGI export (used by Vercel and other WSGI servers) ──────────────
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
