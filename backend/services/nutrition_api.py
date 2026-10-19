"""External and local nutrition API client.

Supports Nutritionix, OpenFoodFacts, and a comprehensive local food database.
"""

import requests
import re

# Comprehensive built-in database of common foods with accurate macros
COMMON_FOODS = [
    # Proteins & Meats
    {"id": "food_1", "name": "Chicken Breast (Cooked)", "calories": 165, "protein": 31.0, "carbs": 0.0, "fat": 3.6, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_2", "name": "Chicken Thigh (Skinless, Cooked)", "calories": 209, "protein": 26.0, "carbs": 0.0, "fat": 10.9, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_3", "name": "Egg (Whole, Large)", "calories": 72, "protein": 6.3, "carbs": 0.4, "fat": 4.8, "serving_size": "1 large (50g)", "serving_unit": "item", "serving_weight_grams": 50},
    {"id": "food_4", "name": "Egg Whites", "calories": 52, "protein": 11.0, "carbs": 0.7, "fat": 0.2, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_5", "name": "Salmon (Wild Atlantic, Cooked)", "calories": 182, "protein": 25.0, "carbs": 0.0, "fat": 8.0, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_6", "name": "Canned Tuna (in Water)", "calories": 116, "protein": 26.0, "carbs": 0.0, "fat": 1.0, "serving_size": "1 can drained (110g)", "serving_unit": "can", "serving_weight_grams": 110},
    {"id": "food_7", "name": "Lean Ground Beef (93/7, Cooked)", "calories": 218, "protein": 26.0, "carbs": 0.0, "fat": 12.0, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_8", "name": "Whey Protein Powder", "calories": 120, "protein": 24.0, "carbs": 3.0, "fat": 1.5, "serving_size": "1 scoop (30g)", "serving_unit": "scoop", "serving_weight_grams": 30},
    {"id": "food_9", "name": "Greek Yogurt (Nonfat, Plain)", "calories": 59, "protein": 10.0, "carbs": 3.6, "fat": 0.4, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_10", "name": "Cottage Cheese (Low Fat 2%)", "calories": 81, "protein": 11.0, "carbs": 4.5, "fat": 2.3, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_11", "name": "Tofu (Firm)", "calories": 83, "protein": 10.0, "carbs": 2.0, "fat": 5.0, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},

    # Carbohydrates & Grains
    {"id": "food_12", "name": "White Rice (Cooked)", "calories": 130, "protein": 2.7, "carbs": 28.0, "fat": 0.3, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_13", "name": "Brown Rice (Cooked)", "calories": 112, "protein": 2.6, "carbs": 23.5, "fat": 0.9, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_14", "name": "Oatmeal (Rolled Oats, Dry)", "calories": 150, "protein": 5.0, "carbs": 27.0, "fat": 2.5, "serving_size": "1/2 cup dry (40g)", "serving_unit": "cup", "serving_weight_grams": 40},
    {"id": "food_15", "name": "Sweet Potato (Baked)", "calories": 90, "protein": 2.0, "carbs": 21.0, "fat": 0.2, "serving_size": "1 medium (100g)", "serving_unit": "item", "serving_weight_grams": 100},
    {"id": "food_16", "name": "White Potato (Baked with skin)", "calories": 93, "protein": 2.5, "carbs": 21.0, "fat": 0.1, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_17", "name": "Whole Wheat Bread", "calories": 69, "protein": 3.6, "carbs": 12.0, "fat": 0.9, "serving_size": "1 slice (28g)", "serving_unit": "slice", "serving_weight_grams": 28},
    {"id": "food_18", "name": "Pasta (Cooked)", "calories": 158, "protein": 5.8, "carbs": 31.0, "fat": 0.9, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_19", "name": "Quinoa (Cooked)", "calories": 120, "protein": 4.4, "carbs": 21.3, "fat": 1.9, "serving_size": "100g", "serving_unit": "g", "serving_weight_grams": 100},
    {"id": "food_20", "name": "Bagel (Plain)", "calories": 260, "protein": 10.0, "carbs": 50.0, "fat": 1.5, "serving_size": "1 medium bagel (90g)", "serving_unit": "item", "serving_weight_grams": 90},

    # Healthy Fats & Oils
    {"id": "food_21", "name": "Olive Oil (Extra Virgin)", "calories": 119, "protein": 0.0, "carbs": 0.0, "fat": 14.0, "serving_size": "1 tbsp (14g)", "serving_unit": "tbsp", "serving_weight_grams": 14},
    {"id": "food_22", "name": "Peanut Butter (Natural)", "calories": 188, "protein": 8.0, "carbs": 7.0, "fat": 16.0, "serving_size": "2 tbsp (32g)", "serving_unit": "tbsp", "serving_weight_grams": 32},
    {"id": "food_23", "name": "Almonds (Raw)", "calories": 164, "protein": 6.0, "carbs": 6.0, "fat": 14.0, "serving_size": "1 oz (28g)", "serving_unit": "oz", "serving_weight_grams": 28},
    {"id": "food_24", "name": "Avocado", "calories": 160, "protein": 2.0, "carbs": 8.5, "fat": 14.7, "serving_size": "1/2 avocado (100g)", "serving_unit": "item", "serving_weight_grams": 100},
    {"id": "food_25", "name": "Walnuts", "calories": 185, "protein": 4.3, "carbs": 3.9, "fat": 18.5, "serving_size": "1 oz (28g)", "serving_unit": "oz", "serving_weight_grams": 28},
    {"id": "food_26", "name": "Chia Seeds", "calories": 138, "protein": 4.7, "carbs": 12.0, "fat": 8.7, "serving_size": "1 oz (28g)", "serving_unit": "oz", "serving_weight_grams": 28},

    # Fruits & Vegetables
    {"id": "food_27", "name": "Banana", "calories": 105, "protein": 1.3, "carbs": 27.0, "fat": 0.3, "serving_size": "1 medium (118g)", "serving_unit": "item", "serving_weight_grams": 118},
    {"id": "food_28", "name": "Apple", "calories": 95, "protein": 0.5, "carbs": 25.0, "fat": 0.3, "serving_size": "1 medium (182g)", "serving_unit": "item", "serving_weight_grams": 182},
    {"id": "food_29", "name": "Blueberries", "calories": 84, "protein": 1.1, "carbs": 21.0, "fat": 0.5, "serving_size": "1 cup (148g)", "serving_unit": "cup", "serving_weight_grams": 148},
    {"id": "food_30", "name": "Strawberries", "calories": 49, "protein": 1.0, "carbs": 11.7, "fat": 0.5, "serving_size": "1 cup (152g)", "serving_unit": "cup", "serving_weight_grams": 152},
    {"id": "food_31", "name": "Broccoli (Cooked)", "calories": 55, "protein": 3.7, "carbs": 11.0, "fat": 0.6, "serving_size": "1 cup (156g)", "serving_unit": "cup", "serving_weight_grams": 156},
    {"id": "food_32", "name": "Spinach (Raw)", "calories": 7, "protein": 0.9, "carbs": 1.1, "fat": 0.1, "serving_size": "1 cup (30g)", "serving_unit": "cup", "serving_weight_grams": 30},
    {"id": "food_33", "name": "Carrots (Raw)", "calories": 25, "protein": 0.6, "carbs": 5.8, "fat": 0.1, "serving_size": "1 medium (61g)", "serving_unit": "item", "serving_weight_grams": 61},

    # Dairy & Beverages
    {"id": "food_34", "name": "Whole Milk (Cow)", "calories": 149, "protein": 7.7, "carbs": 11.7, "fat": 8.0, "serving_size": "1 cup (244g)", "serving_unit": "cup", "serving_weight_grams": 244},
    {"id": "food_35", "name": "Almond Milk (Unsweetened)", "calories": 30, "protein": 1.0, "carbs": 1.0, "fat": 2.5, "serving_size": "1 cup (240ml)", "serving_unit": "cup", "serving_weight_grams": 240},
    {"id": "food_36", "name": "Cheddar Cheese", "calories": 115, "protein": 7.0, "carbs": 0.4, "fat": 9.5, "serving_size": "1 slice (28g)", "serving_unit": "slice", "serving_weight_grams": 28}
]


def search_local_foods(query, limit=15):
    """Search the built-in verified food database."""
    if not query:
        return []

    q = query.strip().lower()
    terms = q.split()

    exact_matches = []
    partial_matches = []

    for item in COMMON_FOODS:
        name_lower = item['name'].lower()
        if q == name_lower:
            exact_matches.append(item)
        elif all(term in name_lower for term in terms):
            partial_matches.append(item)
        elif any(term in name_lower for term in terms):
            partial_matches.append(item)

    combined = exact_matches + [m for m in partial_matches if m not in exact_matches]
    return combined[:limit]


def search_nutritionix(query, app_id, api_key):
    """Search Nutritionix API using Instant Search."""
    if not query or not app_id or not api_key:
        return []

    url = "https://trackapi.nutritionix.com/v2/search/instant"
    headers = {
        "x-app-id": app_id,
        "x-app-key": api_key,
        "Content-Type": "application/json"
    }
    params = {"query": query}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=4)
        if response.status_code == 200:
            data = response.json()
            results = []
            # Extract common foods
            for item in data.get("common", [])[:10]:
                results.append({
                    "id": f"nx_{item.get('tag_id', item.get('food_name'))}",
                    "name": item.get("food_name", "").title(),
                    "calories": round(item.get("nf_calories", 0)),
                    "protein": round(item.get("nf_protein", 0), 1),
                    "carbs": round(item.get("nf_total_carbohydrate", 0), 1),
                    "fat": round(item.get("nf_total_fat", 0), 1),
                    "serving_size": f"{item.get('serving_qty', 1)} {item.get('serving_unit', 'serving')}",
                    "serving_unit": item.get('serving_unit', 'serving'),
                    "serving_weight_grams": item.get('serving_weight_grams', 100),
                    "source": "nutritionix"
                })
            return results
    except Exception as e:
        print(f"FitCoach: Nutritionix API error: {e}")

    return []


# Sample verified barcodes for testing & offline support
SAMPLE_BARCODES = {
    "737628064502": {
        "barcode": "737628064502",
        "name": "Thai Kitchen - Thin Rice Noodles",
        "calories": 200,
        "protein": 3.0,
        "carbs": 44.0,
        "fat": 1.0,
        "serving_size": "56g",
        "source": "verified_database"
    },
    "3017620422003": {
        "barcode": "3017620422003",
        "name": "Nutella - Hazelnut Spread",
        "calories": 539,
        "protein": 6.3,
        "carbs": 57.5,
        "fat": 30.9,
        "serving_size": "100g",
        "source": "verified_database"
    },
    "5449000000996": {
        "barcode": "5449000000996",
        "name": "Coca-Cola Original",
        "calories": 42,
        "protein": 0.0,
        "carbs": 10.6,
        "fat": 0.0,
        "serving_size": "100ml",
        "source": "verified_database"
    },
    "0049000000443": {
        "barcode": "0049000000443",
        "name": "Sprite - Lemon-Lime Soda",
        "calories": 39,
        "protein": 0.0,
        "carbs": 9.8,
        "fat": 0.0,
        "serving_size": "100ml",
        "source": "verified_database"
    },
    "028400070560": {
        "barcode": "028400070560",
        "name": "Lay's - Classic Potato Chips",
        "calories": 160,
        "protein": 2.0,
        "carbs": 15.0,
        "fat": 10.0,
        "serving_size": "28g (about 15 chips)",
        "source": "verified_database"
    }
}


def lookup_openfoodfacts(barcode):
    """Look up a product on OpenFoodFacts by barcode, with offline sample fallback."""
    if not barcode:
        return None

    clean_barcode = re.sub(r'\D', '', barcode)
    if not clean_barcode:
        return None

    # Check sample cache first for speed & reliability
    if clean_barcode in SAMPLE_BARCODES:
        return SAMPLE_BARCODES[clean_barcode]

    url = f"https://world.openfoodfacts.org/api/v0/product/{clean_barcode}.json"

    try:
        response = requests.get(url, timeout=5, headers={"User-Agent": "FitCoach-App - Version 1.0"})
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                product = data.get("product", {})
                nutriments = product.get("nutriments", {})

                # Calories can be energy-kcal_100g or energy-kcal
                cals = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal") or 0
                protein = nutriments.get("proteins_100g") or nutriments.get("proteins") or 0
                carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates") or 0
                fat = nutriments.get("fat_100g") or nutriments.get("fat") or 0

                name = product.get("product_name") or product.get("product_name_en") or "Scanned Product"
                brand = product.get("brands") or ""
                if brand:
                    name = f"{brand} - {name}"

                return {
                    "barcode": clean_barcode,
                    "name": name,
                    "calories": round(float(cals)),
                    "protein": round(float(protein), 1),
                    "carbs": round(float(carbs), 1),
                    "fat": round(float(fat), 1),
                    "serving_size": product.get("serving_size", "100g"),
                    "image_url": product.get("image_front_small_url") or product.get("image_url") or "",
                    "source": "openfoodfacts"
                }
    except Exception as e:
        print(f"FitCoach: OpenFoodFacts lookup error: {e}")

    return None

