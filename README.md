# College Mess Planning & Food Waste Prediction System

A complete full-stack web application designed for university hostel mess management with a capacity of **556 students**. Built as an integrated semester project spanning **Machine Learning**, **Software Engineering**, and **Human-Computer Interaction (HCI)**.

The system empowers mess supervisors to forecast expected student turnout, required meal volume (kg), and potential food wastage (kg) across Breakfast, Lunch, Snacks, and Dinner to minimize food waste while preventing kitchen stockouts.

---

## 1. System Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router v7, React Hook Form, Zod v4, Recharts, Lucide Icons |
| **Backend** | Python 3.14+, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite |
| **Machine Learning** | scikit-learn (Pipeline, ColumnTransformer, OneHotEncoder, ExtraTreesRegressor), pandas, numpy, joblib |
| **Authentication & Security** | JWT Access Tokens (HS256 via `pyjwt`), password hashing (`bcrypt`), CORS middleware |
| **Testing** | `pytest` + `httpx` (Backend), `vitest` + `@testing-library/react` (Frontend) |

---

## 2. Machine Learning Architecture & Dataset Limitations

### 2.1 Model Specifications
- **Target Variables (3 Regression Outputs):**
  1. `expected_students` — Projected student attendance (clamped to $[0, \text{Capacity}]$).
  2. `expected_food_required_kg` — Cooked batch requirement in kilograms ($\ge 0$).
  3. `expected_food_wastage_kg` — Anticipated leftover buffer in kilograms ($0 \le \text{waste} \le \text{food required}$).
- **Input Features (10 Predictors):**
  - Categorical: `day_of_week`, `is_weekend`, `is_holiday`, `exam_on_day`, `college_event`, `weather_condition`, `meal_type`, `main_menu_items`, `special_meal`
  - Numeric: `mess_capacity_students` (Default: `556`)
- **Pipeline Architecture:**
  - `OneHotEncoder(handle_unknown="ignore", sparse_output=False)` for categorical fields.
  - Tree-based regressor: `ExtraTreesRegressor(n_estimators=250, min_samples_leaf=2, random_state=42)`.
  - Chronological 80/20 train/test split on unique calendar dates.

### 2.2 Test Set Evaluation Metrics (Holdout 20%)

| Target | MAE | RMSE | $R^2$ Score | Holdout Test Mean |
|---|---|---|---|---|
| `expected_students` | 0.5245 students | 2.4240 students | 0.9991 | 343.18 students |
| `expected_food_required_kg` | 0.2834 kg | 1.4358 kg | 0.9995 | 134.99 kg |
| `expected_food_wastage_kg` | 0.0112 kg | 0.0528 kg | 0.9997 | 6.51 kg |

### 2.3 Critical Dataset Limitation Disclaimer
> **Academic Transparency Notice:** The dataset labels (`expected_students`, `expected_food_required_kg`, `expected_food_wastage_kg`) and several contextual features in `mess_planning_training_dataset_556_students_patterned.csv` were produced using synthetic rule-based operational patterns rather than physical plate waste logs or scale measurements at an active college dining hall.  
> 
> The high $R^2$ scores and low error metrics quantify mathematical fit to these underlying formulas and **must not be characterized as real-world accuracy or guaranteed food waste reductions**. In an operational deployment, models should be calibrated against physical weighing scales over time.

---

## 3. Directory Structure

```text
UI/
├── backend/
│   ├── app/
│   │   ├── config.py             # Settings, secrets, and environment vars
│   │   ├── database.py           # SQLAlchemy engine & session factory
│   │   ├── models.py             # User and Prediction ORM models
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── security.py           # Bcrypt hashing, JWT generation, get_current_user
│   │   ├── ml_service.py         # Model loading, inference, & bound clamping
│   │   ├── routers/
│   │   │   ├── auth.py           # /api/auth (register, login, me, logout)
│   │   │   ├── predictions.py    # /api/predictions (CRUD & menu options)
│   │   │   ├── dashboard.py      # /api/dashboard (summary & recent entries)
│   │   │   ├── analytics.py      # /api/analytics (timeline & meal metrics)
│   │   │   └── model_info.py     # /api/model (metadata & limitations)
│   │   └── main.py               # FastAPI application, lifespan, & CORS
│   ├── tests/
│   │   ├── conftest.py           # In-memory SQLite fixtures & auth clients
│   │   ├── test_auth.py          # Registration, login, duplicate check tests
│   │   ├── test_predictions.py   # Creation, validation bounds, ownership tests
│   │   ├── test_dashboard.py     # Empty states & aggregation tests
│   │   └── test_model.py         # Health checks & ML inference tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                  # Typed fetch client and endpoint modules
│   │   ├── components/           # Navbar, Sidebar, Layout, StatCard, Badge, Modal
│   │   ├── context/              # AuthContext for session management
│   │   ├── pages/                # Login, Register, Dashboard, NewPrediction,
│   │   │                         # PredictionHistory, Analytics, ModelInfo, Profile
│   │   ├── tests/                # Vitest component tests
│   │   ├── types/                # Shared TypeScript definitions
│   │   ├── App.tsx               # Client routes & protected route wrapper
│   │   ├── main.tsx              # React DOM mounting
│   │   └── index.css             # Tailwind CSS & accessible focus rings
│   ├── package.json
│   ├── tailwind.config.js        # Restrained color tokens
│   ├── vite.config.ts            # Vite bundler & proxy configuration
│   └── .env.example
├── train_model.py                # Standalone model training CLI script
├── mess_prediction_model.joblib  # Trained model bundle
├── mess_model_metrics.json       # Chronological evaluation metrics
├── HCI_RATIONALE.md              # Nielsen heuristics & WCAG 2.2 AA mapping
├── USABILITY_CHECKLIST.md        # 5-task manual usability test checklist
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Installation & Setup Instructions

### 4.1 Prerequisites
- **Python**: 3.10+ (tested on Python 3.14.5)
- **Node.js**: 18+ (tested on Node v24.16.0)
- **npm**: 9+ (tested on npm 11.13.0)

### 4.2 Backend Setup & Execution
1. Navigate to the project root directory:
   ```bash
   cd c:/Users/shiva/Desktop/college/mllab/HCI/UI
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Configure environment variables (a pre-configured `.env` or defaults will work):
   ```bash
   copy backend\.env.example backend\.env
   ```
