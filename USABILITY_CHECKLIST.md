# Manual Usability-Test Checklist (5 Core Tasks)

**System:** College Mess Planning & Food Waste Prediction System  
**Target User:** Mess Manager / Dining Hall Supervisor  
**Evaluation Standard:** Nielsen's Usability Heuristics & WCAG 2.2 AA Compliance  

---

## Usability Test Overview

This protocol specifies five realistic operational tasks for evaluating the user experience, accessibility, error prevention, and cognitive ergonomics of the Mess Planning application. Evaluators should record success criteria, completion times, and subjective feedback.

---

### Task 1: Account Registration & Secure Authentication
**Scenario:** A newly appointed hostel mess manager needs to register an official account and sign in to the mess portal.

- [ ] **Step 1.1:** Navigate to the application root (`http://localhost:5173/`). Verify unauthenticated users are redirected to `/login`.
- [ ] **Step 1.2:** Click *"Register here"* to navigate to the Registration screen.
- [ ] **Step 1.3:** Test inline validation by entering a password under 6 characters and unmatched confirmation passwords. Verify field-level red errors appear immediately without page reload.
- [ ] **Step 1.4:** Fill in valid credentials (`username`, `email`, `password`, `confirm_password`) and toggle the *"Show password"* eye button. Verify characters toggle between masked (`••••`) and visible text.
- [ ] **Step 1.5:** Submit registration. Verify seamless transition to the Dashboard with session token saved in client storage.
- [ ] **Evaluation Criteria:**
  - [ ] Screen reader announces `"Registering new account..."` and success via `aria-live`.
  - [ ] No plaintext password is exposed in local storage or network logs.
  - [ ] Focus returns logically to top of the dashboard.

---

### Task 2: Standard Weekday Meal Forecasting
**Scenario:** The manager needs to forecast food and potential wastage for an upcoming Monday lunch serving 556 students.

- [ ] **Step 2.1:** From Dashboard or Sidebar, click *"New Meal Prediction"* (`/predictions/new`).
- [ ] **Step 2.2:** Select an upcoming Monday on the date picker.
- [ ] **Step 2.3:** Verify the **Derived Day** helper updates immediately to `"Monday"` and indicates `"No"` for weekend.
- [ ] **Step 2.4:** Select `"Lunch"` as Meal Type. Observe the Quick-Select preset menu dropdown populate with lunch-specific recipes (e.g. *Mix Veg, Dal Fry, Jeera Rice, Chapati*).
- [ ] **Step 2.5:** Keep default capacity at `556`. Verify Weather is set to `"Clear"` and flags (*Holiday, Exam, Event*) are unchecked.
- [ ] **Step 2.6:** Click *"Generate Prediction"*. Observe button state change to `"Calculating Forecast..."`.
- [ ] **Step 2.7:** Inspect the generated forecast results card:
  - [ ] Expected Attendance in **students** (between 0 and 556).
  - [ ] Food Required in **kg** (nonnegative, with kg/student ratio).
  - [ ] Expected Wastage in **kg** (nonnegative, strictly $\le$ Food Required, with percentage).
  - [ ] Contextual summary table verifying submitted parameters.
  - [ ] Prominent note stating outputs are model estimates.
- [ ] **Evaluation Criteria:**
  - [ ] Zero manual calculation needed for day of week.
  - [ ] Output displays explicit units (`students`, `kg`, `%`) on every metric.
  - [ ] Manager can easily click *"Create Another Forecast"* to reset the form.

---

### Task 3: Error Prevention, Boundaries, & Special Meal Defaulting
**Scenario:** The manager plans a festival dinner with a special menu, tests input constraints, and verifies error recovery.

- [ ] **Step 3.1:** On the New Prediction form, toggle **Special Meal** to `"Yes"`.
- [ ] **Step 3.2:** Verify the *Main Menu Items* field automatically pre-populates with `"Special"` by default.
- [ ] **Step 3.3:** Edit the menu field to append custom dishes (e.g. `"Special Paneer Feast & Ice-cream"`). Verify the field remains freely editable.
- [ ] **Step 3.4:** Test error prevention by clearing the menu field completely and entering capacity as `0`.
- [ ] **Step 3.5:** Click *"Generate Prediction"*. Verify the form blocks submission and highlights:
  - `"Please enter or select menu items"`
  - `"Capacity must be at least 1"`
