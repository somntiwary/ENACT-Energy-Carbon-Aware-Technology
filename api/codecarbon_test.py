"""
CodeCarbon Test Endpoint - Returns actual CodeCarbon output
"""

import time
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from codecarbon import EmissionsTracker
    CODECARBON_AVAILABLE = True
except ImportError:
    CODECARBON_AVAILABLE = False

def test_codecarbon_tracking(duration_seconds: float = 5.0):
    """
    Test CodeCarbon tracking and return actual emissions data
    """
    if not CODECARBON_AVAILABLE:
        return {
            "error": "CodeCarbon not installed",
            "status": "not_available",
            "message": "Install with: pip install codecarbon"
        }
    
    try:
        # Create output directory
        output_dir = os.path.join("logs", "codecarbon")
        os.makedirs(output_dir, exist_ok=True)
        
        # Start tracking
        tracker = EmissionsTracker(
            output_dir=output_dir,
            tracking_mode="process",
            measure_power_secs=1,  # Measure every second for faster results
            log_level="error",
            save_to_file=False,  # Don't save to file for testing
            country_iso_code="USA"  # Default country
        )
        
        print(f"Starting CodeCarbon tracking for {duration_seconds} seconds...")
        tracker.start()
        
        # Simulate some work
        start_time = time.time()
        while time.time() - start_time < duration_seconds:
            # Do some CPU work
            _ = sum(range(10000))
            time.sleep(0.1)
        
        # Stop tracking
        tracker.stop()
        
        # Get emission data
        emissions_data = tracker.final_emissions_data
        
        if emissions_data:
            # Format the output
            result = {
                "status": "success",
                "codecarbon_version": getattr(tracker, '_codecarbon_version', 'unknown'),
                "tracking_duration_seconds": duration_seconds,
                "emissions_data": {
                    "energy_consumed_kwh": round(emissions_data.get("energy_consumed_kWh", 0), 6),
                    "emissions_kg": round(emissions_data.get("emissions", 0), 6),
                    "emissions_grams": round(emissions_data.get("emissions", 0) * 1000, 4),
                    "duration_seconds": round(emissions_data.get("duration", duration_seconds), 2),
                    "country_iso_code": emissions_data.get("country_iso_code", "USA"),
                    "region": emissions_data.get("region", "Unknown"),
                    "cloud_provider": emissions_data.get("cloud_provider", "N/A"),
                    "cloud_region": emissions_data.get("cloud_region", "N/A"),
                    "cpu_model": emissions_data.get("cpu_model", "Unknown"),
                    "cpu_power_watts": emissions_data.get("cpu_power", 0),
                    "ram_power_watts": emissions_data.get("ram_power", 0),
                    "gpu_power_watts": emissions_data.get("gpu_power", 0),
                },
                "raw_data": emissions_data  # Include raw data for debugging
            }
            return result
        else:
            return {
                "status": "error",
                "message": "No emissions data returned from CodeCarbon",
                "error": "CodeCarbon tracker did not return data"
            }
            
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": f"CodeCarbon tracking error: {str(e)}",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    print("=" * 60)
    print("CodeCarbon API Test - Direct Output")
    print("=" * 60)
    
    if not CODECARBON_AVAILABLE:
        print("❌ CodeCarbon not installed!")
        print("   Install with: pip install codecarbon")
    else:
        print("✅ CodeCarbon is installed")
        print("\nRunning CodeCarbon tracking test (5 seconds)...")
        
        result = test_codecarbon_tracking(5.0)
        
        print("\n" + "=" * 60)
        print("CodeCarbon Output:")
        print("=" * 60)
        import json
        print(json.dumps(result, indent=2))