5. Start the FastAPI development server:
   ```bash
   python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API Documentation (Swagger UI): `http://localhost:8000/docs`
   - API Health Endpoint: `http://localhost:8000/api/health`

### 4.3 Frontend Setup & Execution
1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install frontend packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at `http://localhost:5173/`.

---

## 5. Model Retraining Script

To retrain the ExtraTreesRegressor models using the patterned dataset:
```bash
python train_model.py --data mess_planning_training_dataset_556_students_patterned.csv --model-out mess_prediction_model.joblib --metrics-out mess_model_metrics.json
```
If the CSV is not present, the script safely falls back to inspecting the supplied pre-trained model bundle.

---

## 6. Example API Requests and Responses

### 6.1 User Registration (`POST /api/auth/register`)
**Request:**
```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{
  "username": "hostel_manager",
  "email": "manager@college.edu",
  "password": "SecurePassword123!",
  "full_name": "Mess Supervisor"
}
```
**Response (`201 Created`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "hostel_manager",
    "email": "manager@college.edu",
    "full_name": "Mess Supervisor",
    "role": "manager",
    "is_active": true,
    "created_at": "2026-10-14T06:10:00Z"
  }
}
```

### 6.2 User Authentication (`POST /api/auth/login`)
**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username_or_email": "hostel_manager",
  "password": "SecurePassword123!"
}
```
**Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "hostel_manager",
    "email": "manager@college.edu",
    "full_name": "Mess Supervisor",
    "role": "manager",
    "is_active": true,
    "created_at": "2026-10-14T06:10:00Z"
  }
}
```

### 6.3 Generate Meal Prediction (`POST /api/predictions`)
**Request:**
```http
POST /api/predictions HTTP/1.1
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "date": "2026-10-19",
  "meal_type": "Lunch",
  "main_menu_items": "Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita",
  "special_meal": "No",
  "mess_capacity_students": 556,
  "is_holiday": false,
  "exam_on_day": false,
  "college_event": false,
  "weather_condition": "Clear",
  "notes": "Regular Monday schedule"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "user_id": 1,
  "date": "2026-10-19",
  "day_of_week": "Monday",
  "is_weekend": false,
  "is_holiday": false,
  "exam_on_day": false,
  "college_event": false,
  "weather_condition": "Clear",
  "meal_type": "Lunch",
  "main_menu_items": "Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita",
  "mess_capacity_students": 556,
  "special_meal": "No",
  "expected_students": 461.7,
  "expected_food_required_kg": 226.21,
  "expected_food_wastage_kg": 10.30,
  "model_version": "1.0.0",
  "notes": "Regular Monday schedule",
  "created_at": "2026-10-14T06:15:00Z",
  "waste_percentage": 4.55,
  "food_per_student_kg": 0.49
}
```

### 6.4 Dashboard Summary (`GET /api/dashboard/summary`)
**Request:**
```http
GET /api/dashboard/summary HTTP/1.1
Authorization: Bearer <access_token>
```
**Response (`200 OK`):**
```json
{
  "total_predictions": 1,
  "avg_expected_students": 461.7,
  "avg_expected_food_kg": 226.21,
  "avg_expected_wastage_kg": 10.30,
  "avg_waste_percentage": 4.55,
  "recent_predictions": [...],
  "meal_wise_summary": [
    {
      "meal_type": "Lunch",
      "count": 1,
      "avg_expected_students": 461.7,
      "avg_expected_food_kg": 226.21,
      "avg_expected_wastage_kg": 10.30,
      "avg_waste_percentage": 4.55
    }
  ],
  "has_history": true
}
```

### 6.5 Model Information (`GET /api/model/info`)
**Request:**
```http
GET /api/model/info HTTP/1.1
```
**Response (`200 OK`):**
```json
{
  "model_version": "1.0.0",
  "algorithm": "ExtraTreesRegressor (n_estimators=250, min_samples_leaf=2) with OneHotEncoder",
  "dataset_name": "mess_planning_training_dataset_556_students_patterned.csv",
  "total_rows": 4380,
  "train_rows": 3504,
  "test_rows": 876,
  "train_test_split_method": "Chronological 80/20 train/test split on unique calendar dates",
  "features": ["day_of_week", "is_weekend", "is_holiday", "exam_on_day", "college_event", "weather_condition", "meal_type", "main_menu_items", "mess_capacity_students", "special_meal"],
  "targets": ["expected_students", "expected_food_required_kg", "expected_food_wastage_kg"],
  "metrics": {
    "expected_students": {"MAE": 0.5245, "RMSE": 2.424, "R2": 0.9991},
    "expected_food_required_kg": {"MAE": 0.2834, "RMSE": 1.4358, "R2": 0.9995},
    "expected_food_wastage_kg": {"MAE": 0.0112, "RMSE": 0.0528, "R2": 0.9997}
  },
  "capacity_default": 556,
  "limitations_disclaimer": "Important Disclaimer: The dataset labels and certain contextual indicators were produced using synthetic rule-based operational patterns rather than physical scales..."
}
```

---

## 7. Testing & Verification

### 7.1 Backend Test Suite (pytest)
To execute the automated backend test suite:
```bash
python -m pytest backend/tests -v
```
**Test Coverage Includes:**
- `test_auth.py`: Registration, duplicate username/email rejection, bcrypt password hashing, login via username & email, bad password handling, unauthorized access protection, and logout.
- `test_predictions.py`: Generation, physical bounds validation ($0 \le \text{students} \le 556$, $\text{waste} \le \text{food}$), date auto-derivation, malformed payload validation, ownership isolation (User A cannot inspect/delete User B's records), search & meal filters.
- `test_dashboard.py`: Empty state handling (returns zeroed metrics and `has_history=false` without invented stats), and populated aggregates.
- `test_model.py`: API health check, model info metadata, and direct ML inference pipeline validation.
- **Result:** `23 passed in 5.31s`.

### 7.2 Frontend Component Tests (Vitest)
To execute frontend component tests:
```bash
cd frontend
npm run test
```
**Test Coverage Includes:**
- `StatCard.test.tsx`: Correct rendering of values, labels, units, and custom semantic styling.
- `Badge.test.tsx`: Semantic icons, aria-hidden attributes, and text indicators.
- `Modal.test.tsx`: Dialog role, title binding, escape handling, and close callbacks.
- **Result:** `3 test files, 6 passed in 1.70s`.

### 7.3 Frontend Production Build Validation
To ensure full TypeScript and bundling compatibility:
```bash
cd frontend
npm run build
```
- **Result:** TypeScript compile (`tsc -b`) and Vite production bundle generated without errors (`dist/index.html`, `dist/assets/`).

---

## 8. Human-Computer Interaction & Accessibility Highlights

- **Palette:** White `#FFFFFF`, Neutral `#F8FAFC`, Borders `#E2E8F0`, Dark Text `#1E293B`, Primary Blue `#2563EB`, Success `#15803D`, Warning `#B45309`.
- **Contrast:** Exceeds WCAG 2.2 AA minimums (Body text contrast is 12.6:1).
- **Usability Heuristics:**
  - Auto-derives day of week and weekend status from calendar date selection (recognition over recall).
  - Pre-fills `"Special"` menu when special feast is selected while preserving manager editing.
  - Form validation preserves inputs on error so managers never lose progress.
  - Confirmation modals for destructive deletions (user control & error recovery).
- **Accessibility:** Keyboard skip link (`#main-content`), visible focus rings, ARIA dialog roles, live announcements for screen readers, and an **accessible table alternative** for all visual charts.
- Detailed design rationale and testing checklists are documented in:
  - [HCI_RATIONALE.md](file:///c:/Users/shiva/Desktop/college/mllab/HCI/UI/HCI_RATIONALE.md)
  - [USABILITY_CHECKLIST.md](file:///c:/Users/shiva/Desktop/college/mllab/HCI/UI/USABILITY_CHECKLIST.md)






the menu items should be decided upon by itself after i select the date and the meal type(breakfast,lunch etc) from the options available (incase of special dinner keep the items section as special) , 
 also as each month the menu changes the changes based on it should be easy and the predicting model should be trained accodingly as well and the prefomance and accuracy should not decrease