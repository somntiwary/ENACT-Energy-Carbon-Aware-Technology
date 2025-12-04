"""
Generate demo data for testing charts and visualizations
"""

from datetime import datetime, timedelta
import json
import os

def generate_demo_emissions(days: int = 7) -> list:
    """Generate demo emission data for testing charts"""
    demo_data = []
    base_date = datetime.now()
    
    activity_types = ["youtube", "browsing", "gmail", "ott"]
    
    for i in range(days):
        date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Generate 2-5 activities per day
        num_activities = 2 + (i % 4)
        
        for j in range(num_activities):
            activity_type = activity_types[j % len(activity_types)]
            duration = 300 + (j * 120)  # 5-20 minutes
            
            # Simulate emission calculation
            power_rates = {
                "youtube": 15,
                "browsing": 8,
                "gmail": 5,
                "ott": 18
            }
            power = power_rates.get(activity_type, 10)
            energy_kwh = (power * (duration / 3600)) / 1000
            co2_grams = energy_kwh * 475
            
            demo_data.append({
                "date": date,
                "emissions_grams": round(co2_grams, 4),
                "energy_kwh": round(energy_kwh, 6),
                "activity_type": activity_type,
                "duration_seconds": duration
            })
    
    return demo_data

def save_demo_data_to_logs(days: int = 7):
    """Save demo data to log files for testing"""
    demo_data = generate_demo_emissions(days)
    
    # Group by date
    by_date = {}
    for item in demo_data:
        date = item["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(item)
    
    # Save to log files
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    for date, items in by_date.items():
        log_file = os.path.join(log_dir, f"emissions_{date}.json")
        with open(log_file, 'w') as f:
            json.dump(items, f, indent=2)
    
    return len(by_date)

