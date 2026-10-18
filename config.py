import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'

    # Nutritionix API
    NUTRITIONIX_APP_ID = os.getenv('NUTRITIONIX_APP_ID', '')
    NUTRITIONIX_API_KEY = os.getenv('NUTRITIONIX_API_KEY', '')

    # Gemini API
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

    @classmethod
    def has_nutritionix(cls):
        return bool(cls.NUTRITIONIX_APP_ID and cls.NUTRITIONIX_API_KEY)

    @classmethod
    def has_gemini(cls):
        return bool(cls.GEMINI_API_KEY)
