"""AI Coaching and Recommendation Service.

Integrates with Google Gemini API for intelligent, personalized fitness and nutrition coaching,
with a built-in expert rule engine fallback when offline or when no API key is provided.
"""

import os
import requests
from config import Config

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-1.5-flash"

SYSTEM_INSTRUCTION = (
    "You are FitCoach AI, an elite, certified strength & conditioning specialist (CSCS) "
    "and sports nutritionist. Provide actionable, science-based, safe, and motivating advice. "
    "Structure your answers clearly using bullet points, short paragraphs, or step-by-step guidance. "
    "Always tailor advice to the user's specific stats, fitness goals, and current progress. "
    "Include an educational takeaway in every response."
)


def call_gemini_api(prompt, system_instruction=None, api_key=None, model=DEFAULT_MODEL, temperature=0.7):
    """Call Google Gemini generateContent REST API.

    Returns the response text string on success, or None on failure.
    """
    key = api_key or Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    if not key:
        return None

    url = f"{GEMINI_API_URL.format(model=model)}?key={key}"
    headers = {"Content-Type": "application/json"}

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 1024
        }
    }

    instruction = system_instruction or SYSTEM_INSTRUCTION
    if instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": instruction}]
        }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
        return None
    except Exception as e:
        # Gracefully handle timeout, connection, or response errors
        print(f"Gemini API error: {e}")
        return None


def build_coaching_prompt(category, user_message=None, profile=None, nutrition=None, workouts=None, progress=None):
    """Build a detailed, context-aware prompt for the AI coach."""
    parts = ["You are reviewing the user's fitness profile and current activity:"]

    # User Profile
    if profile:
        goal = profile.get("goal", "maintenance").replace("_", " ").title()
        weight = profile.get("weight", "Unknown")
        height = profile.get("height", "Unknown")
        age = profile.get("age", "Unknown")
        gender = profile.get("gender", "Unknown")
        act = profile.get("activity_level", "Unknown").replace("_", " ").title()
        days = profile.get("workout_days", "Unknown")
        parts.append(f"- User Profile: {age} yrs, {gender}, {weight} kg, {height} cm.")
        parts.append(f"- Fitness Goal: {goal}. Activity Level: {act}. Training Schedule: {days} days/week.")

    # Nutrition Context
    if nutrition:
        consumed = nutrition.get("consumed", {})
        targets = nutrition.get("targets", {})
        cal_eaten = consumed.get("calories", 0)
        cal_target = targets.get("calories", 0)
        p_eaten = consumed.get("protein", 0)
        p_target = targets.get("protein", 0)
        c_eaten = consumed.get("carbs", 0)
        c_target = targets.get("carbs", 0)
        f_eaten = consumed.get("fat", 0)
        f_target = targets.get("fat", 0)

        parts.append(
            f"- Today's Nutrition: {cal_eaten:.0f}/{cal_target:.0f} kcal "
            f"(Protein: {p_eaten:.0f}/{p_target:.0f}g, Carbs: {c_eaten:.0f}/{c_target:.0f}g, Fat: {f_eaten:.0f}/{f_target:.0f}g)."
        )

    # Workouts Context
    if workouts:
        plan_name = workouts.get("name") or workouts.get("split_type") or "Custom Routine"
        completed = workouts.get("completed_count", 0)
        parts.append(f"- Current Workout Plan: {plan_name}. Total Workouts Completed: {completed}.")

    # Category and Prompt Focus
    parts.append(f"\nFocus Category: {category.upper()}")
    if user_message:
        parts.append(f"User Question/Prompt: \"{user_message}\"")
    else:
        if category == "nutrition":
            parts.append("Provide a concise analysis of today's nutrition targets and 3 actionable meal or snack suggestions.")
        elif category == "workout":
            parts.append("Provide personalized workout optimization, progression strategies, and injury-prevention tips.")
        elif category == "plateau":
            parts.append("Provide evidence-based strategies for breaking through a weight loss or strength plateau.")
        elif category == "recovery":
            parts.append("Provide recovery, sleep hygiene, and mobility recommendations tailored to their training volume.")
        else:
            parts.append("Provide an uplifting daily coaching check-in with one actionable nutrition tip and one workout tip.")

    parts.append("\nDeliver a clear, inspiring, and scientifically accurate response.")
    return "\n".join(parts)


