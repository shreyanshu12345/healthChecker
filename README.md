# HealthChecker 🚀

HealthChecker is a modern web application designed to monitor the status and response latencies of web pages/URLs in real-time. It features a robust Python Flask backend, a reactive React + Vite frontend with charts for visualization, and is backed by a MongoDB database for historical analysis. The entire stack is containerized with Docker and configured for local orchestration with Docker Compose.

---

## 🏗️ Architecture & Component Overview

The application is split into two major components under a unified directory layout:

```
healthChecker/
├── .github/
│   └── workflows/
│       └── tests.yml             # CI pipeline running pytest and vitest
├── backend/
│   ├── app.py                    # Flask API server & URL checking logic
│   ├── test_app.py               # Backend unit tests using Pytest & unittest.mock
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile                # Backend containerization
├── frontend/
│   ├── src/                      # React frontend codebase
│   │   ├── components/           # Reusable UI components (Nav, etc.)
│   │   ├── pages/                # Pages: Home, History, Metrics
│   │   └── main.jsx              # Application entrypoint
│   ├── nginx.conf                # Nginx reverse proxy configuration
│   ├── package.json              # Node.js dependencies & scripts
│   └── Dockerfile                # Multi-stage frontend containerization
└── docker-compose.yml            # Multi-container local orchestration
```

### 🔹 Backend (Flask)
The backend acts as the URL-monitoring coordinator and analytics engine:
- **URL Health Verification:** Uses Python's `requests` library to test target URLs. Handles connection errors, timeouts (10 seconds), invalid URLs, and HTTP response codes.
- **Data Persistence:** Connects to MongoDB to store logs of each health check (URLs checked, success status, response status codes, latencies in milliseconds, and UTC timestamps).
- **Advanced Aggregation Metrics:** Leverages MongoDB's Aggregation Framework to calculate live stats including overall uptime percentages, average/min/max latencies, and time-series data for sparkline visualizers.

### 🔹 Frontend (React + Vite)
A fast, modern Single Page Application (SPA):
- **User Interface:** Clean, premium styling built with Vanilla CSS.
- **Interactive Visualizations:** Renders interactive time-series latency charts and sparklines using **Recharts**.
- **Page Routing:** Navigates seamlessly across views (Home, History, and Metrics) via `react-router-dom`.

### 🔹 Reverse Proxy & Production Server (Nginx)
In production/Docker setup, an **Nginx** server hosts the built React static assets and acts as a reverse proxy, forwarding requests starting with `/check`, `/history`, and `/metrics` directly to the Flask backend service container.

---

## ⚡ Key Features

1. **Multi-URL Monitoring:** Validate multiple URLs simultaneously.
2. **Instant Status Reports:** Provides up/down state, HTTP status codes, and latency (ms) for checked URLs.
3. **Uptime & Latency Metrics:** View real-time aggregate dashboard stats per URL:
   - Overall uptime percentage.
   - Average, minimum, and maximum latency.
   - Chronological latency line charts.
4. **Detailed History Log:** Explore a complete searchable history of monitored URLs.
5. **Robust Local Mocking & Testing:** Fully tested frontend and backend codebases ensuring stable behavior.

---

## 🛠️ Prerequisites

Before getting started, make sure you have the following installed on your machine:
- **Docker** and **Docker Compose** *(Recommended)*
- Or, for manual execution:
  - **Python 3.12+**
  - **Node.js 20+** and **npm**
  - **MongoDB** instance (local or Atlas cluster URL)

---

## 🚀 Getting Started & Setup

### Option A: Run via Docker Compose (Recommended)

This is the fastest way to spin up the entire stack (React frontend, Flask backend, and routing configuration) with automated container builds.

