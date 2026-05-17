-- Migration 015: Add Pests reference table + RLS
-- Creates a pest library for CVO officers to reference common farm pests.
-- Only admins can add/edit/delete pest records (same rules as Disease Library).

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE pests (
  pest_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pest_name           VARCHAR(150) NOT NULL UNIQUE,
  description         TEXT,
  signs_of_infestation TEXT,
  control_methods     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE pests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pest records
CREATE POLICY pests_read_all ON pests
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can create, update, or delete pest records
CREATE POLICY pests_admin_write ON pests
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── Seed Data ────────────────────────────────────────────────────────────────
INSERT INTO pests (pest_name, description, signs_of_infestation, control_methods) VALUES
(
  'Brown Rats (Rattus norvegicus)',
  'One of the most common rodent pests in farm settings. They contaminate feed, destroy stored grain, and can transmit diseases such as leptospirosis to both livestock and humans.',
  'Burrows near building foundations, gnaw marks on feed sacks and structures, droppings (torpedo-shaped, 20mm) around feeding areas, grease marks along walls and beams.',
  'Seal all entry points and gaps in walls/floors. Use snap traps or bait stations placed along walls and runways. Remove standing water and secure feed in metal or thick plastic containers. Dispose of waste promptly to remove harborage sites.'
),
(
  'House Flies (Musca domestica)',
  'Major pest in poultry and swine operations. Breeding in manure and decomposing matter, they mechanically transmit pathogens including Salmonella, E. coli, and parasites between animals and humans.',
  'Dense fly populations around manure pits, feed troughs, and water sources. Fly specks (small dark spots) on walls and surfaces. Maggots visible in wet, undisturbed manure or compost.',
  'Implement a strict manure management program (remove or compost regularly). Use sticky fly traps and UV light traps indoors. Apply residual insecticide sprays to resting surfaces. Encourage natural predators like parasitic wasps (Spalangia spp.) in manure piles.'
),
(
  'Mosquitoes (Aedes / Culex spp.)',
  'Blood-feeding insects that reduce animal productivity through stress and blood loss. Act as vectors for livestock diseases including Japanese Encephalitis (in swine) and avian malaria (in poultry).',
  'Standing water near animal housing (water troughs, puddles, containers). Visible adult mosquitoes swarming at dusk/dawn. Animals showing restlessness, skin lesions, and reduced feed intake from constant biting.',
  'Eliminate all sources of standing water weekly. Install window screens on poultry/swine houses. Use residual pyrethroid sprays on indoor walls. Apply larval control agents (Bacillus thuringiensis israelensis) to water bodies that cannot be drained.'
),
(
  'Mange Mites (Sarcoptes scabiei)',
  'Microscopic mites that burrow into the skin of pigs and other livestock, causing sarcoptic mange. Highly contagious within a herd. Results in intense itching, skin thickening, and significant production losses.',
  'Intense scratching and rubbing against fences and walls. Crusty, thickened skin patches starting around the ears and face. Hair loss (alopecia) and visible skin lesions spreading to the body. Reduced feed conversion and weight gain.',
  'Treat all animals in an affected herd simultaneously with injectable ivermectin or topical acaricide. Thoroughly clean and disinfect pens before reintroduction. Quarantine newly purchased animals for at least 3 weeks and treat before mixing with the herd.'
),
(
  'Cockroaches (Blatella germanica / Periplaneta americana)',
  'Nocturnal insects that harbor in warm, humid areas of farm buildings. Act as mechanical carriers of poultry diseases such as Marek''s disease and various Salmonella serovars by contaminating feed and water.',
  'Live insects seen during night inspections near water sources, feed storage, and inside equipment. Cockroach egg cases (oothecae) found in cracks and crevices. Musty odor in heavily infested areas.',
  'Eliminate moisture sources and fix leaking pipes. Apply gel bait insecticides in cracks and crevices away from animal contact. Use insect growth regulators (IGRs) to disrupt breeding cycles. Seal gaps in walls and around utilities.'
);
