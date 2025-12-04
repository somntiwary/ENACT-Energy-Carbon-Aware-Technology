from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager
import os
import json
import ast
import psutil
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
import requests
import radon.complexity as radon_cc
import radon.metrics as radon_metrics

load_dotenv()

# System tracker instance
system_tracker = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - start/stop system tracker"""
    global system_tracker
    
    # Startup
    try:
        from services.system_tracker import SystemTracker
        system_tracker = SystemTracker(api_url="http://localhost:8000/api/track-emission", interval=10)
        system_tracker.start()
        print("✅ System tracker started")
    except Exception as e:
        print(f"⚠️  System tracker could not be started: {e}")
        system_tracker = None
    
    yield
    
    # Shutdown - ensure all data is saved
    print("🛑 Shutting down ENACT backend...")
    
    # Stop system tracker
    if system_tracker:
        system_tracker.stop()
        print("✅ System tracker stopped")
    
    # Note: All log entries are saved immediately via save_log() which uses flush() and fsync()
    # No buffering - data is persisted to disk on every activity tracking
    # Historical data is preserved in logs/emissions_YYYY-MM-DD.json files
    print("✅ All emission logs saved to disk")
    print("✅ Shutdown complete")

app = FastAPI(title="ENACT API", version="1.0.0", lifespan=lifespan)

# Check CodeCarbon availability on startup
try:
    from codecarbon import EmissionsTracker
    CODECARBON_AVAILABLE = True
    print("✅ CodeCarbon is installed and available")
except ImportError:
    CODECARBON_AVAILABLE = False
    print("⚠️  CodeCarbon not installed. Install with: pip install codecarbon")

# CORS middleware
# Allow all origins for browser extensions (chrome-extension://, edge://extension/)
# and frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins including browser extensions
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load API keys - try multiple keys if one fails
OPENROUTER_API_KEY_1 = os.getenv("OPENROUTER_API_KEY", "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")
OPENROUTER_API_KEY_2 = os.getenv("MISTRAL_API_KEY", "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")
OPENROUTER_API_KEY_3 = os.getenv("GEMINI_API_KEY", "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")

# Use first key as default
OPENROUTER_API_KEY = OPENROUTER_API_KEY_1
LOG_DIR = "logs"

# Ensure logs directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# Data models
class CodeInput(BaseModel):
    code: str
    language: str = "python"

class ActivityData(BaseModel):
    activity_type: str  # "youtube", "ott", "browsing", "gmail"
    duration_seconds: float
    metadata: Optional[dict] = {}

class EmissionEstimate(BaseModel):
    activity_type: str
    duration_seconds: float
    estimated_co2_grams: float
    energy_kwh: float
    timestamp: str

# Helper functions
def get_log_file(date: str = None) -> str:
    """Get log file path for today or specified date"""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    return os.path.join(LOG_DIR, f"emissions_{date}.json")

def load_logs(date: str = None) -> List[dict]:
    """Load emission logs from JSON file"""
    log_file = get_log_file(date)
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            try:
                return json.load(f)
            except:
                return []
    return []

def save_log(entry: dict, date: str = None):
    """Save emission log entry to JSON file - ensures data is persisted immediately"""
    try:
        logs = load_logs(date)
        logs.append(entry)
        log_file = get_log_file(date)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        # Write with explicit flush to ensure data is saved
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)
            f.flush()  # Force write to disk
            os.fsync(f.fileno())  # Ensure OS writes to disk
        
        # Verify file was written correctly
        if os.path.exists(log_file):
            # Double-check we can read it back
            try:
                with open(log_file, 'r') as verify_f:
                    verify_data = json.load(verify_f)
                    if len(verify_data) != len(logs):
                        print(f"⚠️  Warning: Log file verification failed for {log_file}")
            except Exception as e:
                print(f"⚠️  Warning: Could not verify log file {log_file}: {e}")
    except Exception as e:
        print(f"❌ Error saving log entry: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail silently - re-raise so caller knows
        raise

def estimate_carbon_footprint(activity_type: str, duration_seconds: float, metadata: dict = {}, use_codecarbon: bool = True) -> dict:
    """
    Estimate carbon footprint based on activity type and duration.
    Uses benchmark emission factors from CodeCarbon and Green Algorithms.
    Enhanced with real-time system metrics for accuracy.
    """
    try:
        # Try to get actual system metrics using psutil (always available)
        import psutil as ps
        cpu_percent = ps.cpu_percent(interval=0.1)
        memory = ps.virtual_memory()
        cpu_load_factor = max(0.5, min(2.0, cpu_percent / 50.0))  # Normalize CPU load
        
        # Check if CodeCarbon is available for enhanced tracking
        if CODECARBON_AVAILABLE:
            from codecarbon import EmissionsTracker
            codecarbon_available = True
        else:
            codecarbon_available = False
    except ImportError:
        # CodeCarbon not installed - silently use fallback
        cpu_load_factor = 1.0
        codecarbon_available = False
    except Exception:
        # Other error - use fallback
        cpu_load_factor = 1.0
        codecarbon_available = False
    
    # Base emission factors (grams CO2 per kWh)
    # Average grid intensity: ~475 g CO2/kWh (global average)
    # Based on CodeCarbon default: https://github.com/mlco2/codecarbon
    GRID_INTENSITY = 475  # g CO2 per kWh
    
    # Activity-specific energy consumption rates (watts)
    # Based on real-world measurements and CodeCarbon benchmarks
    ENERGY_RATES = {
        "youtube": 15,      # ~15W for video streaming (device + network)
        "ott": 18,          # ~18W for OTT streaming (slightly higher quality)
        "browsing": 8,      # ~8W for general web browsing
        "gmail": 5,         # ~5W for email operations (lower resource use)
        "code_execution": 50, # ~50W for code compilation/execution
        "idle": 3           # ~3W for idle state
    }
    
    # Get energy rate for activity
    base_power_watts = ENERGY_RATES.get(activity_type.lower(), 10)
    
    # Adjust based on CPU load for more accurate estimates
    power_watts = base_power_watts * cpu_load_factor
    
    # Calculate energy consumption (kWh)
    # Energy (kWh) = Power (W) * Time (h) / 1000
    duration_hours = duration_seconds / 3600
    energy_kwh = (power_watts * duration_hours) / 1000
    
    # Calculate CO2 emissions (grams) using CodeCarbon formula
    # CO2 (g) = Energy (kWh) * Grid Intensity (g CO2/kWh)
    co2_grams = energy_kwh * GRID_INTENSITY
    
    # Add metadata adjustments if available
    if metadata.get("quality") == "high":
        co2_grams *= 1.3  # Higher quality = more energy
    if metadata.get("quality") == "low":
        co2_grams *= 0.7  # Lower quality = less energy
    
    # Additional adjustments based on device type if available
    if metadata.get("device_type") == "mobile":
        co2_grams *= 0.5  # Mobile devices use less energy
    elif metadata.get("device_type") == "server":
        co2_grams *= 1.5  # Servers use more energy
    
    # Try CodeCarbon service if available and enabled
    if use_codecarbon and activity_type == "code_execution":
        try:
            from services.codecarbon_service import CodeCarbonService
            current_cpu = psutil.cpu_percent(interval=0.1)
            codecarbon_est = CodeCarbonService.estimate_from_codecarbon_benchmarks(
                activity_type,
                duration_seconds,
                cpu_percent=current_cpu
            )
            # Use CodeCarbon estimate if available
            if codecarbon_est:
                return {
                    **codecarbon_est,
                    "method": "codecarbon_enhanced"
                }
        except Exception as e:
            # CodeCarbon integration error - silently use fallback
            pass
    
    return {
        "energy_kwh": round(energy_kwh, 6),
        "co2_grams": round(co2_grams, 4),
        "power_watts": round(power_watts, 2),
        "cpu_load_factor": round(cpu_load_factor, 2),
        "method": "standard_benchmark"
    }

def analyze_code_static(code: str, language: str = "python") -> dict:
    """
    Perform static analysis on code to detect inefficiencies.
    """
    analysis = {
        "complexity": {},
        "metrics": {},
        "issues": [],
        "estimated_flops": 0,
        "estimated_cpu_cycles": 0
    }
    
    if language.lower() == "python":
        try:
            tree = ast.parse(code)
            
            # Calculate cyclomatic complexity using radon
            complexity_score = 0
            function_complexities = []
            func_cc = radon_cc.cc_visit(code)
            
            for item in func_cc:
                complexity_score += item.complexity
                function_complexities.append({
                    "function": item.name,
                    "complexity": item.complexity
                })
                if item.complexity > 10:
                    analysis["issues"].append({
                        "type": "high_complexity",
                        "severity": "medium",
                        "message": f"Function '{item.name}' has high cyclomatic complexity ({item.complexity})",
                        "suggestion": "Consider breaking down into smaller functions"
                    })
            
            # Calculate code metrics
            metrics = radon_metrics.mi_visit(code, True)
            analysis["metrics"] = {
                "maintainability_index": round(metrics, 2),
                "lines_of_code": len(code.splitlines())
            }
            
            # Detect nested loops
            max_depth = 0
            loop_depth = 0
            for node in ast.walk(tree):
                if isinstance(node, (ast.For, ast.While)):
                    loop_depth += 1
                    max_depth = max(max_depth, loop_depth)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    loop_depth = 0
            
            if max_depth > 2:
                analysis["issues"].append({
                    "type": "nested_loops",
                    "severity": "high",
                    "message": f"Code contains deeply nested loops (depth: {max_depth})",
                    "suggestion": "Consider refactoring to reduce nesting or use vectorization"
                })
            
            # Estimate FLOPs and CPU cycles (rough approximation)
            # This is a simplified heuristic
            loc = analysis["metrics"]["lines_of_code"]
            complexity_factor = complexity_score if complexity_score > 0 else 1
            analysis["estimated_flops"] = loc * complexity_factor * 1000  # Rough estimate
            analysis["estimated_cpu_cycles"] = loc * complexity_factor * 500  # Rough estimate
            
            analysis["complexity"] = {
                "total_complexity": complexity_score,
                "function_complexities": function_complexities,
                "max_nesting_depth": max_depth
            }
            
        except SyntaxError as e:
            analysis["issues"].append({
                "type": "syntax_error",
                "severity": "high",
                "message": f"Syntax error: {str(e)}",
                "suggestion": "Fix syntax errors before analysis"
            })
        except Exception as e:
            analysis["issues"].append({
                "type": "analysis_error",
                "severity": "medium",
                "message": f"Analysis error: {str(e)}",
                "suggestion": "Check code format"
            })
    
    return analysis

def call_openrouter_ai(code: str, analysis: dict, language: str = "python") -> dict:
    """
    Call OpenRouter API to get AI-powered optimization suggestions.
    Always returns useful suggestions even if AI fails.
    Uses shorter timeout and faster fallback for better performance.
    """
    issues_summary = "\n".join([f"- {issue['message']}" for issue in analysis.get("issues", [])])
    
    # Shorter prompt for faster response
    prompt = f"""Analyze this {language} code for energy efficiency. Provide optimization suggestions.

