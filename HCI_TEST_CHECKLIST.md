# Practical HCI & Usability Testing Checklist

**Project:** College Mess Food Demand & Wastage Prediction System  
**Audience:** QA Engineers, HCI Evaluators, Peer Reviewers, Accessibility Auditors  
**Facility Seating Capacity:** 556 Registered Students  

---

## 1. Authentication & System Access

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 1.1 | **Login Form Display** | Navigate to `/login` | Username/email and password fields are present with distinct, visible labels. | [x] Pass |
| 1.2 | **Password Visibility Toggle** | Click the eye icon or focus and press Enter/Space | Password text alternates between masked (`••••`) and plaintext. `aria-label` updates dynamically. | [x] Pass |
| 1.3 | **Inline Validation Errors** | Click "Sign In" with empty fields | Red inline validation messages appear below each invalid field with `role="alert"`. | [x] Pass |
| 1.4 | **Invalid Credentials Alert** | Enter non-existent credentials and submit | Clear error banner displays: "Authentication Error: Invalid username or password". Server details/traces are never displayed. | [x] Pass |
| 1.5 | **Registration Validation** | Navigate to `/register`, enter mismatched passwords | Submit is blocked; inline message displays: "Passwords don't match". | [x] Pass |

---

## 2. Navigation & Global Layout

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 2.1 | **Skip to Content** | Load any page and press `Tab` as the first keypress | A high-contrast "Skip to main content" banner appears at the top. Pressing `Enter` shifts focus directly to `<main id="main-content">`. | [x] Pass |
| 2.2 | **Active Route Indicator** | Click between Dashboard, New Prediction, History, Analytics, and Model Information | Active nav link highlights with blue background (`bg-[#EFF6FF]`), blue text (`text-[#2563EB]`), and left indicator border (`border-l-4`). | [x] Pass |
| 2.3 | **Keyboard Traversal** | Press `Tab` through the sidebar and page controls | Focus rings (`ring-2 ring-[#2563EB] ring-offset-2`) are sharply visible on every link and button. No focus traps exist. | [x] Pass |
| 2.4 | **Elimination of Clutter** | Inspect headers and sidebars on mobile and desktop | Redundant capacity badges and persistent disclaimers have been removed from global nav chrome. | [x] Pass |

---

## 3. Meal Prediction Form & Automation

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 3.1 | **Automated Day & Menu** | Select a new calendar date (e.g., Saturday) | `day_of_week` auto-updates to "Saturday", marks weekend pill if applicable, and automatically populates Saturday's scheduled menu. | [x] Pass |
| 3.2 | **Meal Slot Switch** | Switch meal type from Lunch to Dinner | Main menu items automatically update to scheduled Dinner menu without requiring manual typing. | [x] Pass |
| 3.3 | **Alternative Menu Presets** | Open the preset menu dropdown and select an item | Textarea immediately updates with the selected preset meal item. | [x] Pass |
| 3.4 | **Reset to Schedule Action** | Modify menu text and click "Reset to Schedule" | Scheduled default menu for that day/meal slot is restored immediately. | [x] Pass |
| 3.5 | **Special Meal Toggle** | Select "Special Meal: Yes" | Menu items change to "Special". Reverting to "No" restores scheduled regular menu. | [x] Pass |
| 3.6 | **Capacity Constraint** | Enter `0` or `6000` into Mess Capacity | Client-side validation triggers an error ("Capacity must be at least 1" or "cannot exceed 5000"). Default is 556. | [x] Pass |
| 3.7 | **Duplicate Submit Lock** | Click "Generate Prediction" | Button immediately disables, displays "Calculating Forecast...", and prevents duplicate network submissions. | [x] Pass |

---

## 4. Prediction Results & Recovery

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 4.1 | **Clear Output Hierarchy** | Observe generated prediction card | Three distinct color-coded cards display Expected Students (blue), Food Required in kg (deep blue), and Expected Wastage in kg (amber). | [x] Pass |
| 4.2 | **Units on All Metrics** | Inspect numeric values | Every number has explicit units: `students`, `kg`, and `%`. | [x] Pass |
| 4.3 | **Edit Inputs Action** | Click "Edit Inputs" button | User returns to the form view with all previous date, meal, menu, and context values intact. | [x] Pass |
| 4.4 | **New Prediction Action** | Click "New Prediction" button | Form resets cleanly to default meal parameters for today. | [x] Pass |
| 4.5 | **Preservation on Error** | Disconnect network or trigger error during submit | Error banner appears; all entered fields remain untouched in the form for user recovery. | [x] Pass |
| 4.6 | **Estimates Disclaimer** | Inspect bottom notice on results | Explicitly states: "Results are machine-learning regression estimates... not measured physical outcomes." | [x] Pass |

---

## 5. History & Record Management

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 5.1 | **Debounced Search** | Type meal name in search bar (e.g., "Rajma") | Search filters smoothly after 350ms debouncing without freezing interface or requiring an explicit submit click. | [x] Pass |
| 5.2 | **Date Range Validation** | Set Start Date later than End Date | Yellow warning appears: "Start date cannot be after end date." Submissions are suspended until corrected. | [x] Pass |
| 5.3 | **Clear Filters Action** | Apply filters and click "Clear Filters" | All filter inputs clear, table re-populates, and pagination resets to page 1. | [x] Pass |
| 5.4 | **Delete Confirmation** | Click trash icon on a prediction record | Accessible modal dialog opens naming the specific forecast ID, date, and meal slot. Focus is contained. | [x] Pass |
| 5.5 | **Escape Dismissal** | Press `Escape` while confirmation dialog is open | Dialog dismisses safely without deleting the item. Background scroll is restored. | [x] Pass |

---

## 6. Analytics & Visualizations

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 6.1 | **Accessible Table View** | Click "View Accessible Data Tables" toggle | Recharts graphical charts swap for semantic HTML data tables with row and column headers. | [x] Pass |
| 6.2 | **Chart Alternative Text** | Inspect DOM on graphical view | `<div className="sr-only">` provides screen-reader summaries of timeline and meal averages. | [x] Pass |
| 6.3 | **Tooltips & Legends** | Hover over chart points/bars | Tooltips display explicit units (`kg`) and plain-language metric names. | [x] Pass |
| 6.4 | **Empty State Handling** | Clear database or test empty account | Clean, friendly banner explains that analytics require saved meal predictions, with a direct CTA button. | [x] Pass |

---

## 7. Model Transparency & Simulator

| # | Inspection Item | Verification Step | Expected Behavior | Status |
|---|---|---|---|---|
| 7.1 | **Pipeline Explanation** | Navigate to `/model-info` | End-to-end visual pipeline details data ingestion, OneHotEncoder, tree regression, and domain safeguards. | [x] Pass |
| 7.2 | **Feature Dictionary Search** | Type feature name in dictionary search bar | Real-time filtering shows data type, whether it is auto-derived, and its physical mess role. | [x] Pass |
| 7.3 | **Sandbox / What-If Testing**| Adjust parameters in interactive simulator and click "Run Preview" | Produces immediate prediction without inserting or polluting historical operational records. | [x] Pass |
| 7.4 | **Copy Model Card** | Click "Copy Model Card" | Copies a formatted Markdown model card to clipboard; button label changes to "Copied!" for 2 seconds. | [x] Pass |
