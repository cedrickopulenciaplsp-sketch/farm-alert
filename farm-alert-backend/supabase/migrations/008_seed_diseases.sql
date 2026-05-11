-- Migration 008: Seed Initial Disease Library
-- Populates the database with common livestock diseases for testing

INSERT INTO diseases (disease_name, livestock_type_id, description, common_symptoms, causes, control_prevention)
VALUES
  (
    'African Swine Fever (ASF)',
    (SELECT livestock_type_id FROM livestock_types WHERE type_name = 'Swine'),
    'A highly contagious and deadly viral disease affecting domestic and wild pigs.',
    'High fever, loss of appetite, hemorrhages in the skin (reddening of ears, snout, and limbs), vomiting, diarrhea.',
    'Caused by the African swine fever virus (ASFV). Transmitted through direct contact with infected pigs, contaminated feed, or tick bites.',
    'Strict biosecurity measures, quarantine of infected areas, culling of infected herds. Currently, there is no approved vaccine.'
  ),
  (
    'Avian Influenza (Bird Flu)',
    (SELECT livestock_type_id FROM livestock_types WHERE type_name = 'Poultry'),
    'A viral infection that can infect not only birds, but also humans and other animals.',
    'Sudden death without clinical signs, lack of energy and appetite, decreased egg production, swelling of the head, eyelids, comb, wattles, and hocks.',
    'Caused by Influenza Type A viruses. Spread through direct contact with secretions from infected birds, especially feces or through contaminated feed and water.',
    'Strict biosecurity, restricted movement of poultry, surveillance, and culling of infected flocks.'
  ),
  (
    'Foot-and-Mouth Disease (FMD)',
    (SELECT livestock_type_id FROM livestock_types WHERE type_name = 'Both'),
    'A severe, highly contagious viral disease of livestock that has a significant economic impact.',
    'Fever, blister-like sores on the tongue and lips, in the mouth, on the teats, and between the hooves resulting in severe lameness.',
    'Caused by the Foot-and-mouth disease virus (FMDV). Spread via aerosols, direct contact with infected animals, and contaminated farming equipment.',
    'Vaccination (where endemic), strict import controls, quarantine, and culling during outbreaks.'
  ),
  (
    'Newcastle Disease',
    (SELECT livestock_type_id FROM livestock_types WHERE type_name = 'Poultry'),
    'An acute viral disease of domestic poultry and other bird species with worldwide distribution.',
    'Respiratory signs (gasping, coughing), nervous signs (depression, inappetence, drooping wings, paralysis), and digestive signs (greenish watery diarrhea).',
    'Caused by a virulent strain of avian paramyxovirus type 1. Transmitted through droppings and secretions from the nose, mouth, and eyes of infected birds.',
    'Routine vaccination is the most effective prevention. Maintain strict biosecurity and hygiene practices.'
  ),
  (
    'Swine Cholera (Classical Swine Fever)',
    (SELECT livestock_type_id FROM livestock_types WHERE type_name = 'Swine'),
    'A highly contagious viral disease of pigs causing significant morbidity and mortality.',
    'High fever, huddling, weakness, purple skin discoloration, conjunctivitis, and severe diarrhea.',
    'Caused by the Classical swine fever virus (CSFV). Transmitted by direct contact with infected pigs or contaminated materials (fomites).',
    'Prophylactic vaccination in endemic areas, strict quarantine, and elimination of infected animals.'
  )
ON CONFLICT (disease_name) DO NOTHING;