Code:
```{language}
{code[:1500]}
```

Analysis: Complexity={analysis.get('complexity', {}).get('total_complexity', 'N/A')}, Maintainability={analysis.get('metrics', {}).get('maintainability_index', 'N/A')}

Provide: 1) Energy assessment, 2) 3-5 optimization tips, 3) Key optimizations, 4) Estimated savings."""
    
    # Try only the first model quickly - if it fails, use fallback immediately
    models_to_try = [
        ("qwen/qwen3-coder:free", OPENROUTER_API_KEY_1),
    ]
    
    # Only try first model to save time - if it fails, use fallback
    for model_name, api_key in models_to_try:
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": model_name,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert in energy-efficient programming. Provide clear, actionable optimization suggestions."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1500  # Reduced tokens for faster response
                },
                timeout=3  # Reduced to 3 seconds for faster fallback
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Check if response is valid and not empty
                if ai_response and ai_response.strip():
                    return {
                        "success": True,
                        "response": ai_response.strip(),
                        "model": result.get("model", model_name)
                    }
                else:
                    # Empty response - use fallback
                    break
            else:
                # Non-200 status - use fallback
                break
        except (requests.exceptions.Timeout, requests.exceptions.RequestException):
            # Timeout or network error - use fallback immediately
            break
        except Exception:
            # Any other error - use fallback
            break
    
    # If AI fails, return static analysis suggestions immediately
    try:
        return generate_fallback_suggestions(code, analysis, language)
    except Exception as e:
        print(f"Fallback suggestions generation error: {str(e)}")
        # Last resort - return basic suggestions
        return {
            "success": True,
            "response": "**Basic Energy Efficiency Tips:**\n\n1. Use efficient data structures (sets for lookups, lists for iteration)\n2. Avoid unnecessary loops - use built-in functions when possible\n3. Minimize function calls in loops\n4. Use generators for large datasets to reduce memory usage\n5. Consider caching results of expensive computations\n6. Use list comprehensions instead of loops where applicable\n7. Profile your code to identify actual bottlenecks\n8. Use appropriate algorithms (O(n log n) vs O(n²))",
            "model": "basic_fallback"
        }

def call_openrouter_fallback(code: str, analysis: dict, language: str, model_type: str) -> dict:
    """Fallback to alternative OpenRouter models - deprecated, using direct model tries now"""
    # This function is kept for backward compatibility but routes to generate_fallback_suggestions
    print(f"Fallback called for {model_type}, using static analysis")
    return generate_fallback_suggestions(code, analysis, language)

def generate_fallback_suggestions(code: str, analysis: dict, language: str) -> dict:
    """Generate basic optimization suggestions based on static analysis when AI is unavailable"""
    suggestions = []
    
    # Get analysis results
    complexity = analysis.get('complexity', {}).get('total_complexity', 0)
    issues = analysis.get('issues', [])
    metrics = analysis.get('metrics', {})
    loc = metrics.get('lines_of_code', 0)
    maintainability = metrics.get('maintainability_index', 0)
    
    # Generate suggestions based on static analysis
    if complexity > 15:
        suggestions.append(f"**High Complexity Detected ({complexity}):** Break down complex functions into smaller, more manageable pieces. This reduces CPU cycles and improves maintainability.")
    
    if maintainability < 50 and maintainability > 0:
        suggestions.append(f"**Low Maintainability Index ({maintainability:.1f}):** Refactor code to improve readability and structure. Well-structured code typically runs more efficiently.")
    
    for issue in issues:
        if issue.get('type') == 'nested_loops':
            suggestions.append(f"**Nested Loops Detected:** {issue.get('message', 'Nested loops found')}. {issue.get('suggestion', 'Consider refactoring to reduce nesting.')} Consider using list comprehensions or vectorized operations where possible.")
        elif issue.get('type') == 'high_complexity':
            suggestions.append(f"**Complexity Issue:** {issue.get('message', 'High complexity detected')}. {issue.get('suggestion', 'Consider breaking down into smaller functions.')}")
    
    if loc > 100:
        suggestions.append(f"**Large Code File ({loc} lines):** Consider splitting into modules. Smaller files often compile and execute faster.")
    
    # Always include general tips
    general_tips = [
        "**General Energy Efficiency Tips:**",
        "1. Use efficient data structures (sets for lookups, lists for iteration)",
        "2. Avoid unnecessary loops - use built-in functions when possible",
        "3. Minimize function calls in loops",
        "4. Use generators for large datasets to reduce memory usage",
        "5. Consider caching results of expensive computations",
        "6. Use list comprehensions instead of loops where applicable",
        "7. Profile your code to identify actual bottlenecks",
        "8. Use appropriate algorithms (O(n log n) vs O(n²))"
    ]
    
    if suggestions:
        response_text = "\n\n".join(suggestions) + "\n\n" + "\n".join(general_tips)
    else:
        response_text = "\n".join(general_tips)
    
    return {
        "success": True,
        "response": f"**Optimization Suggestions Based on Static Analysis:**\n\n{response_text}\n\n*Note: These suggestions are generated from static code analysis. AI-powered recommendations require OpenRouter API access.*",
        "model": "static_analysis_fallback"
    }

# API Routes

@app.get("/")
def root():
    return {"message": "ENACT API - Energy & Carbon-Aware Technology", "version": "1.0.0"}

def get_today_total_emissions() -> float:
    """Get total emissions for today"""
    today = datetime.now().strftime("%Y-%m-%d")
    logs = load_logs(today)
    return sum(log.get("co2_grams", 0) for log in logs)

def get_weekly_total_emissions() -> float:
    """Get total emissions for last 7 days"""
    total = 0
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        logs = load_logs(date)
        total += sum(log.get("co2_grams", 0) for log in logs)
    return total

def get_threshold_suggestions(current_emissions: float, threshold_type: str = "daily") -> dict:
    """Get AI-powered suggestions when threshold is reached"""
    thresholds = {
        "daily": 2.0,  # grams CO2 per day
        "weekly": 10.0  # grams CO2 per week
    }
    
    threshold = thresholds.get(threshold_type, 2.0)
    
    if current_emissions < threshold:
        return None
    
    # Create prompt for activity optimization suggestions
    prompt = f"""You are an eco-friendly digital activity advisor. The user has reached a {threshold_type} carbon emission threshold ({current_emissions:.2f}g CO₂, limit: {threshold}g CO₂).

