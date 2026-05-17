-- SEED DATA — Populate tables with initial data for the resQ platform

-- Disaster Events
INSERT INTO public.disaster_events (id, system_code, name, status, allowed_regions, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'TY-2026-001', 'Typhoon Aghon', 'ACTIVE', '["NCR", "Region IV-A"]', '2026-05-10T08:00:00Z'),
  ('d0000001-0000-0000-0000-000000000002', 'EQ-2026-003', 'Mindanao Earthquake 6.2', 'ACTIVE', '["Region XI", "Region XII"]', '2026-04-22T14:30:00Z'),
  ('d0000001-0000-0000-0000-000000000003', 'FL-2026-007', 'Cagayan Valley Flooding', 'CLOSED', '["Region II"]', '2026-03-15T06:00:00Z'),
  ('d0000001-0000-0000-0000-000000000004', 'TY-2026-009', 'Typhoon Butchoy', 'ACTIVE', '["Region V", "Region VIII"]', '2026-05-14T10:00:00Z')
ON CONFLICT (system_code) DO NOTHING;

-- Beneficiaries (zero PII — only hashed IDs and broad demographics)
INSERT INTO public.beneficiaries (system_uuid, id_hash, registration_source, general_demographics, created_at) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'hash_maria_santos', 'ONSITE_STAFF', '{"region": "NCR", "display_name": "M. Dela Cruz", "barangay": "Brgy. San Antonio, Makati", "is_disaster_affected": true}', '2026-05-10T09:00:00Z'),
  ('b0000001-0000-0000-0000-000000000002', 'hash_juan_reyes', 'ONSITE_STAFF', '{"region": "NCR", "display_name": "J. Reyes", "barangay": "Brgy. Bagong Silang, Caloocan", "is_disaster_affected": true}', '2026-05-10T09:15:00Z'),
  ('b0000001-0000-0000-0000-000000000003', 'hash_rosalinda_garcia', 'WEB_PUBLIC', '{"region": "Region IV-A", "display_name": "R. Garcia", "barangay": "Brgy. Paliparan, Dasmariñas", "is_disaster_affected": true}', '2026-05-10T10:00:00Z'),
  ('b0000001-0000-0000-0000-000000000004', 'hash_roberto_fernandez', 'ONSITE_STAFF', '{"region": "Region IV-A", "display_name": "R. Fernandez", "barangay": "Brgy. San Isidro, Antipolo", "is_disaster_affected": true}', '2026-05-11T08:00:00Z'),
  ('b0000001-0000-0000-0000-000000000005', 'hash_esperanza_villanueva', 'ONSITE_STAFF', '{"region": "Region XI", "display_name": "E. Villanueva", "barangay": "Brgy. Buhangin, Davao City", "is_disaster_affected": true}', '2026-04-23T07:00:00Z'),
  ('b0000001-0000-0000-0000-000000000006', 'hash_antonio_ramos', 'WEB_PUBLIC', '{"region": "Region XI", "display_name": "A. Ramos", "barangay": "Brgy. Tibungco, Davao City", "is_disaster_affected": true}', '2026-04-23T08:00:00Z'),
  ('b0000001-0000-0000-0000-000000000007', 'hash_concepcion_torres', 'ONSITE_STAFF', '{"region": "Region XII", "display_name": "C. Torres", "barangay": "Brgy. Poblacion, General Santos", "is_disaster_affected": true}', '2026-04-24T09:00:00Z'),
  ('b0000001-0000-0000-0000-000000000008', 'hash_pedro_santiago', 'WEB_PUBLIC', '{"region": "Region II", "display_name": "P. Santiago", "barangay": "Brgy. Centro, Tuguegarao", "is_disaster_affected": false}', '2026-03-16T06:00:00Z'),
  ('b0000001-0000-0000-0000-000000000009', 'hash_lourdes_cruz', 'ONSITE_STAFF', '{"region": "Region V", "display_name": "L. Cruz", "barangay": "Brgy. Daraga, Albay", "is_disaster_affected": true}', '2026-05-14T11:00:00Z'),
  ('b0000001-0000-0000-0000-000000000010', 'hash_carlos_dimaculangan', 'ONSITE_STAFF', '{"region": "Region VIII", "display_name": "C. Dimaculangan", "barangay": "Brgy. Abucay, Tacloban", "is_disaster_affected": true}', '2026-05-14T12:00:00Z'),
  ('b0000001-0000-0000-0000-000000000011', 'hash_teresita_lim', 'WEB_PUBLIC', '{"region": "Region VIII", "display_name": "T. Lim", "barangay": "Brgy. San Jose, Ormoc", "is_disaster_affected": true}', '2026-05-15T07:00:00Z'),
  ('b0000001-0000-0000-0000-000000000012', 'hash_fernando_reyes2', 'ONSITE_STAFF', '{"region": "NCR", "display_name": "F. Reyes", "barangay": "Brgy. Payatas, Quezon City", "is_disaster_affected": true}', '2026-05-10T14:00:00Z'),
  ('b0000001-0000-0000-0000-000000000013', 'hash_gloria_roque', 'WEB_PUBLIC', '{"region": "Region V", "display_name": "G. Roque", "barangay": "Brgy. Peñafrancia, Naga", "is_disaster_affected": false}', '2026-05-15T08:00:00Z'),
  ('b0000001-0000-0000-0000-000000000014', 'hash_ricardo_pangilinan', 'ONSITE_STAFF', '{"region": "Region III", "display_name": "R. Pangilinan", "barangay": "Brgy. Sto. Rosario, Angeles", "is_disaster_affected": false}', '2026-05-16T09:00:00Z'),
  ('b0000001-0000-0000-0000-000000000015', 'hash_amelia_vega', 'WEB_PUBLIC', '{"region": "CAR", "display_name": "A. Vega", "barangay": "Brgy. Burnham, Baguio", "is_disaster_affected": false}', '2026-05-16T10:00:00Z')
ON CONFLICT (id_hash) DO NOTHING;
