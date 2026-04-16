-- ============================================================
-- One-off data load: Overstone RAG Spreadsheet V3 (Debbie, 28 Mar 2026)
-- Applied by: AST Lead
-- Date: 2026-04-16
--
-- This migration:
--   1. Adds completion records for items evidenced as done in the spreadsheet
--   2. Updates notes on existing obligations where status has changed
--   3. Adds new compliance obligations for HQ-coded items not yet in system
-- ============================================================

-- ── VARIABLES ─────────────────────────────────────────────────
-- Overstone site_id = a1b2c3d4-cafe-4000-a000-000000000001

-- ============================================================
-- SECTION 1: COMPLETION RECORDS for historically completed items
-- (completed_by = NULL as these pre-date system or done by contractor)
-- ============================================================

-- 1a. Fixed Wire Testing (EICR)
--     Spreadsheet row 7: "Fixed wire testing re-done April 25 – not due again until April 2030"
INSERT INTO compliance_records (
  id, obligation_id, completed_at, completed_by,
  contractor_name, notes, certificate_ref, expiry_date, evidence_path, task_id
)
VALUES (
  gen_random_uuid(),
  '0e86b4ac-ae0b-45cf-9a2d-9646a6bd58a9',   -- Fixed Wire Testing (EICR)
  '2025-04-30T00:00:00Z',
  NULL,
  'Northants Electrical (contractor)',
  'Fixed wire testing completed April 2025. Next due April 2030. Confirmed in Overstone RAG Spreadsheet V3 (Debbie, 28 Mar 2026).',
  NULL,
  '2030-04-30',
  NULL,
  NULL
);

-- 1b. Fire Extinguisher Annual Service
--     Spreadsheet row 2: "Site extinguishers all tested, labelled and compliant."
--     New comment: "Extinguishers are due again, is this planned in?" → implies Apr 2025 service done
INSERT INTO compliance_records (
  id, obligation_id, completed_at, completed_by,
  contractor_name, notes, certificate_ref, expiry_date, evidence_path, task_id
)
VALUES (
  gen_random_uuid(),
  'd50c26e4-79ee-4b1b-9e36-cfba98945a2f',   -- Fire Extinguisher Annual Service
  '2025-04-11T00:00:00Z',
  NULL,
  'Northants Fire (contractor)',
  'All site extinguishers tested, labelled and compliant. Confirmed via Northants Fire contract. Recorded from Overstone RAG Spreadsheet V3.',
  NULL,
  '2026-04-11',
  NULL,
  NULL
);

-- 1c. First Aid Box Inspection
--     Spreadsheet row 13: "09.04.25: New First aid kits purchased by Mike Ruston. 1 placed in the cabin."
INSERT INTO compliance_records (
  id, obligation_id, completed_at, completed_by,
  contractor_name, notes, certificate_ref, expiry_date, evidence_path, task_id
)
VALUES (
  gen_random_uuid(),
  '59e32621-016f-444d-9a5d-3636f7444434',   -- First Aid Box Inspection
  '2025-04-09T00:00:00Z',
  NULL,
  NULL,
  'New first aid kits purchased by Mike Ruston. One placed in the cabin. All kits checked for correct contents per content list.',
  NULL,
  NULL,
  NULL,
  NULL
);

-- ============================================================
-- SECTION 2: UPDATE NOTES ON EXISTING OBLIGATIONS
-- ============================================================

-- 2a. AED (Defibrillator) Check — pads and battery concern
--     Spreadsheet row 15: "Changed to red status, this equipment may not be operational
--     because of the battery. Pads and pre kit go out of date October 2025."
UPDATE compliance_obligations
SET
  notes = 'URGENT: Pads and pre-kit went out of date October 2025. Battery status unknown — device may not be operational. Replace pads, pre-kit and check battery before next use. Flagged red in Overstone RAG Spreadsheet V3 (Debbie, 28 Mar 2026).',
  red_days = 7,
  updated_at = now()
WHERE id = '90331bf8-26ab-4045-adf7-ca1cd8ef1a22';  -- AED (Defibrillator) Check