Provide practical, actionable suggestions to reduce digital carbon footprint:

1. Specific activity recommendations (2-3 items)
2. Behavioral changes they can make immediately (2-3 items)
3. Tools or settings optimizations (2-3 items)
4. A brief motivational message

Keep it concise, friendly, and actionable. Format with clear sections."""
    
    # Try multiple API keys and models
    api_keys = [OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, OPENROUTER_API_KEY_3]
    models_to_try = [
        ("qwen/qwen3-coder:free", OPENROUTER_API_KEY_1),
        ("mistralai/mistral-7b-instruct:free", OPENROUTER_API_KEY_2),
        ("google/gemini-2.0-flash-exp:free", OPENROUTER_API_KEY_3),
    ]
    
    for model_name, api_key in models_to_try:
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": model_name,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert in digital sustainability and reducing carbon footprints from online activities. Provide clear, actionable advice."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 800
                },
                timeout=5  # Reduced to 5 seconds per API call for faster fallback
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Check if response is valid and not empty
                if ai_response and ai_response.strip():
                    return {
                        "success": True,
                        "response": ai_response.strip(),
                        "model": result.get("model", model_name),
                        "threshold_type": threshold_type,
                        "current_emissions": current_emissions,
                        "threshold": threshold
                    }
                else:
                    # Empty response - try next model
                    continue
            elif response.status_code == 401:
                # Invalid API key - silently skip and try next model
                continue
            else:
                # Other errors - try next model
                continue
        except requests.exceptions.Timeout:
            # Timeout - try next model
            continue
        except Exception:
            # Other errors - try next model silently
            continue
    
    # Fallback suggestions
    return {
        "success": True,
        "response": f"""**Threshold Reached!** ({current_emissions:.2f}g CO₂ / {threshold}g limit)

