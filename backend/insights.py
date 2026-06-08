def generate_insights(scores: dict, raw: dict) -> list[str]:
    insights = []

    thermal_score = scores["thermal_score"]
    wind_score = scores["wind_score"]
    sun_score = scores["sun_score"]
    comfort_score = scores["comfort_score"]

    if thermal_score >= 80:
        insights.append("Comfortable outdoor temperatures for most of the day")
    elif thermal_score >= 60:
        insights.append("Mild heat during peak hours — mornings are most pleasant")
    else:
        insights.append("High heat exposure — outdoor comfort limited in summer")

    if wind_score >= 80:
        insights.append("Pleasant breeze — great for outdoor walking and cafés")
    elif wind_score >= 60:
        insights.append("Moderate wind — comfortable most of the time")
    else:
        insights.append("Strong or calm wind — outdoor comfort can vary")

    if sun_score >= 80:
        insights.append("Well-shaded streets — great for afternoon walks")
    elif sun_score >= 60:
        insights.append("Balanced sunlight — some shade, some open exposure")
    else:
        insights.append("High sun exposure — seek shade during afternoon hours")

    if comfort_score >= 80:
        insights.append("Strong overall outdoor livability — ideal for daily life outside")
    elif comfort_score >= 60:
        insights.append("Good outdoor comfort with some seasonal limitations")
    else:
        insights.append("Limited outdoor livability — best enjoyed in early morning")

    return insights[:3]
