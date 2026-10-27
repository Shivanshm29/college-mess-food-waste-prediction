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

## 7. Student Meal Intentions & Persistent Workflow

The system provides an end-to-end, role-segregated workflow for hostel students to declare meal attendance intentions in advance:

### 7.1 Student Intention Workflow
1. **Authentication & Identity**: Students authenticate via JWT (`/api/auth/login`). The backend derives the student identity exclusively from the authenticated token; student ID supplied by client payloads is never trusted.
2. **Meal Options & Menus**: For any selected date, students view Breakfast, Lunch, and Dinner with published menu items, service hours, and cutoff deadlines (`/api/student/meals`).
3. **Intentions**:
   - `likely` — Likely to attend
   - `unlikely` — Not attending
4. **Revisit Persistence**: When a student revisits the student portal, their previously saved intention is loaded and displayed.
5. **Modification & Withdrawal**: Students can freely change or withdraw their response up until the configured cutoff time (e.g. 6:30 AM for Breakfast, 11:00 AM for Lunch, 6:00 PM for Dinner).
6. **Strict Deadline Enforcement**: Submissions or withdrawals after the cutoff deadline are rejected with `HTTP 400 Bad Request` on both the frontend and backend.

### 7.2 Database Schema & Data Integrity
The application uses SQLite with SQLAlchemy ORM and automatic schema initialization:

- **`meal_intentions` Table**:
  - `id`: Integer Primary Key (indexed)
  - `user_id`: Integer Foreign Key referencing `users.id` (indexed)
  - `date`: String `YYYY-MM-DD` (indexed)
  - `meal_type`: String (`Breakfast`, `Lunch`, `Dinner`) (indexed)
  - `status`: String (`likely`, `unlikely`, `unsure`) (indexed)
  - `notes`: Text (optional student dietary/absence notes)
  - `created_at`: DateTime (record creation)
  - `updated_at`: DateTime (last modification)
  - **Uniqueness Constraint**: `UniqueConstraint("user_id", "date", "meal_type")` ensures a student can have at most one current record per meal date and meal type. Simultaneous submissions perform an atomic upsert in a single transaction.
- **`meal_intention_audits` Table**:
  - Tracks timestamped history of intention changes without corrupting the current intention constraint:
  - `id`, `user_id`, `date`, `meal_type`, `status`, `action` (`CREATED`, `UPDATED`, `WITHDRAWN`), `notes`, `created_at`.

---

## 8. Mess Manager Intentions Monitor & Analytics

Authorized mess managers have real-time visibility into advance dining demand via `/intentions` and the executive dashboard widget:

### 8.1 Summary Headcounts
For any calendar date (with quick-select shortcuts for Today, Tomorrow, and Day After):
- **Per-Meal Breakdown**:
  - **Likely to attend**: Students who confirmed planned attendance.
  - **Not attending**: Students who confirmed absence.
  - **No response**: Calculated strictly as `max(0, 556 - total_submitted)` based on the configured 556-student dining capacity.
- **Unique Students vs. Total Responses**:
  - `total_submitted_intentions`: Total meal records (e.g., if 1 student answers Breakfast, Lunch, and Dinner, count = 3).
  - `total_unique_students`: Distinct students who submitted $\ge 1$ intention for that date (count = 1). Overcounting is mathematically prevented using `func.count(func.distinct(MealIntention.user_id))`.

### 8.2 Visual Recharts Comparison & Accessibility
- Compact comparison chart comparing `Likely to attend`, `Not attending`, and `No response` per meal.
- **Accessible Table Alternative**: A 1-click toggle (`Show Accessible Table`) renders full tabular data with semantic headers (`<th>`, `aria-label`) for screen readers and high-contrast review.

### 8.3 Filterable & Paginated Individual Responses Table
- Displays Student Name, Username, Room/Hostel, Meal Date, Meal Slot, Status Badge, Notes, and Submission Timestamp.
- Filterable by meal type (`Breakfast`, `Lunch`, `Dinner`) and status (`likely`, `unlikely`).
- Server-side search by student name or room number.
- Pagination controls (15 records per page).

---

## 9. Machine Learning Integration & Future Retraining Plan

### 9.1 Ground-Truth Separation Policy (CRITICAL)
- **Student Intentions $\neq$ Physical Attendance**: Intentions represent advance voluntary plans, not turnstile entry scans or food eaten.
- **Model Predictions $\neq$ Measured Fact**: Regression outputs (`expected_students`, `expected_food_required_kg`, `expected_food_wastage_kg`) are statistical estimates.
- **Operational Measurements**: Actual food cooked, students served, and physical wastage (kg) remain `NULL` until measured by kitchen staff. Never fabricate or extrapolate operational measurements from intentions.

### 9.2 Zero Automatic Retraining Policy
- The production ML model (`mess_prediction_model.joblib`) is **NEVER** retrained automatically upon student submission.
- Automatic retraining on noisy, unverified self-reported intentions causes catastrophic drift and operational instability.
- Aggregated intentions are surfaced in the prediction results modal as **contextual decision support** alongside the ML model's baseline estimates.

### 9.3 Offline Training Data Export Utility
Managers can export clean datasets combining calendar dates, advance student intentions, and linked operational records:
- **Endpoint**: `GET /api/intentions/export?format=csv` (or `format=json`).
- **Export Columns**:
  - `meal_date`, `day_of_week`, `meal_type`, `menu_items`, `special_meal`
  - `intentions_likely_count`, `intentions_unlikely_count`, `intentions_total_submitted`, `intentions_turnout_pct`
  - `predicted_students`, `predicted_food_kg`, `predicted_waste_kg`
  - `actual_students_served`, `actual_food_prepared_kg`, `actual_food_consumed_kg`, `actual_food_wastage_kg`