**Quick Actions:**
1. Reduce video streaming quality (saves 30-50% energy)
2. Take breaks between digital activities
3. Use dark mode to reduce screen energy consumption
4. Close unused browser tabs and applications
5. Schedule downloads during off-peak hours

**Mindful Usage:**
- Batch similar activities together
- Use Wi-Fi instead of mobile data when possible
- Consider audio-only alternatives for content

**Remember:** Small changes add up! Every reduction helps.""",
        "model": "fallback",
        "threshold_type": threshold_type,
        "current_emissions": current_emissions,
        "threshold": threshold
    }

@app.post("/api/track-emission")
def track_emission(activity: ActivityData):
    """
    Track and log carbon emission for an activity
    
    DATA PERSISTENCE:
    - Each activity is saved IMMEDIATELY to logs/emissions_YYYY-MM-DD.json
    - Data is flushed to disk using flush() and fsync() - no buffering
    - Historical data persists across application restarts
    - Each day gets its own log file for easy date-based queries
    - Threshold calculations use current date automatically (resets daily)
    
    When you close the application:
    - All tracked activities are already saved to disk
    - No data loss occurs on shutdown
    - Next day, previous logs are automatically loaded and displayed
    """
    try:
        emission_data = estimate_carbon_footprint(
            activity.activity_type,
            activity.duration_seconds,
            activity.metadata
        )
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "activity_type": activity.activity_type,
            "duration_seconds": activity.duration_seconds,
            **emission_data,
            "metadata": activity.metadata
        }
        
        # Save immediately with disk flush - data persists across restarts
        save_log(log_entry)
        
        # Check thresholds and get suggestions if needed
        today_total = get_today_total_emissions()
        weekly_total = get_weekly_total_emissions()
        
        threshold_suggestions = None
        threshold_type = None
        
        # Check daily threshold
        if today_total >= 2.0:
            threshold_suggestions = get_threshold_suggestions(today_total, "daily")
            threshold_type = "daily"
        # Check weekly threshold if daily not reached
        elif weekly_total >= 10.0:
            threshold_suggestions = get_threshold_suggestions(weekly_total, "weekly")
            threshold_type = "weekly"
        
        response_data = {
            "success": True,
            "data": log_entry,
            "today_total": round(today_total, 4),
            "weekly_total": round(weekly_total, 4)
        }
        
        if threshold_suggestions:
            response_data["threshold_alert"] = {
                "reached": True,
                "type": threshold_type,
                "suggestions": threshold_suggestions
            }
        
        return JSONResponse(content=response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emissions/{date}")
def get_emissions(date: str):
    """Get emission logs for a specific date (YYYY-MM-DD) or 'today'"""
    if date == "today":
        date = datetime.now().strftime("%Y-%m-%d")
    
    logs = load_logs(date)
    
    # Calculate summary statistics
    total_co2 = sum(log.get("co2_grams", 0) for log in logs)
    total_energy = sum(log.get("energy_kwh", 0) for log in logs)
    total_duration = sum(log.get("duration_seconds", 0) for log in logs)
    
    return {
        "date": date,
        "logs": logs,
        "summary": {
            "total_emissions_grams": round(total_co2, 4),
            "total_energy_kwh": round(total_energy, 6),
            "total_duration_seconds": round(total_duration, 2),
            "activity_count": len(logs)
        }
    }

@app.get("/api/emissions/summary")
def get_emissions_summary(days: int = 7, include_demo: bool = False, all_history: bool = False):
    """
    Get emission summary for last N days or all history if all_history=True
    
    IMPORTANT: This endpoint loads all historical log files from logs/emissions_*.json
    Data is persisted immediately when activities are tracked, so all historical data
    is preserved across application restarts.
    
    Returns:
    - daily_summaries: Array of daily summaries (oldest first for timeline charts)
    - total_emissions_grams: Sum of all emissions in the period
    - total_energy_kwh: Sum of all energy in the period
    - period_days: Number of days in the summary
    """
    summaries = []
    total_co2 = 0
    total_energy = 0
    
    # If all_history is True, get all available log files
    if all_history:
        import glob
        log_files = glob.glob(os.path.join(LOG_DIR, "emissions_*.json"))
        dates = set()
        for log_file in log_files:
            try:
                filename = os.path.basename(log_file)
                date_str = filename.replace("emissions_", "").replace(".json", "")
                dates.add(date_str)
            except:
                continue
        
        # Sort dates and get most recent N days
        sorted_dates = sorted(dates)  # Ascending order first
        total_available_days = len(sorted_dates)
        days = total_available_days if days is None or days <= 0 else min(days, total_available_days)
        
        # Get the most recent N days (last N in ascending sorted list)
        # This ensures we get the most recent data while keeping chronological order for charts
        recent_dates = sorted_dates[-days:] if days < total_available_days else sorted_dates
        
        # Process dates in chronological order (oldest first) for timeline charts
        for date in recent_dates:
            logs = load_logs(date)
            day_co2 = sum(log.get("co2_grams", 0) for log in logs)
            day_energy = sum(log.get("energy_kwh", 0) for log in logs)
            
            summaries.append({
                "date": date,
                "emissions_grams": round(day_co2, 4),
                "energy_kwh": round(day_energy, 6),
                "activity_count": len(logs)
            })
            
            total_co2 += day_co2
            total_energy += day_energy
    else:
        # If no data and demo is requested, generate some demo data
        has_any_data = False
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            logs = load_logs(date)
            if logs:
                has_any_data = True
        
        # Generate demo data if no real data exists
        if not has_any_data and include_demo:
            try:
                from api.demo_data import save_demo_data_to_logs
                save_demo_data_to_logs(days)
            except Exception as e:
                print(f"Demo data generation error: {str(e)}")
        
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            logs = load_logs(date)
            day_co2 = sum(log.get("co2_grams", 0) for log in logs)
            day_energy = sum(log.get("energy_kwh", 0) for log in logs)
            
            summaries.append({
                "date": date,
                "emissions_grams": round(day_co2, 4),
                "energy_kwh": round(day_energy, 6),
                "activity_count": len(logs)
            })
            
            total_co2 += day_co2
            total_energy += day_energy
    
    return {
        "period_days": len(summaries),  # Actual number of days with data
        "daily_summaries": summaries,  # Chronologically sorted (oldest first)
        "total_emissions_grams": round(total_co2, 4),
        "total_energy_kwh": round(total_energy, 6)
    }

@app.post("/api/analyze-code")
def analyze_code(code_input: CodeInput):
    """Analyze code for energy efficiency and get AI optimization suggestions"""
    # Initialize default values
    static_analysis = {
        "complexity": {"total_complexity": 0},
        "metrics": {"maintainability_index": 0, "lines_of_code": 0},
        "issues": [],
        "estimated_flops": 0,
        "estimated_cpu_cycles": 0
    }
    estimated_energy = {
        "energy_kwh": 0.0,
        "co2_grams": 0.0,
        "power_watts": 0.0
    }
    ai_suggestions = None
    
    try:
        # Perform static analysis (fast - should complete quickly)
        static_analysis = analyze_code_static(code_input.code, code_input.language)
        
        # Estimate code execution energy (fast - should complete quickly)
        try:
            estimated_energy = estimate_carbon_footprint(
                "code_execution",
                static_analysis.get("estimated_cpu_cycles", 1000000) / 1000000,  # Rough conversion
                {"complexity": static_analysis.get("complexity", {}).get("total_complexity", 1)}
            )
        except Exception as e:
            print(f"Energy estimate error: {str(e)}")
            estimated_energy = estimate_carbon_footprint("code_execution", 0.001, {})
        
        # Get AI optimization suggestions with fast timeout
        # Use quick fallback if AI takes too long
        try:
            # Call with timeout protection - if takes too long, use fallback
            ai_suggestions = call_openrouter_ai(code_input.code, static_analysis, code_input.language)
            
            # Ensure ai_suggestions is always valid and has non-empty response
            if not ai_suggestions or not ai_suggestions.get('response') or not str(ai_suggestions.get('response', '')).strip():
                # Generate fallback immediately
                ai_suggestions = generate_fallback_suggestions(code_input.code, static_analysis, code_input.language)
            else:
                # Ensure response is not empty
                response_text = str(ai_suggestions.get('response', '')).strip()
                if not response_text:
                    # Empty response - use fallback
                    ai_suggestions = generate_fallback_suggestions(code_input.code, static_analysis, code_input.language)
                else:
                    ai_suggestions['response'] = response_text
        except Exception as e:
            print(f"AI suggestions error: {str(e)}")
            # Generate fallback suggestions immediately if AI fails
            ai_suggestions = generate_fallback_suggestions(code_input.code, static_analysis, code_input.language)
        
        return JSONResponse(content={
            "success": True,
            "static_analysis": static_analysis,
            "energy_estimate": estimated_energy,
            "ai_suggestions": ai_suggestions,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Analysis endpoint error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Always return a valid response, even if everything fails
        try:
            # Try static analysis as fallback
            static_analysis = analyze_code_static(code_input.code, code_input.language)
        except Exception as e2:
            print(f"Static analysis also failed: {str(e2)}")
            static_analysis = {
                "complexity": {"total_complexity": 0},
                "metrics": {"maintainability_index": 0, "lines_of_code": len(code_input.code.splitlines())},
                "issues": [{
                    "type": "analysis_error",
                    "severity": "medium",
                    "message": f"Analysis encountered an error: {str(e)}",
                    "suggestion": "Please check your code and try again"
                }],
                "estimated_flops": 0,
                "estimated_cpu_cycles": 0
            }
        
        # Generate fallback suggestions (fast - no API calls)
        try:
            ai_suggestions = generate_fallback_suggestions(code_input.code, static_analysis, code_input.language)
        except Exception as e3:
            print(f"Fallback suggestions error: {str(e3)}")
            ai_suggestions = {
                "success": True,
                "response": "**Basic Optimization Tips:**\n\n1. Use efficient data structures\n2. Avoid unnecessary loops\n3. Minimize function calls in loops\n4. Use built-in functions when possible\n5. Consider caching expensive computations",
                "model": "fallback"
            }
        
        # Always return a valid response
        return JSONResponse(content={
            "success": True,
            "static_analysis": static_analysis,
            "energy_estimate": estimate_carbon_footprint("code_execution", 0.001, {}),
            "ai_suggestions": ai_suggestions,
            "timestamp": datetime.now().isoformat(),
            "warning": "Some analysis features may have failed, but basic results are available"
        })

@app.post("/api/upload-code")
async def upload_code(file: UploadFile = File(...)):
    """Upload and analyze code file"""
    try:
        content = await file.read()
        code = content.decode("utf-8")
        
        # Detect language from file extension
        extension = file.filename.split('.')[-1] if '.' in file.filename else "python"
        language_map = {
            "py": "python",
            "cpp": "cpp",
            "c": "c",
            "js": "javascript",
            "java": "java"
        }
        language = language_map.get(extension.lower(), "python")
        
        # Analyze the code - use same robust error handling as analyze-code endpoint
        static_analysis = {
            "complexity": {"total_complexity": 0},
            "metrics": {"maintainability_index": 0, "lines_of_code": 0},
            "issues": [],
            "estimated_flops": 0,
            "estimated_cpu_cycles": 0
        }
        
        try:
            static_analysis = analyze_code_static(code, language)
        except Exception as e:
            print(f"Static analysis error: {str(e)}")
            static_analysis = {
                "complexity": {"total_complexity": 0},
                "metrics": {"maintainability_index": 0, "lines_of_code": len(code.splitlines())},
                "issues": [],
                "estimated_flops": 0,
                "estimated_cpu_cycles": 0
            }
        
        try:
            estimated_energy = estimate_carbon_footprint(
                "code_execution",
                static_analysis.get("estimated_cpu_cycles", 1000000) / 1000000,
                {"complexity": static_analysis.get("complexity", {}).get("total_complexity", 1)}
            )
        except Exception as e:
            print(f"Energy estimate error: {str(e)}")
            estimated_energy = estimate_carbon_footprint("code_execution", 0.001, {})
        
        # Get AI optimization suggestions - this ALWAYS returns suggestions (tries all models)
        try:
            ai_suggestions = call_openrouter_ai(code, static_analysis, language)
            
            # Ensure ai_suggestions is always valid and has non-empty response
            if not ai_suggestions or not ai_suggestions.get('response') or not str(ai_suggestions.get('response', '')).strip():
                print("ai_suggestions is empty or invalid (upload), generating fallback")
                ai_suggestions = generate_fallback_suggestions(code, static_analysis, language)
            else:
                # Ensure response is not empty
                response_text = str(ai_suggestions.get('response', '')).strip()
                if not response_text:
                    print("ai_suggestions response is empty string (upload), generating fallback")
                    ai_suggestions = generate_fallback_suggestions(code, static_analysis, language)
                else:
                    ai_suggestions['response'] = response_text
        except Exception as e:
            print(f"AI suggestions error: {str(e)}")
            ai_suggestions = generate_fallback_suggestions(code, static_analysis, language)
        
        return JSONResponse(content={
            "success": True,
            "static_analysis": static_analysis,
            "energy_estimate": estimated_energy,
            "ai_suggestions": ai_suggestions,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Upload code error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a helpful error response instead of raising HTTPException
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"File processing failed: {str(e)}",
                "static_analysis": {
                    "complexity": {"total_complexity": 0},
                    "metrics": {"maintainability_index": 0, "lines_of_code": 0},
                    "issues": [],
                    "estimated_flops": 0,
                    "estimated_cpu_cycles": 0
                },
                "energy_estimate": estimate_carbon_footprint("code_execution", 0.001, {}),
                "ai_suggestions": {
                    "success": True,
                    "response": "**Unable to analyze file.**\n\nPlease check:\n1. File is readable\n2. File encoding is UTF-8\n3. File contains valid code",
                    "model": "fallback"
                },
                "timestamp": datetime.now().isoformat()
            }
        )

@app.get("/api/system-metrics")
def get_system_metrics():
    """Get current system resource usage metrics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        # Try to get disk usage, fallback to None if not available
        try:
            if os.name == 'nt':  # Windows
                disk = psutil.disk_usage('C:')
            else:
                disk = psutil.disk_usage('/')
            disk_percent = disk.percent
        except:
            disk_percent = None
        
        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "disk_percent": disk_percent,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/test-openrouter")
