"""
Test CodeCarbon integration
"""

import sys
import os
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from codecarbon import EmissionsTracker
    CODECARBON_AVAILABLE = True
except ImportError:
    CODECARBON_AVAILABLE = False

print("=" * 60)
print("CodeCarbon Integration Test")
print("=" * 60)

if CODECARBON_AVAILABLE:
    print("[OK] CodeCarbon is installed")
    
    try:
        # Test actual CodeCarbon tracking
        output_dir = os.path.join("logs", "codecarbon")
        os.makedirs(output_dir, exist_ok=True)
        
        print("\nStarting CodeCarbon tracking test (3 seconds)...")
        
        tracker = EmissionsTracker(
            output_dir=output_dir,
            tracking_mode="process",
            measure_power_secs=1,
            log_level="error",
            save_to_file=False
        )
        
        tracker.start()
        
        # Do some work for 3 seconds
        start = time.time()
        while time.time() - start < 3:
            _ = sum(range(10000))
            time.sleep(0.1)
        
        tracker.stop()
        
        # Get results
        data = tracker.final_emissions_data
        
        if data:
            print("\n[SUCCESS] CodeCarbon tracking completed!")
            print("\nEmissions Data:")
            # Access attributes directly (EmissionsData object)
            energy_kwh = getattr(data, 'energy_consumed_kWh', 0) or 0
            emissions_kg = getattr(data, 'emissions', 0) or 0
            duration = getattr(data, 'duration', 0) or 0
            country = getattr(data, 'country_iso_code', 'USA') or 'USA'
            cpu_model = getattr(data, 'cpu_model', 'Unknown') or 'Unknown'
            cpu_power = getattr(data, 'cpu_power', 0) or 0
            
            print(f"  Energy consumed: {energy_kwh:.6f} kWh")
            print(f"  CO2 emissions: {emissions_kg:.6f} kg")
            print(f"  CO2 emissions: {emissions_kg * 1000:.4f} grams")
            print(f"  Duration: {duration:.2f} seconds")
            print(f"  Country: {country}")
            print(f"  CPU Model: {cpu_model}")
            print(f"  CPU Power: {cpu_power:.2f} W")
            
            print("\n[OK] CodeCarbon API is working correctly!")
        else:
            print("\n[WARNING] CodeCarbon tracking ran but returned no data")
            
    except Exception as e:
        print(f"\n[ERROR] CodeCarbon tracking error: {str(e)}")
        import traceback
        traceback.print_exc()
        
else:
    print("[WARNING] CodeCarbon is not installed")
    print("  Install with: pip install codecarbon")
    print("  Using fallback calculation methods")

print("=" * 60)