def get_fallback_recommendation(category, user_message=None, profile=None, nutrition=None, workouts=None):
    """Comprehensive, evidence-based rule-engine fallback when Gemini is offline or unconfigured."""
    goal = (profile.get("goal") if profile else "maintenance") or "maintenance"
    weight = float(profile.get("weight", 70)) if profile and profile.get("weight") else 70.0
    workout_days = int(profile.get("workout_days", 4)) if profile and profile.get("workout_days") else 4

    user_query = (user_message or "").lower()

    # Detect keyword inquiries in user questions
    if "creatine" in user_query:
        return (
            "### 💊 Creatine Monohydrate Guide\n"
            "- **Dosage:** 3–5g of Creatine Monohydrate daily at any consistent time of day.\n"
            "- **Loading Phase:** Optional (20g/day for 5–7 days speeds saturation, but 3–5g daily achieves saturation in ~3 weeks with zero digestive discomfort).\n"
            "- **Key Benefits:** Increases intramuscular phosphocreatine stores, directly improving ATP regeneration during high-intensity lifting and sprinting.\n"
            "- **Tip:** Stay properly hydrated, as creatine draws water into muscle cells (intracellular hydration)."
        )

    if "cardio" in user_query:
        return (
            "### 🏃 Cardio Strategy for Your Goals\n"
            "- **Timing:** Perform lifting *before* cardio if muscle retention/hypertrophy is your priority, or on alternate days.\n"
            "- **Type:** Low-Intensity Steady State (LISS), like incline treadmill walking or cycling (120–140 bpm), minimizes interference with muscle recovery.\n"
            "- **Dose:** 2–3 sessions of 20–30 minutes weekly provides cardiovascular benefits without raising cortisol or impairing leg recovery.\n"
            "- **High-Intensity Interval Training (HIIT):** Limit to 1–2 brief sessions (15–20 mins) weekly to avoid overtaxing your central nervous system."
        )

    if "protein" in user_query or "shake" in user_query or "whey" in user_query:
        min_p = round(weight * 1.6)
        opt_p = round(weight * 2.2)
        return (
            f"### 🥩 Protein Optimization Guide\n"
            f"- **Your Daily Target:** Based on your {weight:.0f}kg body weight, aim for **{min_p}g to {opt_p}g** of protein daily.\n"
            "- **Distribution:** Spread protein across 3–5 meals with ~25–40g per meal containing at least 2.5–3g leucine to trigger muscle protein synthesis (MPS).\n"
            "- **High-Quality Sources:** Chicken breast, egg whites, Greek yogurt, canned tuna, whey isolate, tofu, and lean beef.\n"
            "- **Timing:** The total 24-hour intake is 80% of the battle; having 25–35g within 1–2 hours post-training provides optimal recovery."
        )

    if "sore" in user_query or "doms" in user_query or "recovery" in user_query or category == "recovery":
        return (
            "### 🧘 Recovery & Soreness Management (DOMS)\n"
            "- **Active Recovery:** Light walking, easy cycling, or bodyweight mobility for 15–20 minutes increases blood flow and clears metabolic waste.\n"
            "- **Hydration Target:** Drink at least 35–40ml of water per kg of body weight daily + 500ml per hour of heavy sweating.\n"
            "- **Sleep Hygiene:** 7–9 hours of quality sleep is the #1 driver of growth hormone release and tissue repair.\n"
            "- **Nutrition:** Prioritize 25–30g of protein and complex carbs after workouts to replenish glycogen and accelerate repair."
        )

    if category == "nutrition":
        consumed = nutrition.get("consumed", {}) if nutrition else {}
        targets = nutrition.get("targets", {}) if nutrition else {}
        cal_eaten = consumed.get("calories", 0)
        cal_target = targets.get("calories", 2000)
        p_eaten = consumed.get("protein", 0)
        p_target = targets.get("protein", 140)

        cal_diff = cal_target - cal_eaten
        p_diff = p_target - p_eaten

        advice = [
            f"### 🥗 Nutrition Coach Analysis ({goal.replace('_', ' ').title()})"
        ]

        if cal_diff > 300:
            advice.append(f"- **Calorie Deficit Alert:** You are currently {cal_diff:.0f} kcal below your daily target. Ensure you fuel properly so your body doesn't break down lean tissue.")
        elif cal_diff < -200:
            advice.append(f"- **Calorie Surplus Notice:** You are {abs(cal_diff):.0f} kcal above your daily target. Focus on high-volume, fiber-rich vegetables to stay satiated without surplus calories.")
        else:
            advice.append(f"- **Calorie Intake on Track:** You are within target range ({cal_eaten:.0f} / {cal_target:.0f} kcal). Consistent calorie adherence is key to steady progress.")

        if p_diff > 25:
            advice.append(f"- **Protein Focus:** You still need **{p_diff:.0f}g of protein** today. Consider a scoop of whey protein (24g) or a cup of Greek yogurt (20g) to close the gap.")
        else:
            advice.append("- **Protein Status:** Great job meeting your daily amino acid requirements for muscle preservation and recovery.")

        advice.append("- **Hydration Check:** Keep a reusable water bottle nearby; target at least 2.5–3.0 liters of fluids today.")
        return "\n".join(advice)

    if category == "workout":
        return (
            f"### 🏋️ Workout Progression Strategies ({workout_days} Days/Week)\n"
            "- **Progressive Overload:** Track your weights and reps in every session. Strive to add 1 rep or 1.25–2.5kg per exercise weekly.\n"
            "- **RPE & Intensity:** Keep most compound lifts at RPE 7–9 (leaving 1–2 reps in reserve before muscular failure) to maximize mechanical tension with manageable fatigue.\n"
            "- **Warm-up Protocol:** Spend 5–8 minutes performing dynamic joint circles and 2–3 ramp-up sets before touching your working weights.\n"
            "- **Rest Intervals:** Rest 2–3 minutes between heavy compound lifts (squats, deadlifts, presses) and 60–90 seconds on isolation exercises."
        )

    if category == "plateau":
        return (
            "### 🧗 Plateau-Breaking Blueprint\n"
            "- **Step 1: Recalculate Your Energy Expenditure:** As you lose weight, your BMR and TDEE naturally decrease. Recalculate your profile if your weight has changed by >3kg.\n"
            "- **Step 2: Track NEAT (Non-Exercise Activity Thermogenesis):** Often during prolonged deficits, unconscious movement drops. Set an 8,000–10,000 daily step baseline.\n"
            "- **Step 3: Consider a 48-Hour Refeed / Diet Break:** Bringing calories up to maintenance for 2–3 days restores leptin, normalizes thyroid hormones, and refills muscle glycogen.\n"
            "- **Step 4: Rotate Exercise Variations:** Swap barbell back squats for pendulum/hack squats or barbell bench for dumbbell incline to introduce a novel stimulus."
        )

    # General Coaching / Motivation
    goal_tips = {
        "fat_loss": "Prioritize high-volume foods (leafy greens, potatoes, lean meats) that keep your stomach full while maintaining a 300–500 kcal deficit.",
        "muscle_gain": "Ensure a consistent 200–300 kcal surplus and prioritize progressive overload on your core compound movements.",
        "maintenance": "Focus on athletic performance, improving form, and optimizing your strength-to-bodyweight ratios."
    }

    selected_tip = goal_tips.get(goal, goal_tips["maintenance"])

    return (
        f"### 💡 FitCoach Daily Motivation & Advice\n"
        f"- **Focus for {goal.replace('_', ' ').title()}:** {selected_tip}\n"
        f"- **Consistency Over Perfection:** 80% consistency executed for 6 months beats 100% perfection followed for 2 weeks.\n"
        f"- **Hydration & Sleep:** Recovery happens outside the gym. Hit 7+ hours of quality sleep tonight to fuel tomorrow's workout.\n"
        f"- **Quick Tip:** Prepare your post-workout meal or clothes the night before to eliminate decision fatigue."
    )