- **Future Retraining Protocol**:
  1. Accumulate at least 90–180 days of paired intention records and verified post-meal scale measurements.
  2. Perform chronological train/test split (e.g. 80% train, 20% holdout).
  3. Validate candidate models against the baseline ExtraTrees model.
  4. Deploy updated weights only after manual signoff.

---

## 10. Complete API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Student or manager registration |
| `/api/auth/login` | `POST` | Public | OAuth2 JWT password login |
| `/api/auth/me` | `GET` | Authenticated | Current user profile |
| `/api/student/meals` | `GET` | Student | Available meals, menus, and cutoff status |
| `/api/student/intentions` | `GET` | Student | Student's own saved intentions |
| `/api/student/intentions` | `POST` | Student | Submit / update intention before cutoff |
| `/api/student/intentions/{meal_type}` | `DELETE` | Student | Withdraw intention before cutoff |
| `/api/intentions/summary` | `GET` | Manager/Admin | Aggregated headcounts, unique student counts, no-response count |
| `/api/intentions` | `GET` | Manager/Admin | Paginated student intentions table with filters |
| `/api/intentions/export` | `GET` | Manager/Admin | CSV/JSON ML training dataset export |
| `/api/predictions` | `POST` | Manager/Admin | Generate and persist meal forecast with intentions context |
| `/api/predictions/{id}` | `PATCH` | Manager/Admin | Log verified operational actuals (students served, waste kg) |
| `/api/dashboard/summary` | `GET` | Manager/Admin | High-level mess KPI summary and recent forecast logs |
| `/api/analytics/summary` | `GET` | Manager/Admin | Historical meal-wise waste and turnout averages |
| `/api/model/info` | `GET` | Public | ML architecture, features, and academic transparency disclaimer |

---

## 11. Testing & Verification

### 11.1 Backend Test Suite (pytest)
```bash
python -m pytest backend/tests -v
```
**Total:** **72 passed in 30.60s** across 7 test suites:
- `test_intentions.py` (13 tests): Submissions, updates, withdrawals, cutoff enforcement, invalid values, isolation between students, manager role enforcement, aggregate calculations, no-response count calculation against 556 capacity, SQLite persistence across restarts, dynamic updates, empty states, and model immutability.
- `test_auth.py` (10 tests): RBAC, passwords, duplicate email/username handling.
- `test_student.py` (6 tests): Student portal endpoints, menu schedule, and cutoff checks.
- `test_predictions.py` (17 tests): ML forecasts, bounds validation, actual outcomes logging.
- `test_dashboard.py` (3 tests): Empty states and KPI summary aggregates.
- `test_model.py` (4 tests): ML pipeline integrity and model metadata.
- `test_validation.py` (19 tests): Pydantic input constraints and sanitization.

### 11.2 Frontend Test Suite (Vitest)
```bash
cd frontend
npm run test
```
**Total:** **42 passed across 10 test files**:
- `ManagerIntentions.test.tsx` (6 tests): Unique students count, aggregate stats, table rendering, Recharts/accessible table toggle, meal filters, empty states, HCI interpretation notices.
- `StudentMealPanel.test.tsx` (6 tests): Intentions selection, submission, cutoff closure, empty menus.
- `MenuRecommendationsCard.test.tsx`, `Modal.test.tsx`, `ConfirmDialog.test.tsx`, `StatCard.test.tsx`, `Badge.test.tsx`, `StudentBadge.test.tsx`, `LiveAnnouncer.test.tsx`, `validation.test.ts`.

### 11.3 Production Build Validation
```bash
cd frontend
npm run build
```
**Result:** `tsc -b && vite build` succeeded in 7.42s with 0 errors.

---

## 12. Human-Computer Interaction (Shneiderman’s 8 Golden Rules)

The meal intentions and prediction workflows strictly adhere to Shneiderman’s Eight Golden Rules:
1. **Consistency**: Unified meal names (`Breakfast`, `Lunch`, `Dinner`), statuses (`Likely to attend`, `Not attending`), color tokens (Emerald for likely, Rose for unlikely, Slate for unresponded), and standardized typography throughout.
2. **Universal Usability**: Accessible Recharts toggle providing semantic tables for assistive technology, responsive layouts across mobile/desktop, and WCAG 2.2 AA compliant contrast ratios ($>12:1$).
3. **Informative Feedback**: Real-time loading spinners, badge indicators, saved confirmations, and deadline countdowns.
4. **Design Dialogs to Yield Closure**: Clear submission confirmation modals and summary recaps after modifying an intention.
5. **Error Prevention**: Dual frontend & backend deadline validation; database uniqueness constraints preventing duplicate submissions; integer capacity clamping ($0 \le \text{attendance} \le 556$).
6. **Permit Easy Reversal of Actions**: Students can edit or withdraw their intention at any time before the cutoff with one click.
7. **Keep Users in Control**: Clear role segregation between student voluntary declarations and manager operational reviews. The system empowers human kitchen managers to make batch cooking choices rather than making autonomous decisions.
8. **Reduce Short-Term Memory Load**: Selected date, meal, current saved response, cutoff deadline, and capacity remain in persistent view without requiring mental recall from other screens.