def test_openrouter():
    """
    Test OpenRouter API connectivity and verify API keys.
    Returns which models are working.
    """
    results = {
        "working_models": [],
        "failed_models": [],
        "total_tested": 0
    }
    
    models_to_test = [
        ("qwen/qwen3-coder:free", OPENROUTER_API_KEY_1, "Qwen3 Coder"),
        ("mistralai/mistral-7b-instruct:free", OPENROUTER_API_KEY_2, "Mistral 7B"),
        ("google/gemini-2.0-flash-exp:free", OPENROUTER_API_KEY_3, "Google Gemini"),
    ]
    
    for model_name, api_key, display_name in models_to_test:
        results["total_tested"] += 1
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": model_name,
                    "messages": [
                        {
                            "role": "user",
                            "content": "Say 'Hello, ENACT!' if you can read this."
                        }
                    ],
                    "max_tokens": 50
                },
                timeout=5  # Reduced to 5 seconds per API call for faster fallback
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]
                results["working_models"].append({
                    "model": display_name,
                    "model_id": model_name,
                    "response": ai_response[:100],
                    "status": "success"
                })
            elif response.status_code == 401:
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Unauthorized")
                except:
                    error_msg = "Invalid API key"
                results["failed_models"].append({
                    "model": display_name,
                    "model_id": model_name,
                    "error": error_msg,
                    "status": "401 - Invalid API key"
                })
            else:
                results["failed_models"].append({
                    "model": display_name,
                    "model_id": model_name,
                    "error": f"Status {response.status_code}",
                    "status": "failed"
                })
        except requests.exceptions.Timeout:
            results["failed_models"].append({
                "model": display_name,
                "model_id": model_name,
                "error": "Request timeout",
                "status": "timeout"
            })
        except Exception as e:
            results["failed_models"].append({
                "model": display_name,
                "model_id": model_name,
                "error": str(e)[:100],
                "status": "error"
            })
    
    results["success_count"] = len(results["working_models"])
    results["failure_count"] = len(results["failed_models"])
    
    return JSONResponse(content={
        "success": results["success_count"] > 0,
        "results": results,
        "message": f"{results['success_count']} out of {results['total_tested']} models are working"
    })