-- 2b. Legionella obligations — no testing since 2022
--     Spreadsheet row 76: "Records are showing no legionella testing on site since 2022"
UPDATE compliance_obligations
SET
  notes = 'No recorded legionella testing on site since 2022. Set up a new testing contract. All taps to be numbered/labelled and added to a control register. Monthly testing regime required. Flagged in Overstone RAG Spreadsheet V3 (Debbie, 28 Mar 2026).',
  updated_at = now()
WHERE id = 'ff89a8c1-038a-4497-9502-4e8517345366';  -- Legionella Water Temperature Check

UPDATE compliance_obligations
SET
  notes = 'No recorded legionella testing on site since 2022. All showers and low-use taps must be flushed and logged weekly. Set up numbered/labelled register for all outlets.',
  updated_at = now()
WHERE id = '2acbb2b1-81b6-488f-a2e1-a3ef20ea842b';  -- Legionella Shower / Tap Flush

-- 2c. Fire Evacuation Drill — documented drills (HQ03)
--     Spreadsheet row 4: "Drills are undertaken, however not documented and kept."
UPDATE compliance_obligations
SET
  notes = 'Drills have been undertaken but records not consistently kept. Ensure all future drills are documented and stored. Reference: HQ03.',
  updated_at = now()
WHERE id = '95862898-38e2-4ed2-8464-4798c7ced836';  -- Fire Evacuation Drill

-- 2d. PAT Testing — status unknown, last tested 2018
--     Spreadsheet row 9: "EET/PAT testing last tested 18/09/2018"
UPDATE compliance_obligations
SET
  notes = 'Equipment last PAT tested 18 Sep 2018. Qualified contractor needed. An electrical asset register must be established so items are tracked and always tested. Flagged in Overstone RAG Spreadsheet V3.',
  updated_at = now()
WHERE id = 'a98f9ecc-da2d-46ca-8f54-0811e61408dc';  -- PAT Testing

-- ============================================================
-- SECTION 3: NEW COMPLIANCE OBLIGATIONS (HQ-coded items)
-- All linked to Overstone site: a1b2c3d4-cafe-4000-a000-000000000001
-- ============================================================

-- 3a. HQ04 — Fire Door Inspection
--     Spreadsheet row 5: "All fire doors in all buildings need numbering, adding to the
--     door register, and regular inspection."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Fire Door Inspection',
  'fire_safety',
  'All fire doors across all buildings must be numbered, added to the door register, and regularly inspected for self-closing, signage, seals and clear access.',
  'Regulatory Reform (Fire Safety) Order 2005',
  'monthly',
  NULL,
  7,
  3,
  NULL,
  true,
  'HQ04. Checklist provided by DB to asset team. Ensure all doors are numbered on a register before each inspection.',
  'Walk all buildings. Check each fire door: self-closes fully, signage present, intumescent seals intact, no obstructions. Record on door register.',
  true,
  now(), now()
);

-- 3b. HQ07 — Contractor RAMS Management
--     Spreadsheet row 88: "Process required for obtaining and reviewing/approving contractor RAMS."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Contractor RAMS Review',
  'risk_assessment',
  'Before any contractor commences work on site, their Risk Assessments and Method Statements (RAMS) must be obtained, reviewed and approved.',
  'CDM Regulations 2015 / Management of H&S at Work Regs 1999',
  'annual',
  NULL,
  30,
  7,
  NULL,
  true,
  'HQ07. Annual review of the RAMS process / procedure itself, plus per-contractor reviews each time a new contractor is engaged.',
  'Review the contractor RAMS approval process. Ensure the process is documented and all staff who engage contractors are aware of it.',
  true,
  now(), now()
);

-- 3c. HQ11 — Vermin Control
--     Spreadsheet row 94: "Have a plan to manage."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Vermin Control Review',
  'risk_assessment',
  'Annual review of vermin control measures on site. Ensure a management plan is in place covering monitoring, treatment and prevention.',
  'Prevention of Damage by Pests Act 1949',
  'annual',
  NULL,
  30,
  7,
  NULL,
  true,
  'HQ11. Site requires a documented vermin control plan.',
  'Review current vermin control arrangements. Check bait stations, evidence of activity, and ensure a current contract or plan is in place.',
  true,
  now(), now()
);

