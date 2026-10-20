# HCI Design Decisions & Cognitive Architecture

**Project:** College Mess Food Demand & Wastage Prediction System  
**Target Users:** College Mess Managers, Hostel Supervisors, Kitchen Production Incharges  
**Capacity Constraint:** 556 Registered Hostel Students  
**Frameworks:** Nielsen's 10 Usability Heuristics, Shneiderman's 8 Golden Rules, WCAG 2.2 AA Accessibility Standards, Cognitive Load Theory  

---

## 1. Executive Summary & Design Philosophy

The primary objective of this system is to assist non-technical dining hall personnel in planning meal preparations and minimizing post-consumer and production food wastage. 

The user experience was built upon three guiding tenets:
1. **Low Cognitive Friction:** Mess managers operate in noisy, fast-paced kitchen environments. Workflows prioritize recognition over recall, automated routine decisions, and high-visibility status cues.
2. **Transparent Uncertainty:** Predictions are explicitly identified as statistical estimations derived from historical patterns—not physical scale measurements.
3. **Physical Safety & Constraint Enforcement:** Real-world physical boundaries ($0 \le \text{attendance} \le 556$ students; $\text{wastage} \le \text{prepared food}$) are strictly enforced across UI validation and backend inference pipelines.

---

## 2. Core Interaction & Architectural Decisions

### 2.1 Elimination of Visual Noise & Redundancy
- **Decision:** Removed static global footers, pinned operational cards in the sidebar, and repeated header badges stating capacity (`556 Students`).
- **HCI Principle:** *Nielsen Heuristic #8 (Aesthetic & Minimalist Design)* & *Cognitive Load Theory (Extraneous Load Reduction)*.
- **Rationale:** Repeating the 556 capacity parameter in 4 different persistent screen locations created visual clutter without aiding task completion. Capacity is an operational parameter relevant during prediction configuration, not a global navigation anchor.

### 2.2 Automated Calendar & Menu Derivation
- **Decision:** Selecting a date automatically computes `day_of_week`, determines `is_weekend`, and populates the recurring hostel dining menu for that specific meal slot.
- **HCI Principle:** *Shneiderman Rule #8 (Reduce Short-Term Memory Load)* & *Nielsen Heuristic #6 (Recognition Rather Than Recall)*.
- **Rationale:** Managers should not be forced to look up paper mess schedules or recall whether "Thursday Lunch" serves *Rajma Chawal* or *Chole Bhature*. The system suggests the scheduled menu immediately while keeping it fully editable.

### 2.3 Special Feast Context Switching
- **Decision:** Toggling Special Meal to `"Yes"` automatically defaults the menu description to `"Special"` feast items. Reverting back to `"No"` immediately restores the regular day/meal schedule.
- **HCI Principle:** *Nielsen Heuristic #5 (Error Prevention)* & *Shneiderman Rule #6 (Permit Easy Reversal of Actions)*.
- **Rationale:** Special banquet meals (festivals, holiday feasts) follow unique non-routine recipes and increased portion turnouts. Preserving the regular schedule in state allows instant, risk-free reversal.

### 2.4 Multi-Phase Prediction Workflow: "Edit Inputs" vs "New Prediction"
- **Decision:** On the prediction results view, provide two explicit, distinct primary actions:
  1. **"Edit Inputs":** Returns to the form with all previously entered fields intact for rapid parameter tweaking.
  2. **"New Prediction":** Resets the form cleanly to default today/lunch parameters.
- **HCI Principle:** *Nielsen Heuristic #3 (User Control & Freedom)* & *Shneiderman Rule #6 (Permit Easy Reversal)*.
- **Rationale:** Managers frequently test "what-if" scenarios (e.g., "What if an exam is announced tomorrow?"). Forcing a form reset after every prediction requires tedious re-entry of date, meal, and menu items.

### 2.5 Multi-Modal Chart & Accessible Table Alternatives
- **Decision:** In both the Dashboard and Analytics sections, all graphical Recharts visualizations are paired with toggleable, accessible semantic HTML tables (`showChartTable` / `showTableView`) and screen-reader hidden summaries (`<div className="sr-only">`).
- **HCI Principle:** *WCAG 2.2 Level AA (Guideline 1.1.1 Non-text Content)* & *Inclusive Design*.
- **Rationale:** Visual charts can be difficult to interpret on small mobile viewports, high-glare tablet screens in kitchens, or for visually impaired users. Tabular presentations provide precise numeric figures with row/column headers.

### 2.6 Physical Domain Invariants & Defensive Boundary Rules
- **Decision:** Applied strict mathematical clamps before output presentation:
  1. $\text{Expected Students} \in [0, \text{Capacity}]$
  2. $\text{Food Required (kg)} \ge 0.0$
  3. $0.0 \le \text{Expected Wastage (kg)} \le \text{Food Required (kg)}$
- **HCI Principle:** *Nielsen Heuristic #2 (Match Between System & Real World)* & *Shneiderman Rule #5 (Prevent Errors)*.
- **Rationale:** Unconstrained machine learning regression models can occasionally output anomalous negative numbers or exceed physical dining hall capacity during extreme feature combinations. Safeguards prevent absurd outputs (e.g. negative waste or waste exceeding cooked food).

---

## 3. Visual System & Design Tokens

| Token Category | Value / Standard | HCI Rationale |
|---|---|---|
| **Primary Accent** | `#2563EB` (Tailwind Blue-600) | Familiar, high-clarity color with **4.56:1** contrast on white backgrounds. Used exclusively for primary actions and focused state. |
| **Neutral Background** | `#F8FAFC` (Slate-50) | Reduces glare compared to stark pure white (`#FFFFFF`) while maintaining crisp readability. |
| **Card Borders** | `#E2E8F0` (Slate-200) | Subtle container separation that eliminates heavy shadows and excessive borders. |
| **Text Hierarchy** | Primary: `#1E293B` (12.6:1 AAA)<br>Secondary: `#64748B` (4.6:1 AA) | Exceeds WCAG 2.2 AA contrast requirements across all display resolutions. |
| **Destructive Actions** | `#B91C1C` (Red-700) | Universally recognized danger signifier paired with explicit confirmation modals. |
| **Warning/Wastage** | `#B45309` (Amber-700) | Distinguishes food waste from cooked food without using panic-inducing red. |
| **Focus Rings** | `ring-2 ring-[#2563EB] ring-offset-2` | Unambiguous keyboard navigation focus indicators across every interactive control. |

---

## 4. Error Prevention and Recovery Architecture

```
User Input 
   │
   ▼
[Client-side Zod Schema Validation]
   ├── Invalid? ──► Inline Red Alert (role="alert", aria-describedby)
   │               Focus preserved, inputs retained
   │
   ▼
[Network / API Layer (FastAPI)]
   ├── 503 / Service Unavailable? ──► Friendly Standby Alert with retry
   ├── 422 Unprocessable? ──► Clear field diagnostics
   │
   ▼
[Domain Clamp Safety Layer]
   ├── Physical capacity clamp [0, 556]
   └── Mass conservation invariant (Wastage <= Food)
   │
   ▼
[Render Results / Announce to Screen Reader]
   ├── LiveAnnouncer (aria-live="polite")
   └── Option to Edit Inputs or View History
```
