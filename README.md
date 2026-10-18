# AI Fitness Coach & Nutrition Tracker

AI Fitness Coach & Nutrition Tracker is a web application designed to help users reach their fitness goals through personalized nutrition tracking, calorie and macronutrient calculation, customized workout routines, and optional AI-assisted coaching recommendations.

## Features

- **Personalized Profile Setup**: Calculates BMR and TDEE using the Mifflin-St Jeor equation, with tailored macro distribution based on user fitness goals (fat loss, muscle gain, maintenance).
- **Nutrition Tracking**: Log meals (breakfast, lunch, dinner, snacks), calculate remaining daily targets, and integrate with external APIs (Nutritionix, OpenFoodFacts).
- **Workout Planning**: Generate structured workout plans adapted to user fitness levels, available days, and specific targets.
- **AI Coaching Integration**: Optional AI recommendations powered by the Google Gemini API.
- **RESTful Architecture**: Modular Flask backend using blueprints with validation utilities.

## Prerequisites

- Python 3.9+
- pip (Python package manager)

## Setup Instructions

1. **Clone / Navigate to the project directory**:
   ```bash
   cd c:\Users\aryan\Downloads\ai-fitness-coach
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux / macOS:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` in a text editor and fill in your API keys (optional for local/stub testing).

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   Open [http://localhost:5000](http://localhost:5000) in your web browser.

## Running Tests

Unit and integration tests are powered by `pytest`. Run tests with:

```bash
pytest tests/
```

## API Keys

The app functions with default calculations and local fallbacks, but external APIs can be enabled by setting the following keys in `.env`:

- **Nutritionix API** (`NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY`): Used for food search and detailed nutrient breakdown. Obtain keys at [Nutritionix Developer Portal](https://developer.nutritionix.com/).
- **OpenFoodFacts**: Free open API used for barcode lookup (no API key required).
- **Google Gemini API** (`GEMINI_API_KEY`): Powers AI-assisted workout and coaching recommendations. Obtain a key via Google AI Studio.

## Project Structure Overview

```
ai-fitness-coach/
├── app.py                     # Application factory and entrypoint
├── config.py                  # Configuration loader and feature flags
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── README.md                  # Documentation
├── backend/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── api.py             # General API and health endpoints
│   │   ├── nutrition.py       # Food search and barcode lookup
│   │   ├── workouts.py        # Workout plan generation
│   │   └── profile.py         # Profile validation
│   ├── services/
│   │   ├── __init__.py
│   │   ├── macro_calculator.py# BMR, TDEE, and macro calculations
│   │   ├── workout_generator.py# Workout generation service
│   │   ├── nutrition_api.py   # Nutritionix and OpenFoodFacts client
│   │   └── ai_service.py      # Gemini AI integration service
│   └── utils/
│       ├── __init__.py
│       └── validators.py      # Input validation utilities
└── tests/
    ├── __init__.py
    ├── test_macro_calculator.py
    ├── test_validators.py
    └── test_workout_generator.py
```

## License

MIT License