1. Create a `.env` file inside the `backend/` directory and configure your MongoDB connection:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/healthchecker?retryWrites=true&w=majority
   ```
2. Run the application from the root directory:
   ```bash
   docker-compose up --build
   ```
3. Open your browser and navigate to:
   - **Frontend App:** [http://localhost](http://localhost) (runs on port 80)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)

---

### Option B: Local Manual Setup

If you prefer to run services locally without Docker:

#### 1. Setup Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file inside `backend/` with your credentials:
   ```env
   MONGO_URI=mongodb://localhost:27017
   ```
5. Run the Flask application:
   ```bash
   python app.py
   ```
   *The backend will start running on [http://localhost:5000](http://localhost:5000).*

#### 2. Setup Frontend
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```
   *The React application will be available at the local address printed by Vite (typically [http://localhost:5173](http://localhost:5173)).*

---

## 🧪 Testing

The repository has comprehensive test suites configures for both backend and frontend layers.

### Backend Unit Tests (Pytest)
Pytest validates Flask controllers, URL checking, and response serialization by mocking MongoDB clients and HTTP web calls.

To run the backend tests:
1. Navigate to `backend/` and activate the virtual environment.
2. Run the test command:
   ```bash
   pytest test_app.py -v
   ```

### Frontend Tests (Vitest + React Testing Library)
Vitest verifies component rendering, user interactions (e.g., inputting URLs, submitting forms), router transitions, and responsive charts.

To run frontend tests:
1. Navigate to `frontend/`
2. Run the test command:
   ```bash
   npm run test
   ```

---

## 🌐 API Reference

### 1. Check URLs
Checks the status of a list of URLs and persists the results.
- **Endpoint:** `POST /check`
- **Body Pattern:**
  ```json
  {
    "urls": ["google.com", "github.com", "https://httpbin.org/status/404"]
  }
  ```
- **Response Example:**
  ```json
  {
    "results": [
      {
        "url": "https://google.com",
        "status": "up",
        "status_code": 200,
        "latency_ms": 112
      },
      {
        "url": "https://httpbin.org/status/404",
        "status": "up",
        "status_code": 404,
        "latency_ms": 184
      }
    ]
  }
  ```

### 2. Check History
Fetches historical records of checked URLs.
- **Endpoint:** `GET /history`
- **Parameters:**
  - `limit`: *(Optional, default: 50, max: 200)* Number of records to return.
  - `url`: *(Optional)* Filter logs by a specific URL.
- **Response Example:**
  ```json
  {
    "history": [
      {
        "url": "https://google.com",
        "status": "up",
        "status_code": 200,
        "latency_ms": 112,
        "checked_at": "2026-05-26T05:30:15.123000+00:00"
      }
    ]
  }
  ```

### 3. Aggregate Metrics
Provides system-wide and individual site performance summaries using MongoDB aggregation.
- **Endpoint:** `GET /metrics`
- **Response Example:**
  ```json
  {
    "summary": {
      "avg_latency_ms": 148,
      "overall_uptime_pct": 98.2,
      "total_checks": 120,
      "urls_monitored": 2
    },
    "per_url": [
      {
        "url": "https://google.com",
        "total": 60,
        "up_count": 60,
        "avg_latency": 110,
        "min_latency": 95,
        "max_latency": 130,
        "last_status": "up",
        "last_checked": "2026-05-26T05:30:15.123000+00:00",
        "uptime_pct": 100.0,
        "sparkline": [
          { "t": "2026-05-26T05:25:00Z", "l": 105, "s": "up" }
        ]
      }
    ]
  }
  ```

### 4. URL Latency Timeline
Fetches history logs formatted for rendering charting datasets.
- **Endpoint:** `GET /metrics/timeline`
- **Parameters:**
  - `url`: *(Required)* Target URL to query.
  - `limit`: *(Optional, default: 100, max: 500)*
- **Response Example:**
  ```json
  {
    "url": "https://google.com",
    "timeline": [
      {
        "t": "2026-05-26T05:25:00Z",
        "latency_ms": 105,
        "status": "up",
        "status_code": 200
      }
    ]
  }
  ```

---

## ⚙️ CI/CD pipeline
Automated checks are configured under GitHub Actions:
- **Triggers:** Runs automatically on push or pull request to the `main` branch.
- **Validation:** Performs concurrent jobs for:
  - **Backend (pytest):** Installs Python packages and executes backend test files.
  - **Frontend (vitest):** Restores Node environment from package lock cache, installs modules, and runs Vitest tests.
