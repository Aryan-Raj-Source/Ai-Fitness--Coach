# AI Fitness Coach & Nutrition Tracker

AI Fitness Coach & Nutrition Tracker is a web application designed to help users reach their fitness goals through personalized nutrition tracking, calorie and macronutrient calculation, customized workout routines, and optional AI-assisted coaching recommendations.

## Features

- **Personalized Profile Setup**: Calculates BMR and TDEE using the Mifflin-St Jeor equation, with tailored macro distribution based on user fitness goals (fat loss, muscle gain, maintenance).
- **Nutrition Tracking**: Log meals (breakfast, lunch, dinner, snacks), calculate remaining daily targets, and integrate with external APIs (Nutritionix, OpenFoodFacts).
- **Workout Planning**: Generate structured workout plans adapted to user fitness levels, available days, and specific targets.
- **Barcode Scanner**: Scan product barcodes to instantly look up nutritional data via OpenFoodFacts.
- **Progress Analytics**: Interactive charts and history logs to track weight, calories, and workout streaks over time.
- **AI Coaching Integration**: Optional AI recommendations powered by the Google Gemini API, with built-in expert-rules fallback when no API key is configured.
- **RESTful Architecture**: Modular Flask backend using blueprints with validation utilities.

## Prerequisites

- Python 3.9+
- pip (Python package manager)

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Aryan-Raj-Source/Ai-Fitness--Coach.git
   cd Ai-Fitness--Coach
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
   Open `.env` in a text editor and fill in your API keys (optional — the app works without them using built-in fallbacks).

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   Open [http://localhost:5000](http://localhost:5000) in your web browser.

## Running Tests

Unit and integration tests are powered by `pytest`. Run tests with:

```bash
pip install pytest
pytest tests/ -v
```

## Deploying to Vercel

This project is pre-configured for serverless deployment on [Vercel](https://vercel.com/).

### 1. Import the repository

- Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
- Select the **Ai-Fitness--Coach** repository and click **Import**.

### 2. Configure environment variables

In the Vercel project settings (**Settings → Environment Variables**), add the following keys. All are **optional** — the app runs with built-in fallbacks when they are absent.

| Variable               | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `SECRET_KEY`           | Flask session secret (use a random string)   |
| `GEMINI_API_KEY`       | Google Gemini API — enables AI coaching       |
| `NUTRITIONIX_APP_ID`   | Nutritionix API — enables rich food search    |
| `NUTRITIONIX_API_KEY`  | Nutritionix API key                           |

### 3. Deploy

Click **Deploy**. Vercel will detect `vercel.json`, build the Python serverless function, and give you a live URL.

> **Tip:** Every push to `main` will automatically re-deploy the app.

## API Keys

The app functions with default calculations and local fallbacks, but external APIs can be enabled by setting the following keys:

- **Nutritionix API** (`NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY`): Used for food search and detailed nutrient breakdown. Obtain keys at [Nutritionix Developer Portal](https://developer.nutritionix.com/).
- **OpenFoodFacts**: Free open API used for barcode lookup (no API key required).
- **Google Gemini API** (`GEMINI_API_KEY`): Powers AI-assisted workout and coaching recommendations. Obtain a key via [Google AI Studio](https://aistudio.google.com/).

## Project Structure Overview

```
ai-fitness-coach/
├── app.py                     # Application factory and WSGI export
├── config.py                  # Configuration loader and feature flags
├── requirements.txt           # Python dependencies
├── vercel.json                # Vercel deployment configuration
├── .vercelignore              # Files excluded from Vercel builds
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── README.md                  # Documentation
├── api/
│   └── index.py               # Vercel serverless entrypoint
├── backend/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── api.py             # General API and health endpoints
│   │   ├── nutrition.py       # Food search and barcode lookup
│   │   ├── workouts.py        # Workout plan generation
│   │   ├── profile.py         # Profile validation
│   │   └── coach.py           # AI coaching endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── macro_calculator.py# BMR, TDEE, and macro calculations
│   │   ├── workout_generator.py# Workout generation service
│   │   ├── nutrition_api.py   # Nutritionix and OpenFoodFacts client
│   │   └── ai_service.py      # Gemini AI integration service
│   └── utils/
│       ├── __init__.py
│       └── validators.py      # Input validation utilities
├── static/
│   ├── css/                   # Stylesheets
│   └── js/                    # Frontend modules
├── templates/
│   └── index.html             # Single-page application shell
└── tests/
    ├── __init__.py
    ├── test_macro_calculator.py
    ├── test_validators.py
    └── test_workout_generator.py
```

## License

MIT License