- [ ] **Step 3.6:** Correct the capacity back to `556` and enter a valid menu.
- [ ] **Step 3.7:** Submit and confirm outputs satisfy physical domain limits:
  - $\text{Expected Students} \le 556$
  - $\text{Food Wastage} \le \text{Food Required}$
- [ ] **Evaluation Criteria:**
  - [ ] Pre-entered values are preserved when validation fails (user does not lose data).
  - [ ] Special meal auto-fills without locking user out of customization.
  - [ ] Bounds enforcement prevents nonsensical negative quantities.

---

### Task 4: Searching, Filtering, & Inspecting Prediction History
**Scenario:** The manager searches for previously saved dinner forecasts, inspects details, and deletes an obsolete entry.

- [ ] **Step 4.1:** Navigate to **Prediction History** (`/predictions/history`).
- [ ] **Step 4.2:** Enter a search keyword (e.g. `"Special"`) in the search input and press Enter. Verify table filters to matching records.
- [ ] **Step 4.3:** Select `"Dinner"` in the meal type dropdown. Verify records narrow to Dinner meals.
- [ ] **Step 4.4:** Click the blue **Inspect** (eye) button on any row.
- [ ] **Step 4.5:** In the inspection modal, verify:
  - Full inputs and model outputs are displayed.
  - Modal title is labeled with `aria-labelledby`.
  - Pressing the `Escape` key dismisses the modal.
- [ ] **Step 4.6:** Click the red **Delete** (trash) icon on a test row.
- [ ] **Step 4.7:** Verify an accessible **ConfirmDialog** appears warning that the action is permanent.
- [ ] **Step 4.8:** Click *"Cancel"*, verify record is NOT deleted.
- [ ] **Step 4.9:** Click Delete again and select *"Delete Record"*. Verify the record is removed and the table updates.
- [ ] **Evaluation Criteria:**
  - [ ] Keyboard focus is trapped within modals while open and returns properly upon closing.
  - [ ] Destructive actions cannot occur accidentally with a single click.
  - [ ] Pagination controls disable gracefully at boundaries (Page 1 disables "Prev").

---

### Task 5: Reviewing Analytics, Accessible Table Alternative, & Model Transparency
**Scenario:** The mess committee reviews term trends and verifies dataset limitations and model evaluation metrics.

- [ ] **Step 5.1:** Navigate to **Analytics & Trends** (`/analytics`).
- [ ] **Step 5.2:** Review the timeline chart (Food Required vs Wastage) and the meal-wise comparison bar chart.
- [ ] **Step 5.3:** Verify tooltips display readable labels and exact units (`kg`).
- [ ] **Step 5.4:** Click *"View Accessible Data Tables"*. Verify charts toggle cleanly to semantic HTML tables (`<th scope="col">`, `<td class="text-right">`) with exact numbers for assistive technology.
- [ ] **Step 5.5:** Read the **Methodological Transparency** notice. Verify it explicitly clarifies that statistics represent modeled expectations rather than physical plate waste logs.
- [ ] **Step 5.6:** Navigate to **Model Information** (`/model-info`).
- [ ] **Step 5.7:** Verify the following are clearly presented:
  - Algorithm name (`ExtraTreesRegressor`) and version (`1.0.0`).
  - Chronological 80/20 train/test split details.
  - Test set metrics: MAE, RMSE, and R² for each target.
  - Prominent warning explaining that labels are generated rule-based estimates and scores do not represent real-world accuracy.
- [ ] **Step 5.8:** Navigate to **Profile & Settings** (`/profile`) and click *"Sign Out"*. Confirm logout returns to `/login` and destroys the session token.
- [ ] **Evaluation Criteria:**
  - [ ] Keyboard-only users can navigate all analytics figures via the table view.
  - [ ] Academic integrity: Model accuracy is not overstated.
  - [ ] Complete end-to-end workflow functions without console exceptions or broken links.
