from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config import Config
from backend.routes.api import api_bp
from backend.routes.nutrition import nutrition_bp
from backend.routes.workouts import workouts_bp
from backend.routes.profile import profile_bp
from backend.routes.coach import coach_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(nutrition_bp, url_prefix='/api/nutrition')
    app.register_blueprint(workouts_bp, url_prefix='/api/workouts')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(coach_bp, url_prefix='/api/coach')

    @app.route('/')
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


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
