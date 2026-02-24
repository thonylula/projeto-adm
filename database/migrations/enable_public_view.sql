-- SQL Script to Enable Public / Visitor View
-- Run this in Supabase SQL Editor to allow visitors to see data

-- 1. Allow Visitors (anon) to read Company list (Required to select a company)
GRANT SELECT ON TABLE companies TO anon;

-- 2. Allow Visitors to read Mortality Data (global_configs)
-- (Note: We already granted ALL in the previous script, but ensuring SELECT here)
GRANT SELECT ON TABLE global_configs TO anon;

-- 3. Allow Visitors to see Biometrics history (if applicable)
GRANT SELECT ON TABLE biometrics TO anon;

-- 4. Allow Visitors to see Payroll/History (if applicable)
-- GRANT SELECT ON TABLE payroll_history TO anon; -- Uncomment if you want public payroll

-- 5. Ensure RLS doesn't block "anon" if policies exist
-- If specific policies exist that restrict "anon", you might need:
-- CREATE POLICY "Allow Public Read Companies" ON companies FOR SELECT TO anon USING (true);
