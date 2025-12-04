# ENACT - Energy & Carbon-Aware Technology

An end-to-end, AI-assisted platform that measures digital carbon emissions and promotes energy-efficient software engineering. ENACT observes real activities (browsing, streaming, email, code execution), estimates energy and CO₂ impact, analyzes code statically, and generates actionable optimization guidance via AI.

## 🌟 Key Features

### 📊 Real-Time Activity Tracking
- **Manual Tracking**: Track YouTube, OTT streaming, Gmail, and general browsing activities
- **Automatic Browser Extension**: Passive tracking via Chrome extension for seamless monitoring
- **System Resource Monitoring**: Real-time CPU, memory, and disk usage tracking
- **Emission Estimation**: Accurate CO₂ and energy consumption calculations based on activity type and duration

### 🔍 Code Analysis & Optimization
- **Static Code Analysis**: Cyclomatic complexity, maintainability index, and code metrics
- **AI-Powered Suggestions**: Multi-model AI integration (OpenRouter) for optimization recommendations
- **Energy Estimation**: Approximate energy consumption and CO₂ emissions for code execution
- **File Upload Support**: Analyze code files directly from your filesystem

### 📈 Comprehensive Analytics
- **Dashboard**: Real-time emission tracking, eco-score, and activity summaries
- **Insights Page**: Historical trends, activity breakdowns, and detailed analytics
- **Visual Charts**: Interactive pie charts with gradient colors and timeline visualizations
- **Daily/Weekly Summaries**: Track emissions over customizable time periods

### 🌐 Browser Extension
- **Automatic Tracking**: Seamlessly tracks YouTube, Gmail, and OTT streaming without manual intervention
- **Real-Time Updates**: Sends activity data to ENACT API every 10 seconds
- **Video Details**: Extracts video titles, channels, durations, and view counts via YouTube Data API
- **Privacy-Focused**: All data stays local; only minimal metadata sent to your local API

## ⚑ Vision, Goals, and Objectives

- **Vision**: Make sustainable software development tangible and actionable for developers and end-users.
- **Primary Goals**:
  - **Measure**: Provide credible, transparent estimates of digital activities' energy use and CO₂ emissions.
  - **Analyze**: Identify inefficient code patterns through static analysis and heuristics.
  - **Advise**: Deliver practical, AI-generated optimization suggestions with an eye toward energy and performance.
  - **Educate**: Expose trade-offs, trends, and the impact of changes via a real-time dashboard.
- **Objectives**:
  - Seamless local setup with zero external databases (JSON-based logging).
  - Clear APIs for tracking activities and analyzing code.
  - Robust fallback behavior when third-party AI is unavailable.
  - Portable, cross-platform developer experience (Windows/macOS/Linux).
  - Browser extension for passive activity monitoring.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with dark mode support
- **Routing**: React Router DOM
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios for API communication
- **State Management**: React Context API

### Backend
- **Framework**: FastAPI (Python)
- **Code Analysis**: Radon (complexity/metrics), AST parsing
- **System Metrics**: psutil for CPU, memory, disk monitoring
- **Optional**: CodeCarbon for enhanced emission tracking
- **AI Integration**: OpenRouter API (multi-model access: GPT, Mistral, Gemini)

### Browser Extension
- **Manifest**: Chrome Extension Manifest V3
- **Background Service**: Service Worker for continuous tracking
- **Content Scripts**: YouTube and Gmail activity detection
- **APIs**: YouTube Data API v3 for video metadata

### Storage
- **Local JSON Files**: Per-day emission logs in `logs/` directory
- **Browser Storage**: Extension state management
- **No External Databases**: Complete privacy and portability

### Runtime Requirements
- **Python**: 3.8+ (3.11 recommended)
- **Node.js**: 16+ (18+ recommended)
- **Browser**: Chrome/Edge (Chromium-based) for extension

## 🧭 System Architecture

High-level component view:

