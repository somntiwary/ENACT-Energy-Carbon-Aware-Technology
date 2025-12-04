"""
Windows System Activity Tracker
Automatically tracks active window activities and system metrics,
then sends them to the ENACT API for carbon footprint estimation.
"""

import time
import threading
import requests
import psutil
from datetime import datetime
from typing import Optional, Dict, Any
import logging

# Windows-specific imports
try:
    import win32gui
    import win32process
    WINDOWS_AVAILABLE = True
except ImportError:
    WINDOWS_AVAILABLE = False
    print("⚠️  Windows-specific modules not available. Install with: pip install pywin32")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SystemTracker:
    """Background service that tracks system activities and sends to ENACT API"""
    
    def __init__(self, api_url: str = "http://localhost:8000/api/track-emission", interval: int = 10):
        """
        Initialize the system tracker
        
        Args:
            api_url: URL of the ENACT track-emission API endpoint
            interval: Tracking interval in seconds (default: 10)
        """
        self.api_url = api_url
        self.interval = interval
        self.running = False
        self.tracker_thread: Optional[threading.Thread] = None
        self.last_activity = None
        self.idle_start_time = None
        self.idle_threshold = 300  # 5 minutes in seconds
        
        # Activity type mappings
        self.activity_mappings = {
            # Streaming services
            "youtube": ["youtube", "youtu.be"],
            "netflix": ["netflix"],
            "ott": ["hulu", "disney", "prime video", "amazon prime", "hbo", "max", "disney+", "peacock"],
            "streaming": ["twitch", "vimeo", "dailymotion"],
            
            # Email services
            "gmail": ["gmail", "mail.google.com"],
            "email": ["outlook", "mail", "thunderbird"],
            
            # Code editors
            "coding": ["code", "vscode", "visual studio", "pycharm", "intellij", "sublime", "atom", "notepad++"],
            
            # General browsing
            "browsing": ["chrome", "firefox", "edge", "opera", "safari", "brave"]
        }
        
    def get_active_window_title(self) -> Optional[str]:
        """Get the title of the currently active window (Windows only)"""
        if not WINDOWS_AVAILABLE:
            return None
            
        try:
            hwnd = win32gui.GetForegroundWindow()
            window_title = win32gui.GetWindowText(hwnd)
            return window_title
        except Exception as e:
            logger.debug(f"Error getting window title: {e}")
            return None
    
    def get_active_process_name(self) -> Optional[str]:
        """Get the name of the currently active process (Windows only)"""
        if not WINDOWS_AVAILABLE:
            return None
            
        try:
            hwnd = win32gui.GetForegroundWindow()
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            process = psutil.Process(pid)
            return process.name().lower()
        except Exception as e:
            logger.debug(f"Error getting process name: {e}")
            return None
    
    def identify_activity_type(self, window_title: str, process_name: str) -> str:
        """
        Identify activity type based on window title and process name
        
        Args:
            window_title: Active window title
            process_name: Active process name
            
        Returns:
            Activity type string (streaming, email, coding, browsing, idle)
        """
        if not window_title and not process_name:
            return "idle"
        
        # Normalize inputs
        window_lower = (window_title or "").lower()
        process_lower = (process_name or "").lower()
        combined = f"{window_lower} {process_lower}"
        
        # Check for streaming services
        for activity_type, keywords in self.activity_mappings.items():
            if any(keyword in combined for keyword in keywords):
                # Special handling for YouTube
                if activity_type == "youtube" or "youtube" in combined:
                    return "youtube"
                # Special handling for Gmail
                if activity_type == "gmail" or "gmail" in combined or "mail.google.com" in combined:
                    return "gmail"
                # Special handling for code editors
                if activity_type == "coding":
                    return "coding"
                # General streaming
                if activity_type in ["netflix", "ott", "streaming"]:
                    return "streaming"
                # General email
                if activity_type == "email":
                    return "email"
        
        # Check if it's a browser (general browsing)
        if any(browser in combined for browser in ["chrome", "firefox", "edge", "opera", "safari", "brave"]):
            return "browsing"
        
        # Default to idle if no match
        return "idle"
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_gb = memory.used / (1024 ** 3)
            
            # Network usage
            network = psutil.net_io_counters()
            network_bytes_sent = network.bytes_sent
            network_bytes_recv = network.bytes_recv
            # Calculate network speed (simplified - would need previous values for accurate speed)
            network_mbps = 0  # Will be calculated over time
            
            # Battery status (if available)
            battery_percent = None
            battery_plugged = None
            try:
                battery = psutil.sensors_battery()
                if battery:
                    battery_percent = battery.percent
                    battery_plugged = battery.power_plugged
            except:
                pass  # Battery info not available
            
            return {
                "cpu_percent": round(cpu_percent, 2),
                "memory_percent": round(memory_percent, 2),
                "memory_used_gb": round(memory_used_gb, 2),
                "network_bytes_sent": network_bytes_sent,
                "network_bytes_recv": network_bytes_recv,
                "network_mbps": round(network_mbps, 2),
                "battery_percent": battery_percent,
                "battery_plugged": battery_plugged
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {}
    
    def check_idle(self, current_activity: str) -> bool:
        """Check if system has been idle for too long"""
        if current_activity == "idle":
            if self.idle_start_time is None:
                self.idle_start_time = time.time()
            else:
                idle_duration = time.time() - self.idle_start_time
                if idle_duration >= self.idle_threshold:
                    return True
        else:
            self.idle_start_time = None
        return False
    
    def track_activity(self):
        """Track current activity and send to API"""
        try:
            # Get active window and process
            window_title = self.get_active_window_title()
            process_name = self.get_active_process_name()
            
            # Identify activity type
            activity_type = self.identify_activity_type(window_title, process_name)
            
            # Check if idle for too long - skip tracking if idle
            if self.check_idle(activity_type):
                logger.debug("System idle for extended period, skipping tracking")
                return
            
            # Get system metrics
            metrics = self.get_system_metrics()
            
            # Build metadata
            metadata = {
                "window_title": window_title or "Unknown",
                "process_name": process_name or "Unknown",
                **metrics
            }
            
            # Prepare activity data
            activity_data = {
                "activity_type": activity_type,
                "duration_seconds": self.interval,
                "metadata": metadata
            }
            
            # Send to API
            try:
                response = requests.post(
                    self.api_url,
                    json=activity_data,
                    timeout=5
                )
                
                if response.status_code == 200:
                    logger.debug(f"Tracked activity: {activity_type} ({window_title})")
                else:
                    logger.warning(f"API returned status {response.status_code}: {response.text}")
                    
            except requests.exceptions.ConnectionError:
                logger.warning(f"Could not connect to API at {self.api_url}. Is the server running?")
            except requests.exceptions.Timeout:
                logger.warning(f"API request timed out after 5 seconds")
            except Exception as e:
                logger.error(f"Error sending activity to API: {e}")
            
            # Update last activity
            self.last_activity = {
                "type": activity_type,
                "window": window_title,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error tracking activity: {e}")
    
    def start(self):
        """Start the background tracking thread"""
        if self.running:
            logger.warning("System tracker is already running")
            return
        
        if not WINDOWS_AVAILABLE:
            logger.warning("Windows-specific modules not available. Tracker will not start.")
            return
        
        self.running = True
        self.tracker_thread = threading.Thread(target=self._track_loop, daemon=True)
        self.tracker_thread.start()
        logger.info(f"System tracker started (interval: {self.interval}s)")
    
    def stop(self):
        """Stop the background tracking thread"""
        if not self.running:
            return
        
        self.running = False
        if self.tracker_thread:
            self.tracker_thread.join(timeout=2)
        logger.info("System tracker stopped")
    
    def _track_loop(self):
        """Main tracking loop (runs in background thread)"""
        while self.running:
            try:
                self.track_activity()
            except Exception as e:
                logger.error(f"Error in tracking loop: {e}")
            
            # Sleep for interval, but check running flag frequently
            for _ in range(self.interval * 10):  # Check 10 times per second
                if not self.running:
                    break
                time.sleep(0.1)
    
    def is_running(self) -> bool:
        """Check if tracker is currently running"""
        return self.running