-- 3d. HQ12/13 — Bunkbed Safety Inspection
--     Spreadsheet rows 49-52: Beds not complying with BS EN 747; routine inspection needed.
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Bunkbed Safety Inspection',
  'equipment',
  'Regular safety inspection of all bunkbeds in accommodation buildings. Check structural integrity, ladder fixings, top bunk sides and compliance with BS EN 747.',
  'BS EN 747 / PUWER 1998',
  'monthly',
  NULL,
  7,
  3,
  NULL,
  true,
  'HQ12/HQ13. Knights Lodge bunkbeds have loosened ladders and top-bunk sides. Other accommodation beds do not currently comply with BS EN 747 — remedial work required.',
  'Inspect all bunkbeds in all accommodation buildings. Check: ladder fixings secure, top-bunk side rails intact, no excessive movement, no sharp edges. Record any defects.',
  true,
  now(), now()
);

-- 3e. HQ14 — Lone Working Procedure Review
--     Spreadsheet row 87: "Review/creation of lone working procedure to be undertaken."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Lone Working Procedure Review',
  'risk_assessment',
  'Annual review of the lone working procedure to ensure it is current, communicated to all relevant staff and volunteers, and fit for purpose.',
  'Management of H&S at Work Regs 1999 / H&S at Work Act 1974',
  'annual',
  NULL,
  30,
  7,
  NULL,
  true,
  'HQ14. Procedure needs to be created/reviewed. Ensure all staff and volunteers working alone on site are aware of the process.',
  'Review the lone working procedure document. Confirm it covers: check-in/out process, emergency contacts, risk assessment. Re-communicate to relevant staff.',
  true,
  now(), now()
);

-- 3f. HQ16 — Trailer Safety Check
--     Spreadsheet row 90: "Establish routine safety and roadworthiness checks for trailers."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Trailer Safety & Roadworthiness Check',
  'equipment',
  'Routine pre-use and periodic safety checks of all site trailers covering structural integrity, lighting, tyres, coupling and roadworthiness.',
  'PUWER 1998 / Road Traffic Act 1988',
  'quarterly',
  NULL,
  14,
  3,
  NULL,
  true,
  'HQ16. No formal trailer check process currently in place. Each trailer should be on an asset register.',
  'Inspect all trailers: check tyres (pressure/wear), lights, coupling/hitch, body structure, safety chains, floor boards. Record results and any defects found.',
  true,
  now(), now()
);

-- 3g. HQ18 — PPE Inspection for Activities
--     Spreadsheet row 80: "Not known what is in place; e.g. hard hats, harnesses."
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Activity PPE Inspection',
  'equipment',
  'Quarterly inspection of all activity PPE (helmets, harnesses, karabiners, etc.) to confirm they are in date, undamaged and fit for purpose.',
  'PPE at Work Regulations 2022',
  'quarterly',
  NULL,
  14,
  3,
  NULL,
  true,
  'HQ18. It is currently unknown what PPE inspections are in place or who is completing them. A full PPE audit and register is required first.',
  'List all activity PPE items by type and location. Inspect each for damage, expiry dates and compliance markings. Record pass/fail for each item.',
  true,
  now(), now()
);

-- 3h. HQ19/20/21 — Roy's Challenge Equipment Inspection
--     Spreadsheet rows 22-25: Pole sleeve degradation, wood chip below equipment,
--     sharp edges on playhouse; regular documented internal checks needed.
INSERT INTO compliance_obligations (
  id, site_id, name, category, description, legislation_ref,
  frequency, frequency_days, notice_days, red_days,
  owner_role, is_active, notes, instructions, self_completed,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-cafe-4000-a000-000000000001',
  'Roy''s Challenge Equipment Inspection',
  'equipment',
  'Monthly documented inspection of all structures within Roy''s Challenge: pole sleeves, wood chip surfacing, playhouse, and all installed equipment.',
  'PUWER 1998 / BS EN 1176',
  'monthly',
  NULL,
  7,
  3,
  NULL,
  true,
  'HQ19/20/21. Known issues: pole sleeve degradation causing water ingress and rot; insufficient wood chip below equipment; sharp edges on playhouse. All have deteriorated further as of Mar 2026.',
  'Walk the full Roy''s Challenge area. Check: pole sleeve condition, wood chip depth below all equipment (min 300mm), all fixings, sharp edges, structural integrity of playhouse. Record all findings and any defects.',
  true,
  now(), now()
);