```
┌────────────────────────────────────────────────────────────────────┐
│                    Browser Extension (Chrome)                      │
│  - Background Service Worker: Continuous activity tracking         │
│  - Content Scripts: YouTube, Gmail detection                      │
│  - Sends data to ENACT API every 10 seconds                        │
└───────────────▲───────────────────────────────────────────┬────────┘
                │                                           │
                │ HTTP/JSON                                 │
                │                                           │
┌───────────────┴───────────────────────────────────────────▼────────┐
│                              Frontend (React)                      │
│  - Pages: Dashboard, Analyzer, Insights, About                    │
│  - Components: Charts, trackers, theme, error boundary             │
│  - Calls backend via Axios to REST endpoints                       │
└───────────────▲───────────────────────────────────────────┬────────┘
                │                                           │
                │ HTTP/JSON                                 │
                │                                           │
┌───────────────┴───────────────────────────────────────────▼────────┐
│                             Backend (FastAPI)                       │
│  - API routes: emissions tracking, summaries, analysis, metrics     │
│  - Services: static analysis (Radon/AST), energy estimation         │
│  - Integrations: optional CodeCarbon; OpenRouter (AI suggestions)   │
│  - Persistence: JSON logs per day in `logs/`                        │
└───────────────▲───────────────────────────────────────────┬────────┘
                │                                           │
                │ File I/O                                  │ External APIs (optional)
                │                                           │
       ┌────────┴─────────┐                          ┌──────┴─────────────────┐
       │ Local JSON Logs  │                          │ OpenRouter AI Models   │
       │ `logs/*.json`    │                          │ (GPT/Mistral/Gemini)   │
       └───────────────────┘                          └────────────────────────┘
```

### Backend Subsystems

- **Emission Estimation** (`estimate_carbon_footprint`):
  - Activity → power model (watts) × time → kWh → grams CO₂ via grid intensity.
  - Adjustments: CPU load factor (via psutil), metadata (quality, device type).
  - Uses CodeCarbon benchmarks; can call CodeCarbon for code-execution tests.
- **Static Code Analysis** (`analyze_code_static`):
  - Python AST parse, Radon complexity, maintainability index, nesting depth.
  - Heuristic estimates of FLOPs/CPU cycles to approximate energy use.
  - Fallback complexity estimation when Radon is unavailable.
- **AI Suggestions** (`call_openrouter_ai`):
  - Tries multiple models via OpenRouter with timeouts and error handling.
  - If all fail, falls back to deterministic suggestions (`generate_fallback_suggestions`).
- **Logging** (`logs/emissions_YYYY-MM-DD.json`):
  - Append-only, per-day JSON arrays containing activity entries and summaries.
  - Immediate disk persistence with flush() and fsync() for data integrity.

### Frontend Responsibilities

- Dashboard visualizations (totals, eco-score proxies, trends).
- Analyzer page for code paste/upload, rendering AI guidance and static metrics.
- Insights for historical summaries and breakdowns with gradient pie charts.
- Theme management (dark/light) with persistence.
- Real-time updates via event listeners.

### Browser Extension Architecture

- **Background Service Worker** (`background.js`):
  - Runs every 10 seconds to check active tab
  - Identifies activity type (YouTube, Gmail, OTT, browsing)
  - Fetches video details from YouTube Data API
  - Sends activity data to ENACT API
- **Content Scripts**:
  - `content_youtube.js`: Monitors YouTube video playback state
  - `content_gmail.js`: Detects Gmail activities (composing, reading, browsing)
- **Activity Detection**:
  - YouTube: Extracts video ID, fetches title, channel, duration via API
  - Gmail: Detects composing, reading, browsing inbox
  - OTT: Identifies streaming service from URL (Netflix, Hulu, Disney+, etc.)
  - General: Tracks browsing activities on other websites

## 🔁 Core Workflows

### 1) Track an Activity (Manual)
1. User navigates to Dashboard and selects activity type (YouTube, OTT, Gmail, Browsing)
2. Frontend starts a timer and collects basic metadata (quality/device type if provided)
3. On stop, frontend calls `POST /api/track-emission` with `activity_type`, `duration_seconds`, and `metadata`
4. Backend estimates energy/CO₂, appends an entry to the day's JSON log, and returns the enriched record
5. Frontend updates the dashboard and charts in real-time

### 2) Track an Activity (Browser Extension - Automatic)
1. User installs and enables the browser extension
2. Extension background service worker runs every 10 seconds
3. Detects active tab URL and identifies activity type
4. For YouTube: Extracts video ID and fetches metadata via YouTube Data API
5. Calculates duration since last tracking (or activity start)
6. Sends activity data to `POST /api/track-emission`
7. Backend processes and logs the activity
8. Data appears in ENACT dashboard automatically

### 3) View Emission History and Summaries
1. Frontend calls `GET /api/emissions/{date}` or `GET /api/emissions/summary?days=N`
2. Backend aggregates the per-day file(s), returning totals, per-day breakdowns, and counts
3. Frontend renders line/area/bar charts with totals and trends
4. Insights page shows gradient pie charts with activity breakdowns

### 4) Analyze Code for Energy Efficiency
1. User pastes code or uploads a file via Analyzer page
2. Frontend calls `POST /api/analyze-code` (or `POST /api/upload-code` for files)
3. Backend runs static analysis (AST/Radon), estimates energy, and calls OpenRouter
4. If OpenRouter fails, backend produces deterministic fallback suggestions
5. Frontend displays analysis, recommendations, and estimated savings

## 📂 Project Structure

```
ENACT FINAL/
├── backend/
│   ├── api/                         # API helpers & demo data
│   │   ├── demo_data.py             # Demo data generation
│   │   └── codecarbon_test.py       # CodeCarbon testing utilities
│   ├── services/                    # Service layer
│   │   ├── codecarbon_service.py     # CodeCarbon integration wrapper
│   │   └── system_tracker.py        # System resource tracking service
│   ├── logs/                        # Emission JSON logs (generated)
│   │   └── codecarbon/              # CodeCarbon output directory
│   ├── main.py                      # FastAPI app and routes
│   └── test_codecarbon.py          # CodeCarbon integration tests
├── frontend/
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── ActivityBreakdownChart.jsx  # Gradient pie chart
│   │   │   ├── CarbonTracker.jsx    # Activity tracking component
│   │   │   ├── EmissionChart.jsx    # Timeline chart
│   │   │   ├── ErrorBoundary.jsx    # Error handling
│   │   │   └── Sidebar.jsx          # Navigation sidebar
│   │   ├── pages/                   # Page components
│   │   │   ├── Dashboard.jsx        # Main dashboard
│   │   │   ├── Analyzer.jsx         # Code analysis page
│   │   │   ├── Insights.jsx          # Analytics & insights
│   │   │   └── About.jsx            # About page
│   │   ├── context/                 # React context
│   │   │   └── ThemeContext.jsx     # Dark/light theme
│   │   ├── utils/                   # Utilities
│   │   │   └── api.js               # Axios API client
│   │   ├── App.jsx                  # App shell & routing
│   │   └── main.jsx                 # Entry point
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite configuration
├── browser-extension/               # Chrome extension
│   ├── manifest.json                # Extension manifest (v3)
│   ├── background.js                # Background service worker
│   ├── content_youtube.js           # YouTube content script
│   ├── content_gmail.js             # Gmail content script
│   ├── popup.html                   # Extension popup UI
│   ├── popup.js                     # Popup script
│   ├── icons/                       # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── README.md                    # Extension documentation
│   └── INSTALL.md                   # Installation guide
├── logs/                            # Root-level logs (legacy)
├── venv/                            # Python virtual environment
├── requirements.txt                 # Backend dependencies
├── package.json                     # (if exists)
├── README.md                        # This file
├── QUICKSTART.md                    # Quick start guide
├── RUN.bat                          # Windows run script
├── run_backend.bat                  # Backend launcher
├── run_frontend.bat                 # Frontend launcher
└── ...                              # Additional documentation files
```

## 🔌 API Reference

### Emissions & Tracking

#### `POST /api/track-emission`
Track an activity and estimate its carbon footprint.

**Request Body:**
```json
{
  "activity_type": "youtube" | "ott" | "gmail" | "browsing" | "code_execution" | "idle",
  "duration_seconds": 120.5,
  "metadata": {
    "quality": "high" | "low" | "medium",
    "device_type": "mobile" | "desktop" | "server",
    "video_title": "Example Video",
    "channel": "Example Channel"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-15T10:30:00",
    "activity_type": "youtube",
    "duration_seconds": 120.5,
    "energy_kwh": 0.0005,
    "co2_grams": 0.2375,
    "power_watts": 15.0,
    "cpu_load_factor": 1.2,
    "method": "standard_benchmark",
    "metadata": {...}
  },
  "today_total": 1.2345,
  "weekly_total": 8.7654,
  "threshold_alert": {
    "reached": true,
    "type": "daily",
    "suggestions": {...}
  }
}
```

#### `GET /api/emissions/{date}`
Get emission logs for a specific date.

**Path Parameters:**
- `date`: `YYYY-MM-DD` or `"today"`

**Response:**
```json
{
  "date": "2025-01-15",
  "logs": [...],
  "summary": {
    "total_emissions_grams": 1.2345,
    "total_energy_kwh": 0.0026,
    "total_duration_seconds": 3600,
    "activity_count": 15
  }
}
```

#### `GET /api/emissions/summary`
Get aggregated emission summary.

**Query Parameters:**
- `days` (int, default: 7): Number of days to summarize
- `include_demo` (bool, default: false): Generate demo data if no real data
- `all_history` (bool, default: false): Include all available history

**Response:**
```json
{
  "period_days": 7,
  "daily_summaries": [
    {
      "date": "2025-01-15",
      "emissions_grams": 1.2345,
      "energy_kwh": 0.0026,
      "activity_count": 15
    },
    ...
  ],
  "total_emissions_grams": 8.7654,
  "total_energy_kwh": 0.0185
}
```

### Code Analysis

#### `POST /api/analyze-code`
Analyze code for energy efficiency.

**Request Body:**
```json
{
  "code": "def example():\n    return 42",
  "language": "python"
}
```

**Response:**
```json
{
  "success": true,
  "static_analysis": {
    "complexity": {
      "total_complexity": 5,
      "function_complexities": [...],
      "max_nesting_depth": 2
    },
    "metrics": {
      "maintainability_index": 75.5,
      "lines_of_code": 10
    },
    "issues": [...],
    "estimated_flops": 50000,
    "estimated_cpu_cycles": 25000
  },
  "energy_estimate": {
    "energy_kwh": 0.0001,
    "co2_grams": 0.0475,
    "power_watts": 50.0
  },
  "ai_suggestions": {
    "success": true,
    "response": "Optimization suggestions...",
    "model": "qwen/qwen3-coder:free"
  },
  "timestamp": "2025-01-15T10:30:00"
}
```

#### `POST /api/upload-code`
Upload and analyze a code file.

**Request:** Multipart form data with `file` field

**Response:** Same as `POST /api/analyze-code`

### System Health

#### `GET /api/system-metrics`
Get current system resource usage.

**Response:**
```json
{
  "cpu_percent": 25.5,
  "memory_percent": 45.2,
  "memory_used_gb": 3.6,
  "memory_total_gb": 8.0,
  "disk_percent": 60.0,
  "timestamp": "2025-01-15T10:30:00"
}
```

### Testing Endpoints

#### `GET /api/test-openrouter`
Test OpenRouter API connectivity and verify API keys.

**Response:**
```json
{
  "success": true,
  "results": {
    "working_models": [...],
    "failed_models": [...],
    "total_tested": 3,
    "success_count": 2,
    "failure_count": 1
  }
}
```

#### `POST /api/test-codecarbon?duration=5.0`
Test CodeCarbon integration with real tracking session.

**Query Parameters:**
- `duration` (float, default: 5.0): Tracking duration in seconds

**Response:**
```json
{
  "success": true,
  "codecarbon_available": true,
  "tracking_duration_seconds": 5.0,
  "emissions": {
    "energy_kwh": 0.0001,
    "co2_kg": 0.00005,
    "co2_grams": 0.05,
    "duration_seconds": 5.0,
    "country": "USA",
    "region": "Unknown",
    "cpu_model": "Intel Core i7",
    "cpu_power_watts": 15.0,
    "ram_power_watts": 5.0,
    "gpu_power_watts": 0.0
  }
}
```

## 📦 Installation & Setup

### Prerequisites

- **Python**: 3.8+ (3.11 recommended)
  - Check: `python --version`
  - Download: [python.org](https://www.python.org/downloads/)
- **Node.js**: 16+ (18+ recommended)
  - Check: `node --version`
  - Download: [nodejs.org](https://nodejs.org/)
- **npm**: Comes with Node.js
  - Check: `npm --version`
- **Chrome/Edge**: For browser extension (Chromium-based)

### Step 1: Clone or Download the Project

```bash
cd "ENACT FINAL"
```

### Step 2: Backend Setup

#### Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

**Key Dependencies:**
- `fastapi==0.104.1` - Web framework
- `uvicorn[standard]==0.24.0` - ASGI server
- `radon==6.0.1` - Code complexity analysis
- `psutil==5.9.6` - System metrics
- `codecarbon==2.3.4` - Optional enhanced tracking
- `python-dotenv==1.0.0` - Environment variables
- `requests==2.31.0` - HTTP client
- `pydantic==2.5.0` - Data validation

#### Configure Environment Variables (Optional)

Create a `.env` file in the project root or `backend/` directory:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
MISTRAL_API_KEY=your_mistral_key_here
GEMINI_API_KEY=your_gemini_key_here
```

**Note:** The backend includes fallback API keys for local demo purposes, but using your own keys via environment variables is strongly recommended for production use.

### Step 3: Frontend Setup

```bash
cd frontend
npm install
cd ..
```

**Key Dependencies:**
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `recharts` - Chart library
- `tailwindcss` - Styling
- `lucide-react` - Icons

### Step 4: Browser Extension Setup

#### Install Extension in Chrome/Edge

1. Open Chrome/Edge and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **Load unpacked**

4. Select the `browser-extension` folder from the project directory

5. The extension should now appear in your extensions list

6. Verify installation:
   - Extension icon should appear in toolbar
   - Click icon to see status popup
   - Extension automatically starts tracking

#### Configure Extension (Optional)

Edit `browser-extension/background.js` to customize:

```javascript
// Change API endpoint (default: http://localhost:8000)
const API_URL = 'http://your-api-url/api/track-emission';

// Change YouTube API key (if needed)
const YOUTUBE_API_KEY = 'your-youtube-api-key';
```

**Note:** The extension includes a default YouTube Data API key for demo purposes. For production use, obtain your own key from [Google Cloud Console](https://console.cloud.google.com/).

## ▶️ Running the Application

### Option 1: Use Batch Scripts (Windows)

**Double-click these files:**
- `run_backend.bat` - Starts backend server
- `run_frontend.bat` - Starts frontend dev server
- `RUN.bat` - Starts both (if available)

### Option 2: Manual Start

#### Terminal 1 - Backend

**Windows:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**macOS/Linux:**
```bash
cd backend
source ../venv/bin/activate
python main.py
```

**Or using uvicorn directly:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
✅ CodeCarbon is installed and available
✅ System tracker started
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access the Application

1. **Web Application**: Open `http://localhost:5173` (or port shown in terminal)
2. **API Documentation**: Open `http://localhost:8000/docs` (Swagger UI)
3. **Alternative API Docs**: `http://localhost:8000/redoc`

### Verify Browser Extension

1. Ensure ENACT backend is running on `http://localhost:8000`
2. Open YouTube and play a video
3. Check browser console (F12) for tracking logs:
   ```
   ENACT Activity Tracker: Tracked youtube activity
   ```
4. Check Network tab for POST requests to `/api/track-emission`
5. Verify data appears in ENACT dashboard

## 🔐 Configuration & Environment

### Backend Configuration

#### Environment Variables (`.env`)

```env
# OpenRouter API Keys (for AI suggestions)
OPENROUTER_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

#### CORS Settings

Edit `backend/main.py` to adjust CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Log Directory

Logs are stored in `logs/` directory as `emissions_YYYY-MM-DD.json`. To change:

```python
LOG_DIR = "custom_logs_directory"
```

### Frontend Configuration

#### API Endpoint

Edit `frontend/src/utils/api.js` to change backend URL:

```javascript
const API_BASE_URL = 'http://localhost:8000';
```

### Browser Extension Configuration

#### API Endpoint

Edit `browser-extension/background.js`:

```javascript
const API_URL = 'http://your-api-url:port/api/track-emission';
```

#### YouTube API Key

Edit `browser-extension/background.js`:

```javascript
const YOUTUBE_API_KEY = 'your-youtube-api-key';
```

**Getting a YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict key to YouTube Data API v3 (optional but recommended)

#### Tracking Interval

Edit `browser-extension/background.js`:

```javascript
const TRACKING_INTERVAL = 10000; // milliseconds (10 seconds)
```

## 📊 Emission Model & Assumptions

### Grid Intensity

- **Default**: ~475 g CO₂/kWh (global average)
- Based on CodeCarbon and Green Algorithms benchmarks
- Adjustable in `backend/main.py`:

```python
GRID_INTENSITY = 475  # g CO₂ per kWh
```

### Activity Power Baselines

Approximate power consumption rates (watts):

| Activity | Power (W) | Description |
|----------|-----------|-------------|
| YouTube | 15W | Video streaming (device + network) |
| OTT Streaming | 18W | Higher quality streaming |
| Browsing | 8W | General web browsing |
| Gmail | 5W | Email operations (lower resource use) |
| Code Execution | 50W | Code compilation/execution |
| Idle | 3W | Idle state |

### Adjustment Factors

- **CPU Load Factor**: Scales power based on real-time CPU utilization (via psutil)
  - Formula: `power = base_power × cpu_load_factor`
  - Normalized between 0.5 and 2.0
- **Quality Adjustments**:
  - `quality=high`: +30% energy
  - `quality=low`: -30% energy
- **Device Type Adjustments**:
  - `device_type=mobile`: -50% energy
  - `device_type=server`: +50% energy

### Code Analysis Energy Estimation

- Based on static analysis metrics:
  - Lines of code (LOC)
  - Cyclomatic complexity
  - Nesting depth
- Heuristic formula: `energy ≈ LOC × complexity_factor × base_rate`
- **Note**: These are indicative estimates, not actual measurements

## 🧠 AI Integration & Fallbacks

### OpenRouter Integration

ENACT uses OpenRouter for multi-model AI access:

- **Primary Models**:
  - `qwen/qwen3-coder:free` - Code optimization
  - `mistralai/mistral-7b-instruct:free` - General suggestions
  - `google/gemini-2.0-flash-exp:free` - Alternative suggestions

- **Fallback Strategy**:
  1. Try primary model with 3-second timeout
  2. If fails, try alternative models
  3. If all fail, use deterministic fallback suggestions
  4. Ensures Analyzer always returns useful results

### Fallback Suggestions

When AI is unavailable, ENACT generates suggestions based on:
- Static analysis results (complexity, maintainability)
- Code patterns (nested loops, high complexity)
- General best practices
- Energy-efficient programming principles

## 🌐 Browser Extension Details

### Features

- **Automatic Activity Detection**:
  - YouTube video playback
  - Gmail reading/composing
  - OTT streaming (Netflix, Hulu, Disney+, Amazon Prime, HBO Max, Peacock)
  - General browsing

- **Video Metadata Extraction**:
  - Video title, channel name, duration
  - View count, publish date
  - Fetched via YouTube Data API v3

- **Real-Time Tracking**:
  - Checks active tab every 10 seconds
  - Calculates duration automatically
  - Sends data to ENACT API

- **Privacy & Security**:
  - All data sent to local ENACT API only
  - No external servers (except YouTube API for metadata)
  - Activity data stored locally in browser storage
  - Only tracks URLs and tab titles, not content

### Permissions Explained

The extension requires these permissions:

- `activeTab`: Access active tab information
- `scripting`: Inject content scripts for activity detection
- `tabs`: Monitor tab changes and URLs
- `storage`: Store tracking state locally
- `host_permissions`: Access YouTube, Gmail, and OTT service domains

### Supported Platforms

- **YouTube**: `youtube.com`, `youtu.be`
- **Gmail**: `mail.google.com`
- **OTT Services**:
  - Netflix (`netflix.com`)
  - Hulu (`hulu.com`)
  - Disney+ (`disney.com`, `disneyplus.com`)
  - Amazon Prime Video (`amazon.com`, `primevideo.com`)
  - HBO Max (`hbomax.com`)
  - Peacock (`peacocktv.com`)

### Extension Workflow

1. **Installation**: Extension loads and starts background service worker
2. **Tab Monitoring**: Every 10 seconds, checks active tab URL
3. **Activity Detection**: Identifies activity type from URL patterns
4. **Metadata Fetching**: For YouTube, fetches video details via API
5. **Data Transmission**: Sends activity data to ENACT API
6. **Dashboard Update**: Data appears in ENACT dashboard automatically

### Troubleshooting Extension

**Extension Not Tracking:**
1. Verify ENACT backend is running on `http://localhost:8000`
2. Check browser console (F12) for errors
3. Verify extension is enabled in `chrome://extensions/`
4. Check Network tab for API requests
5. Ensure extension has required permissions

**API Connection Errors:**
- Ensure ENACT backend is running
- Check CORS settings in backend (`main.py`)
- Verify API endpoint URL in `background.js`
- Check browser console for CORS errors

**YouTube API Errors:**
- Check YouTube Data API quota limits
- Verify API key is valid
- Check browser console for API errors
- Ensure YouTube Data API v3 is enabled in Google Cloud Console

## 🧪 Testing & Validation

### Backend Testing

#### Test CodeCarbon Integration

```bash
cd backend
python test_codecarbon.py
```

Or use the API endpoint:
```bash
curl -X POST "http://localhost:8000/api/test-codecarbon?duration=5.0"
```

#### Test OpenRouter API

```bash
curl http://localhost:8000/api/test-openrouter
```

#### Test Code Analysis

```bash
curl -X POST "http://localhost:8000/api/analyze-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "def example():\n    return 42", "language": "python"}'
```

### Frontend Testing

1. **Manual Testing**:
   - Navigate to Dashboard and track activities
   - Upload code files in Analyzer
   - View Insights page for charts and summaries
   - Test dark/light theme toggle

2. **Browser Console**:
   - Open DevTools (F12)
   - Check for JavaScript errors
   - Verify API calls in Network tab

### Extension Testing

1. **Load Extension**: Follow installation steps
2. **Test YouTube**: Play a video and check console logs
3. **Test Gmail**: Open Gmail and check tracking
4. **Verify API**: Check Network tab for POST requests
5. **Check Dashboard**: Verify data appears in ENACT

## 🧰 Troubleshooting

### Backend Issues

**Backend won't start:**
- Check Python version: `python --version` (needs 3.8+)
- Verify dependencies: `pip list | grep fastapi`
- Check port 8000 is free: `netstat -ano | findstr :8000` (Windows) or `lsof -i :8000` (macOS/Linux)
- Try alternate port: `uvicorn main:app --port 8001`

**Module not found errors:**
- Activate virtual environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (macOS/Linux)
- Reinstall dependencies: `pip install -r requirements.txt`
- Check `requirements.txt` is in correct location

**Radon import error:**
- Install radon: `pip install radon==6.0.1`
- Backend includes fallback when Radon is unavailable

**CORS errors:**
- Update CORS origins in `backend/main.py`
- Ensure frontend URL matches allowed origins
- Check browser console for specific CORS error messages

### Frontend Issues

**Frontend won't start:**
- Check Node.js version: `node --version` (needs 16+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check port conflicts (default: 5173 for Vite)
- Try alternate port: `npm run dev -- --port 3000`

**API connection errors:**
- Verify backend is running on `http://localhost:8000`
- Check `frontend/src/utils/api.js` for correct API URL
- Check browser console for network errors
- Verify CORS settings in backend

**White screen:**
- Check browser console for JavaScript errors
- Verify React components are rendering
- Check `TROUBLESHOOTING_WHITE_SCREEN.md` for detailed guide

**Charts not displaying:**
- Check browser console for Recharts errors
- Verify data is being fetched from API
- Check Network tab for API responses

### Extension Issues

**Extension not loading:**
- Verify Developer mode is enabled
- Check `manifest.json` for syntax errors
- Check browser console for extension errors
- Try reloading extension in `chrome://extensions/`

**Extension not tracking:**
- Verify ENACT backend is running
- Check extension popup for status
- Check browser console (F12) for errors
- Verify extension has required permissions
- Check Network tab for API requests

**YouTube API errors:**
- Verify YouTube Data API key is valid
- Check API quota limits in Google Cloud Console
- Ensure YouTube Data API v3 is enabled
- Check browser console for API error messages

### General Issues

**No data in dashboard:**
- Start tracking activities first (they generate data)
- Check `logs/` folder for emission JSON files
- Verify API endpoints are working
- Check browser console for errors

**Data not persisting:**
- Check `logs/` directory permissions
- Verify JSON files are being created
- Check backend logs for file write errors
- Ensure sufficient disk space

## 📈 Performance & Non-Functional Requirements

### Reliability

- **No External Dependencies**: JSON-based persistence eliminates database failures
- **Immediate Persistence**: Data flushed to disk on every activity tracking
- **Graceful Degradation**: Works without AI, CodeCarbon, or Radon
- **Error Handling**: Comprehensive try-catch blocks and fallback mechanisms

### Resilience

- **AI Fallbacks**: Deterministic suggestions when AI is unavailable
- **Optional Dependencies**: Radon and CodeCarbon are optional
- **Timeout Protection**: API calls have timeouts to prevent hanging
- **Error Recovery**: Frontend continues working even if some API calls fail

### Portability

- **Cross-Platform**: Works on Windows, macOS, and Linux
- **No Database**: JSON files work anywhere
- **Self-Contained**: All dependencies in `requirements.txt` and `package.json`
- **Windows Helpers**: `.bat` scripts for Windows users

### Privacy

- **Local Processing**: Code analysis happens locally
- **Minimal Data Sharing**: Only code snippets sent to OpenRouter (when enabled)
- **No Tracking**: No analytics or telemetry
- **User Control**: All data stored locally, user can delete anytime

### Transparency

- **Open Source**: All code is visible and auditable
- **Documented Assumptions**: Emission factors and formulas are documented
- **Adjustable Parameters**: Users can modify emission factors in code
- **Clear Attribution**: Sources and benchmarks are cited

## 🗺️ Roadmap & Future Enhancements

### Short-Term

- [ ] Expand language support for static analysis (JavaScript, Java, C++)
- [ ] Enhanced browser extension with more OTT platforms
- [ ] Real-time notifications for emission thresholds
- [ ] Export functionality (PDF reports, CSV data)

### Medium-Term

- [ ] User profiles and multi-device aggregation
- [ ] Pluggable regional grid intensity sources (real-time)
- [ ] Machine learning models for better energy estimation
- [ ] Integration with CI/CD pipelines

### Long-Term

- [ ] Mobile app for activity tracking
- [ ] Team/organization dashboards
- [ ] Carbon offset recommendations
- [ ] Integration with cloud providers (AWS, GCP, Azure)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**: Create your own fork
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Follow Code Style**: Match existing code style and structure
4. **Add Tests**: Include tests for new features where applicable
5. **Update Documentation**: Update README and relevant docs
6. **Commit Changes**: Write clear commit messages
7. **Push to Branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request**: Provide clear description and screenshots

### Development Guidelines

- **Code Style**: Follow PEP 8 for Python, ESLint for JavaScript
- **Documentation**: Add docstrings and comments for complex logic
- **Testing**: Test new features manually and add unit tests where possible
- **Error Handling**: Always include error handling and fallbacks

## 📄 License

Educational and demonstration use. Review and adapt before production deployment.

---

## 📚 Additional Documentation

- **QUICKSTART.md**: 5-minute quick start guide
- **browser-extension/README.md**: Detailed extension documentation
- **browser-extension/INSTALL.md**: Extension installation guide
- **RUNNING_GUIDE.md**: Detailed running instructions
- **TROUBLESHOOTING_WHITE_SCREEN.md**: Frontend troubleshooting
- **API_KEY_SETUP.md**: API key configuration guide

## 🆘 Support & Contact

For issues, questions, or contributions:

1. Check existing documentation files
2. Review error messages in terminal/browser console
3. Check GitHub issues (if applicable)
4. Ensure all dependencies are installed correctly

---

**Built with ❤️ to make greener software the default choice.**

**ENACT - Making Digital Sustainability Tangible, One Line of Code at a Time.**