@app.post("/api/test-codecarbon")
def test_codecarbon(duration: float = 5.0):
    """
    Test CodeCarbon API and return actual emissions data.
    This endpoint runs a real CodeCarbon tracking session.
    """
    try:
        from codecarbon import EmissionsTracker
        import time
        
        # Create output directory
        output_dir = os.path.join(LOG_DIR, "codecarbon")
        os.makedirs(output_dir, exist_ok=True)
        
        # Start CodeCarbon tracking
        tracker = EmissionsTracker(
            output_dir=output_dir,
            tracking_mode="process",
            measure_power_secs=1,  # Measure every second
            log_level="error",
            save_to_file=False  # Don't save for API testing
        )
        
        tracker.start()
        
        # Simulate CPU work for the specified duration
        start_time = time.time()
        while time.time() - start_time < duration:
            # CPU-intensive work
            _ = sum(range(10000))
            time.sleep(0.1)
        
        # Stop tracking
        tracker.stop()
        
        # Get emissions data (EmissionsData object)
        emissions_data = tracker.final_emissions_data
        
        if emissions_data:
            # Access attributes directly
            energy_kwh = getattr(emissions_data, 'energy_consumed_kWh', 0) or 0
            emissions_kg = getattr(emissions_data, 'emissions', 0) or 0
            duration_actual = getattr(emissions_data, 'duration', duration) or duration
            country = getattr(emissions_data, 'country_iso_code', 'USA') or 'USA'
            region = getattr(emissions_data, 'region', 'Unknown') or 'Unknown'
            cpu_model = getattr(emissions_data, 'cpu_model', 'Unknown') or 'Unknown'
            cpu_power = getattr(emissions_data, 'cpu_power', 0) or 0
            ram_power = getattr(emissions_data, 'ram_power', 0) or 0
            gpu_power = getattr(emissions_data, 'gpu_power', 0) or 0
            
            # Convert to dict for JSON serialization
            raw_data = {
                'energy_consumed_kWh': energy_kwh,
                'emissions': emissions_kg,
                'duration': duration_actual,
                'country_iso_code': country,
                'region': region,
                'cpu_model': cpu_model,
                'cpu_power': cpu_power,
                'ram_power': ram_power,
                'gpu_power': gpu_power,
            }
            
            return {
                "success": True,
                "codecarbon_available": True,
                "tracking_duration_seconds": duration,
                "emissions": {
                    "energy_kwh": round(energy_kwh, 6),
                    "co2_kg": round(emissions_kg, 6),
                    "co2_grams": round(emissions_kg * 1000, 4),
                    "duration_seconds": round(duration_actual, 2),
                    "country": country,
                    "region": region,
                    "cpu_model": cpu_model,
                    "cpu_power_watts": round(cpu_power, 2),
                    "ram_power_watts": round(ram_power, 2),
                    "gpu_power_watts": round(gpu_power, 2),
                },
                "raw_codecarbon_data": raw_data,  # Full CodeCarbon output as dict
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "success": False,
                "codecarbon_available": True,
                "error": "CodeCarbon tracker did not return emissions data",
                "timestamp": datetime.now().isoformat()
            }
            
    except ImportError:
        return {
            "success": False,
            "codecarbon_available": False,
            "error": "CodeCarbon not installed. Install with: pip install codecarbon",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "codecarbon_available": True,
            "error": str(e),
            "error_type": type(e).__name__,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