def generate_coaching_response(category="general", user_message=None, context=None, api_key=None):
    """Generate intelligent coaching advice via Gemini API with expert rule-engine fallback.

    Returns a dict with:
        reply: str (Markdown formatted response)
        source: 'gemini' | 'builtin'
        model: str
        category: str
        status: 'success'
    """
    ctx = context or {}
    profile = ctx.get("profile")
    nutrition = ctx.get("nutrition")
    workouts = ctx.get("workouts")
    progress = ctx.get("progress")

    # Try Gemini if API key is provided or present in config/env
    key = api_key or Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    if key:
        prompt = build_coaching_prompt(
            category=category,
            user_message=user_message,
            profile=profile,
            nutrition=nutrition,
            workouts=workouts,
            progress=progress
        )
        gemini_result = call_gemini_api(prompt, api_key=key)
        if gemini_result:
            return {
                "reply": gemini_result,
                "source": "gemini",
                "model": DEFAULT_MODEL,
                "category": category,
                "status": "success"
            }

    # Seamless Fallback to expert rule engine
    fallback_text = get_fallback_recommendation(
        category=category,
        user_message=user_message,
        profile=profile,
        nutrition=nutrition,
        workouts=workouts
    )

    return {
        "reply": fallback_text,
        "source": "builtin",
        "model": "FitCoach Rule Engine",
        "category": category,
        "status": "success",
        "note": "Powered by FitCoach Built-in Expert Engine (configure GEMINI_API_KEY for generative coaching)."
    }


def generate_ai_recommendation(prompt, api_key=None):
    """Backward compatibility helper for early phase stub."""
    res = generate_coaching_response(user_message=prompt, api_key=api_key)
    return res.get("reply")
