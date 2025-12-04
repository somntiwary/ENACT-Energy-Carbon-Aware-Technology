"""
CodeCarbon Integration Service
Provides real-time carbon emission tracking using CodeCarbon library
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, List
try:
    from codecarbon import EmissionsTracker
    from codecarbon.core.config import get_default_params
    CODECARBON_AVAILABLE = True
except ImportError:
    CODECARBON_AVAILABLE = False
    # CodeCarbon not installed - silently use fallback calculations


class CodeCarbonService:
    """Service for CodeCarbon integration"""
    
    def __init__(self):
        self.tracker = None
        self.is_tracking = False
    
    def start_tracking(self, activity_type: str = "code_execution") -> bool:
        """Start CodeCarbon tracking"""
        if not CODECARBON_AVAILABLE:
            return False
        
        try:
            output_dir = os.path.join("logs", "codecarbon")
            os.makedirs(output_dir, exist_ok=True)
            
            self.tracker = EmissionsTracker(
                output_dir=output_dir,
                tracking_mode="process",  # Track this process
                measure_power_secs=10,  # Measure every 10 seconds
                log_level="error"
            )
            self.tracker.start()
            self.is_tracking = True
            return True
        except Exception as e:
            print(f"CodeCarbon tracking start error: {str(e)}")
            return False
    
    def stop_tracking(self) -> Optional[Dict]:
        """Stop tracking and return emission data"""
        if not self.is_tracking or not self.tracker:
            return None
        
        try:
            self.tracker.stop()
            self.is_tracking = False
            
            # Get emission data from tracker
            emissions_data = self.tracker.final_emissions_data
            
            if emissions_data:
                return {
                    "energy_kwh": emissions_data.get("energy_consumed_kWh", 0),
                    "co2_grams": emissions_data.get("emissions", 0) * 1000,  # Convert kg to grams
                    "duration_seconds": emissions_data.get("duration", 0),
                    "country_iso_code": emissions_data.get("country_iso_code", "USA"),
                    "region": emissions_data.get("region", "Unknown"),
                    "cloud_provider": emissions_data.get("cloud_provider", "N/A"),
                    "cloud_region": emissions_data.get("cloud_region", "N/A")
                }
        except Exception as e:
            print(f"CodeCarbon tracking stop error: {str(e)}")
        
        return None
    
    def get_current_emissions(self) -> Optional[Dict]:
        """Get current emission estimates without stopping"""
        if not self.is_tracking or not self.tracker:
            return None
        
        try:
            # CodeCarbon doesn't provide real-time estimates easily
            # Return estimated based on runtime
            runtime_seconds = self.tracker._total_runtime
            if runtime_seconds > 0:
                # Rough estimate based on average power
                estimated_energy = (runtime_seconds / 3600) * 0.05  # ~50W average
                estimated_co2 = estimated_energy * 0.475  # kg to grams
                return {
                    "energy_kwh": estimated_energy,
                    "co2_grams": estimated_co2 * 1000,
                    "duration_seconds": runtime_seconds
                }
        except Exception as e:
            print(f"CodeCarbon get emissions error: {str(e)}")
        
        return None
    
    @staticmethod
    def get_grid_intensity(country_code: str = "USA") -> float:
        """Get grid carbon intensity for a country (g CO2/kWh)"""
        # Based on CodeCarbon and IEA data
        INTENSITIES = {
            "USA": 475,
            "GBR": 233,  # UK
            "FRA": 58,   # France (nuclear)
            "DEU": 385,  # Germany
            "CHN": 537,  # China
            "IND": 724,  # India
            "JPN": 465,  # Japan
            "AUS": 720,  # Australia
            "CAN": 140,  # Canada (hydro)
            "BRA": 84,   # Brazil (hydro)
        }
        return INTENSITIES.get(country_code.upper(), 475)  # Default to global average
    
    @staticmethod
    def estimate_from_codecarbon_benchmarks(
        activity_type: str,
        duration_seconds: float,
        cpu_percent: float = 50.0
    ) -> Dict:
        """Estimate emissions using CodeCarbon benchmark data"""
        # CodeCarbon benchmarks for different activities
        BENCHMARKS = {
            "youtube": {"base_watts": 12, "cpu_factor": 0.3},
            "ott": {"base_watts": 15, "cpu_factor": 0.4},
            "browsing": {"base_watts": 8, "cpu_factor": 0.2},
            "gmail": {"base_watts": 5, "cpu_factor": 0.1},
            "code_execution": {"base_watts": 40, "cpu_factor": 1.0},
            "idle": {"base_watts": 3, "cpu_factor": 0.05}
        }
        
        benchmark = BENCHMARKS.get(activity_type.lower(), {"base_watts": 10, "cpu_factor": 0.5})
        
        # Calculate power with CPU adjustment
        power_watts = benchmark["base_watts"] + (cpu_percent / 100) * benchmark["cpu_factor"] * 20
        
        # Calculate energy
        duration_hours = duration_seconds / 3600
        energy_kwh = (power_watts * duration_hours) / 1000
        
        # Get grid intensity
        grid_intensity = CodeCarbonService.get_grid_intensity()
        co2_grams = energy_kwh * grid_intensity
        
        return {
            "energy_kwh": round(energy_kwh, 6),
            "co2_grams": round(co2_grams, 4),
            "power_watts": round(power_watts, 2),
            "method": "codecarbon_benchmark"
        }


# Global instance
codecarbon_service = CodeCarbonService()

