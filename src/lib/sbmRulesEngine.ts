/**
 * Deterministic Swachh Bharat Mission (SBM) & Solid Waste Management (SWM) Rules 2016
 * Policy & Safety Validation Engine.
 *
 * Strictly separates visual AI observations from regulatory disposal rules,
 * jurisdiction-specific bin color mappings, and safety checks.
 */

export enum MaterialCode {
  PET_PLASTIC = 'PET_PLASTIC',
  HDPE_PP_PLASTIC = 'HDPE_PP_PLASTIC',
  MLP_PACKAGING = 'MLP_PACKAGING',
  COMPOSTABLE_PLA = 'COMPOSTABLE_PLA',
  PAPER_CARDBOARD = 'PAPER_CARDBOARD',
  SOILED_PAPER = 'SOILED_PAPER',
  ORGANIC_FOOD = 'ORGANIC_FOOD',
  GARDEN_BIOMASS = 'GARDEN_BIOMASS',
  GLASS_INTACT = 'GLASS_INTACT',
  GLASS_BROKEN_SHARP = 'GLASS_BROKEN_SHARP',
  METAL_ALUMINUM_STEEL = 'METAL_ALUMINUM_STEEL',
  METAL_SHARP = 'METAL_SHARP',
  E_WASTE_ELECTRONICS = 'E_WASTE_ELECTRONICS',
  BATTERY_CELL = 'BATTERY_CELL',
  CHEMICAL_PESTICIDE_PAINT = 'CHEMICAL_PESTICIDE_PAINT',
  PHARMACEUTICAL_MEDICINE = 'PHARMACEUTICAL_MEDICINE',
  SANITARY_BIOMEDICAL = 'SANITARY_BIOMEDICAL',
  CONSTRUCTION_INERT = 'CONSTRUCTION_INERT',
  TEXTILE_FABRIC = 'TEXTILE_FABRIC',
  AMBIGUOUS_UNKNOWN = 'AMBIGUOUS_UNKNOWN',
}

export enum ContaminationLevel {
  CLEAN = 'CLEAN',
  FOOD_GREASE_RESIDUE = 'FOOD_GREASE_RESIDUE',
  LIQUID_CONTAINING = 'LIQUID_CONTAINING',
  BIO_FLUID_CONTAMINATED = 'BIO_FLUID_CONTAMINATED',
  CHEMICAL_RESIDUE = 'CHEMICAL_RESIDUE',
  UNKNOWN = 'UNKNOWN',
}

export enum PhysicalCondition {
  INTACT = 'INTACT',
  CRUSHED_DEFORMED = 'CRUSHED_DEFORMED',
  SHARP_BROKEN = 'SHARP_BROKEN',
  COMPOSITE_MULTI_PART = 'COMPOSITE_MULTI_PART',
  SEALED_FULL = 'SEALED_FULL',
}

export enum HazardFlag {
  SHARP_LACERATION_RISK = 'SHARP_LACERATION_RISK',
  TOXIC_CHEMICAL = 'TOXIC_CHEMICAL',
  FIRE_BATTERY_HAZARD = 'FIRE_BATTERY_HAZARD',
  BIOHAZARD_PATHOGEN = 'BIOHAZARD_PATHOGEN',
  MERCURY_VAPOR = 'MERCURY_VAPOR',
}

export enum WasteCategory {
  WET_BIODEGRADABLE = 'Wet Waste (Biodegradable)',
  DRY_RECYCLABLE = 'Dry Waste (Recyclable)',
  DRY_NON_RECYCLABLE = 'Dry Waste (MLP / Low-Value Co-Processing)',
  DOMESTIC_HAZARDOUS = 'Domestic Hazardous Waste',
  SANITARY_BIOMEDICAL = 'Sanitary / Household Bio-Medical Waste',
  E_WASTE = 'E-Waste (Electronic & Battery Rules 2022)',
  CONSTRUCTION_DEMOLITION = 'Construction & Demolition (C&D) / Inert',
  CLARIFICATION_REQUIRED = 'Verification Required (Ambiguous Material)',
}

export interface BoundingBox {
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
  width: number; // 0-100 percentage width
  height: number; // 0-100 percentage height
}

export interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  overrideMaterial: MaterialCode;
  overrideContamination?: ContaminationLevel;
}

/**
 * Raw perceptual output produced by the multimodal VLM.
 * Notice: No regulatory bin colors or policy text are trusted from the model;
 * the model only reports visual observations.
 */
export interface VisualItemObservation {
  id: string;
  itemName: string;
  detectedMaterial: MaterialCode;
  visibleMaterialEvidence: string;
  contaminationState: ContaminationLevel;
  physicalCondition: PhysicalCondition;
  hazards: HazardFlag[];
  confidenceScore: number; // 0 - 100
  polymerOrMaterialPurity: number; // 0 - 100
  isAmbiguous: boolean;
  ambiguityReason?: string;
  clarificationQuestion?: string;
  clarificationOptions?: ClarificationOption[];
  boundingBox: BoundingBox;
}

export interface RawScenePerception {
  isWasteSceneValid: boolean;
  invalidSceneReason?: string;
  sceneSummary: string;
  isMixedWaste: boolean;
  overallSceneConfidence: number;
  items: VisualItemObservation[];
}

export interface JurisdictionStreamRule {
  binName: string;
  binColorLabel: string;
  accentTheme: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  collectionNotes: string;
}

export interface JurisdictionProfile {
  id: string;
  name: string;
  shortName: string;
  authority: string;
  description: string;
  streams: Record<WasteCategory, JurisdictionStreamRule>;
}

export const JURISDICTION_PROFILES: JurisdictionProfile[] = [
  {
    id: 'cpcb_swm_2016',
    name: 'CPCB National Standard (SWM Rules 2016)',
    shortName: 'CPCB National (SWM 2016)',
    authority: 'Central Pollution Control Board & MoHUA (Swachh Bharat Mission 2.0)',
    description:
      'National baseline guidelines under Solid Waste Management Rules 2016 & E-Waste Management Rules 2022.',
    streams: {
      [WasteCategory.WET_BIODEGRADABLE]: {
        binName: 'Green Bin — Wet Biodegradable Stream',
        binColorLabel: 'Green Bin (SBM Standard)',
        accentTheme: 'emerald',
        collectionNotes: 'Daily door-to-door biodegradable collection for composting / biomethanation.',
      },
      [WasteCategory.DRY_RECYCLABLE]: {
        binName: 'Blue Bin — Dry Recyclable Stream',
        binColorLabel: 'Blue Bin (SBM Standard)',
        accentTheme: 'sky',
        collectionNotes: 'Routed to Material Recovery Facility (MRF) for dry sorting and recycling.',
      },
      [WasteCategory.DRY_NON_RECYCLABLE]: {
        binName: 'Blue Bin (Dry Non-Recyclable / MLP Fraction)',
        binColorLabel: 'Blue Bin / Dry MRF Fraction',
        accentTheme: 'sky',
        collectionNotes: 'Clean Multi-Layered Plastic (MLP) routed via MRF to cement plants for co-processing.',
      },
      [WasteCategory.DOMESTIC_HAZARDOUS]: {
        binName: 'Black Bin — Domestic Hazardous Stream',
        binColorLabel: 'Black Bin / Hazardous Deposition Center',
        accentTheme: 'amber',
        collectionNotes: 'Keep separate from wet/dry waste; hand over to designated hazardous collection vehicle.',
      },
      [WasteCategory.SANITARY_BIOMEDICAL]: {
        binName: 'Red Bin / Wrapped Sanitary Stream (Red Cross Mark)',
        binColorLabel: 'Red Bin or Yellow/Paper Wrap with Red "X"',
        accentTheme: 'rose',
        collectionNotes: 'SWM Rules 2016 mandate wrapping securely in pouch/newspaper marked with a red cross.',
      },
      [WasteCategory.E_WASTE]: {
        binName: 'Authorized E-Waste Drop-Off / Producer Take-Back (PRO)',
        binColorLabel: 'E-Waste Collection Box (Never Municipal Bin)',
        accentTheme: 'amber',
        collectionNotes: 'Governed by E-Waste Rules 2022 & Battery Waste Rules 2022. Hand over to CPCB-authorized dismantler.',
      },
      [WasteCategory.CONSTRUCTION_DEMOLITION]: {
        binName: 'Dedicated C&D / Inert Waste Collection',
        binColorLabel: 'ULB C&D Collection Point',
        accentTheme: 'slate',
        collectionNotes: 'Do not mix rubble or ceramics into municipal compactors; use ULB C&D helpline.',
      },
      [WasteCategory.CLARIFICATION_REQUIRED]: {
        binName: 'Hold Disposal — Material Verification Needed',
        binColorLabel: 'Pending User Verification',
        accentTheme: 'amber',
        collectionNotes: 'Confirm physical label or material property below before selecting a bin.',
      },
    },
  },
  {
    id: 'bbmp_bengaluru',
    name: 'Bengaluru BBMP (2-Bin + 1 Bag Mandate)',
    shortName: 'Bengaluru (BBMP)',
    authority: 'Bruhat Bengaluru Mahanagara Palike (BBMP SWM Bye-Laws)',
    description:
      'Bengaluru enforces strict 3-way household segregation: Green Bin (Wet), Blue Bag/Bin (Dry), and Red Bin/Newspaper with Red Cross (Sanitary/Reject).',
    streams: {
      [WasteCategory.WET_BIODEGRADABLE]: {
        binName: 'Green Bin — Wet / Organic Waste',
        binColorLabel: 'BBMP Green Bin',
        accentTheme: 'emerald',
        collectionNotes: 'Collected daily by BBMP Auto-Tipper for wet waste processing.',
      },
      [WasteCategory.DRY_RECYCLABLE]: {
        binName: 'Blue Bin / Reusable Bag — Dry Waste',
        binColorLabel: 'BBMP Blue Bin / Dry Bag',
        accentTheme: 'sky',
        collectionNotes: 'Collected twice weekly for BBMP Dry Waste Collection Centres (DWCC).',
      },
      [WasteCategory.DRY_NON_RECYCLABLE]: {
        binName: 'Blue Bin / DWCC Low-Value Plastic Stream',
        binColorLabel: 'BBMP Dry Waste (DWCC)',
        accentTheme: 'sky',
        collectionNotes: 'Keep clean and dry; DWCC routes MLP packets for co-processing.',
      },
      [WasteCategory.DOMESTIC_HAZARDOUS]: {
        binName: 'Red Bin / Separate Hazardous Handover',
        binColorLabel: 'BBMP Red Bin / Hazardous Handover',
        accentTheme: 'amber',
        collectionNotes: 'Hand over separately to collection staff or BBMP Kasa Kiosk; never mix with wet/dry.',
      },
      [WasteCategory.SANITARY_BIOMEDICAL]: {
        binName: 'Red Bin — Sanitary & Reject Waste',
        binColorLabel: 'BBMP Red Bin (Wrapped with Red Cross)',
        accentTheme: 'rose',
        collectionNotes: 'Wrap in newspaper and mark clearly with a Red Cross before placing in the Red Bin.',
      },
      [WasteCategory.E_WASTE]: {
        binName: 'BBMP DWCC E-Waste Drop-Off / KSPCB Recycler',
        binColorLabel: 'DWCC E-Waste Bin',
        accentTheme: 'amber',
        collectionNotes: 'Drop off at your ward Dry Waste Collection Centre (DWCC) E-waste counter.',
      },
      [WasteCategory.CONSTRUCTION_DEMOLITION]: {
        binName: 'BBMP Sahaya C&D Debris Pickup',
        binColorLabel: 'Separate C&D Pickup',
        accentTheme: 'slate',
        collectionNotes: 'Book authorized C&D debris pickup via BBMP Sahaya; prohibited in regular bins.',
      },
      [WasteCategory.CLARIFICATION_REQUIRED]: {
        binName: 'Hold Disposal — Material Verification Needed',
        binColorLabel: 'Pending User Verification',
        accentTheme: 'amber',
        collectionNotes: 'Confirm physical label or material property below before selecting a bin.',
      },
    },
  },
  {
    id: 'imc_indore',
    name: 'Indore IMC (6-Category Source Segregation)',
    shortName: 'Indore (IMC 6-Bin)',
    authority: 'Indore Municipal Corporation (Swachh Survekshan Model)',
    description:
      'Indore Municipal Corporation operates compartmentalized collection vehicles supporting 6 distinct household streams.',
    streams: {
      [WasteCategory.WET_BIODEGRADABLE]: {
        binName: 'Green Compartment — Wet / Bio-CNG Feedstock',
        binColorLabel: 'IMC Green Bin (Wet)',
        accentTheme: 'emerald',
        collectionNotes: 'Routed directly to Indore Bio-CNG plant; zero plastic or metal tolerance.',
      },
      [WasteCategory.DRY_RECYCLABLE]: {
        binName: 'Blue Compartment — Dry Recyclable (Non-Plastic / Rigid)',
        binColorLabel: 'IMC Blue Bin (Dry)',
        accentTheme: 'sky',
        collectionNotes: 'Sorted at automated Nepra MRF facility.',
      },
      [WasteCategory.DRY_NON_RECYCLABLE]: {
        binName: 'Separate Plastic / MLP Collection Bag',
        binColorLabel: 'IMC Plastic & MLP Stream',
        accentTheme: 'sky',
        collectionNotes: 'Indore separates flexible plastics/MLP into a dedicated dry sub-stream.',
      },
      [WasteCategory.DOMESTIC_HAZARDOUS]: {
        binName: 'Black Compartment — Domestic Hazardous',
        binColorLabel: 'IMC Black Bin (Hazardous)',
        accentTheme: 'amber',
        collectionNotes: 'Placed in the rear hazardous compartment of the IMC tipper vehicle.',
      },
      [WasteCategory.SANITARY_BIOMEDICAL]: {
        binName: 'Yellow / Red Sanitary Compartment',
        binColorLabel: 'IMC Yellow/Red Sanitary Stream',
        accentTheme: 'rose',
        collectionNotes: 'Routed to Common Bio-Medical Waste Treatment Facility (CBWTF) incinerator.',
      },
      [WasteCategory.E_WASTE]: {
        binName: 'IMC Domestic E-Waste Compartment / 311 App',
        binColorLabel: 'IMC E-Waste Compartment',
        accentTheme: 'amber',
        collectionNotes: 'Hand over to the tipper E-waste bucket or schedule via Indore 311 App.',
      },
      [WasteCategory.CONSTRUCTION_DEMOLITION]: {
        binName: 'IMC C&D Processing Plant Pickup (Indore 311)',
        binColorLabel: 'IMC C&D Booking',
        accentTheme: 'slate',
        collectionNotes: 'Request C&D pickup via Indore 311 app for recycling into paver blocks.',
      },
      [WasteCategory.CLARIFICATION_REQUIRED]: {
        binName: 'Hold Disposal — Material Verification Needed',
        binColorLabel: 'Pending User Verification',
        accentTheme: 'amber',
        collectionNotes: 'Confirm physical label or material property below before selecting a bin.',
      },
    },
  },
];

export interface ValidatedWasteItem extends VisualItemObservation {
  materialLabel: string;
  wasteCategory: WasteCategory;
  disposalDestination: string;
  binColorBadge: string;
  accentTheme: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  collectionNotes: string;
  preparationSteps: string[];
  safetyWarnings: string[];
  regulatoryBasis: string;
  contaminationRiskLabel: 'Low' | 'Moderate' | 'High' | 'Critical';
  recyclabilityLabel: 'High (Material Recovery)' | 'Compostable / Bio-Methanation' | 'Co-Processing Only' | 'Non-Recyclable (Safe Containment)' | 'Pending Verification';
}

export interface ValidatedSceneAnalysis {
  analysisId: string;
  timestamp: string;
  timestampIso: string;
  imageDataUrl?: string;
  imageSourceLabel?: string;
  mode: 'LIVE_AI' | 'DEMO_SIMULATION';
  modeReason?: string;
  jurisdiction: JurisdictionProfile;
  isWasteSceneValid: boolean;
  invalidSceneReason?: string;
  sceneSummary: string;
  isMixedWaste: boolean;
  overallSceneConfidence: number;
  items: ValidatedWasteItem[];
  separationAlert?: string;
}

const MATERIAL_HUMAN_LABELS: Record<MaterialCode, string> = {
  [MaterialCode.PET_PLASTIC]: 'PET Plastic (#1 Polyethylene Terephthalate)',
  [MaterialCode.HDPE_PP_PLASTIC]: 'Rigid Plastic (HDPE #2 / PP #5)',
  [MaterialCode.MLP_PACKAGING]: 'Multi-Layered Plastic (MLP / Foil-Lined Wrapper)',
  [MaterialCode.COMPOSTABLE_PLA]: 'Certified Compostable Bioplastic (PLA / IS 17088)',
  [MaterialCode.PAPER_CARDBOARD]: 'Cellulose Paper / Corrugated Cardboard',
  [MaterialCode.SOILED_PAPER]: 'Food-Soiled / Grease-Saturated Paper',
  [MaterialCode.ORGANIC_FOOD]: 'Organic Kitchen / Food Scraps',
  [MaterialCode.GARDEN_BIOMASS]: 'Garden Biomass / Yard Trimmings',
  [MaterialCode.GLASS_INTACT]: 'Intact Silicate Glass Container',
  [MaterialCode.GLASS_BROKEN_SHARP]: 'Broken / Sharp Glass Fragments',
  [MaterialCode.METAL_ALUMINUM_STEEL]: 'Recyclable Metal (Aluminum / Tin / Steel)',
  [MaterialCode.METAL_SHARP]: 'Sharp Metal Object (Blade / Needle / Jagged Tin)',
  [MaterialCode.E_WASTE_ELECTRONICS]: 'Electronic Waste (Circuitry / Cables / Appliance)',
  [MaterialCode.BATTERY_CELL]: 'Electrochemical Battery Cell (Li-Ion / Alkaline)',
  [MaterialCode.CHEMICAL_PESTICIDE_PAINT]: 'Chemical / Paint / Solvent Container',
  [MaterialCode.PHARMACEUTICAL_MEDICINE]: 'Expired Pharmaceutical / Medicine Packaging',
  [MaterialCode.SANITARY_BIOMEDICAL]: 'Sanitary / Household Bio-Medical Waste',
  [MaterialCode.CONSTRUCTION_INERT]: 'Construction & Demolition (Ceramic / Rubble / Inert)',
  [MaterialCode.TEXTILE_FABRIC]: 'Clean Textile / Fabric Material',
  [MaterialCode.AMBIGUOUS_UNKNOWN]: 'Unverified / Visually Ambiguous Material',
};

/**
 * Deterministic Rule Engine that maps a visual observation + selected jurisdiction
 * into verified regulatory disposal instructions and safety warnings.
 */
export function evaluateWasteItem(
  obs: VisualItemObservation,
  jurisdiction: JurisdictionProfile
): ValidatedWasteItem {
  const prepSteps: string[] = [];
  const safetyWarnings: string[] = [];
  let category: WasteCategory = WasteCategory.DRY_RECYCLABLE;
  let regulatoryBasis = 'SWM Rules 2016 — Rule 4 (Duties of Waste Generators)';
  let contaminationRiskLabel: ValidatedWasteItem['contaminationRiskLabel'] = 'Low';
  let recyclabilityLabel: ValidatedWasteItem['recyclabilityLabel'] = 'High (Material Recovery)';

  const hasSharpHazard =
    obs.physicalCondition === PhysicalCondition.SHARP_BROKEN ||
    obs.detectedMaterial === MaterialCode.GLASS_BROKEN_SHARP ||
    obs.detectedMaterial === MaterialCode.METAL_SHARP ||
    obs.hazards.includes(HazardFlag.SHARP_LACERATION_RISK);

  const hasBioHazard =
    obs.detectedMaterial === MaterialCode.SANITARY_BIOMEDICAL ||
    obs.contaminationState === ContaminationLevel.BIO_FLUID_CONTAMINATED ||
    obs.hazards.includes(HazardFlag.BIOHAZARD_PATHOGEN);

  const hasBatteryOrEWaste =
    obs.detectedMaterial === MaterialCode.BATTERY_CELL ||
    obs.detectedMaterial === MaterialCode.E_WASTE_ELECTRONICS ||
    obs.hazards.includes(HazardFlag.FIRE_BATTERY_HAZARD) ||
    obs.hazards.includes(HazardFlag.MERCURY_VAPOR);

  const hasChemicalOrPharma =
    obs.detectedMaterial === MaterialCode.CHEMICAL_PESTICIDE_PAINT ||
    obs.detectedMaterial === MaterialCode.PHARMACEUTICAL_MEDICINE ||
    obs.contaminationState === ContaminationLevel.CHEMICAL_RESIDUE ||
    obs.hazards.includes(HazardFlag.TOXIC_CHEMICAL);

  // RULE 0: Ambiguity / Clarification check (unless overriding a critical sharp/biohazard)
  if (
    obs.isAmbiguous &&
    !hasSharpHazard &&
    !hasBioHazard &&
    !hasBatteryOrEWaste &&
    !hasChemicalOrPharma
  ) {
    category = WasteCategory.CLARIFICATION_REQUIRED;
    regulatoryBasis = 'CPCB Source Segregation Protocol — Visual Verification Required';
    contaminationRiskLabel = 'Moderate';
    recyclabilityLabel = 'Pending Verification';
    prepSteps.push(
      obs.clarificationQuestion ||
        'Inspect the item closely for a resin code (#1–#7), CPCB IS 17088 compostable mark, or inner foil layer.'
    );
    prepSteps.push(
      'Select one of the verification options on this card to compute the verified disposal route.'
    );
    safetyWarnings.push(
      'Visual imagery alone cannot verify chemical polymer composition when labels are occluded. Do not guess—use the verification selector.'
    );
  }
  // RULE 1: Sanitary & Bio-Medical Waste (Highest Pathogen Priority)
  else if (hasBioHazard) {
    category = WasteCategory.SANITARY_BIOMEDICAL;
    regulatoryBasis = 'SWM Rules 2016 & Bio-Medical Waste Management Rules 2016';
    contaminationRiskLabel = 'Critical';
    recyclabilityLabel = 'Non-Recyclable (Safe Containment)';

    if (hasSharpHazard) {
      safetyWarnings.push(
        'CRITICAL BIO-SHARP HAZARD: Puncturing risk with pathogen exposure to Safai Mitras (sanitation workers). Place inside a puncture-proof rigid plastic container before sealing.'
      );
      prepSteps.push('Place the sharp medical item inside a rigid, puncture-proof container or thick cardboard box.');
    } else {
      safetyWarnings.push(
        'BIOHAZARD WARNING: Unwrapped sanitary/medical items expose manual waste sorters to bloodborne and respiratory pathogens.'
      );
    }

    prepSteps.push(
      'Wrap securely in leak-proof newspaper or a biodegradable sanitary disposal pouch.'
    );
    prepSteps.push(
      'Mark the exterior clearly with a bold Red Cross ("X") so collection staff route it directly to incineration/CBWTF without opening.'
    );
  }
  // RULE 2: Battery & E-Waste (Fire & Heavy Metal Toxicity Priority)
  else if (hasBatteryOrEWaste) {
    category = WasteCategory.E_WASTE;
    regulatoryBasis = 'E-Waste (Management) Rules 2022 & Battery Waste Management Rules 2022';
    contaminationRiskLabel = 'Critical';
    recyclabilityLabel = 'High (Material Recovery)';

    if (
      obs.detectedMaterial === MaterialCode.BATTERY_CELL ||
      obs.hazards.includes(HazardFlag.FIRE_BATTERY_HAZARD)
    ) {
      safetyWarnings.push(
        'LITHIUM / BATTERY FIRE RISK: Never discard batteries in Dry or Wet bins. Compaction in garbage trucks causes thermal runaway fires and toxic hydrofluoric gas release.'
      );
      prepSteps.push(
        'Apply clear non-conductive tape over the positive and negative battery terminals to prevent short-circuiting.'
      );
      prepSteps.push(
        'If the battery is swollen or punctured, store it in a cool, non-flammable container (sand/metal box) away from heat.'
      );
    } else if (obs.hazards.includes(HazardFlag.MERCURY_VAPOR)) {
      safetyWarnings.push(
        'MERCURY VAPOR HAZARD (CFL / Fluorescent Tube): Contains neurotoxic mercury. Wrap carefully in bubble wrap or cardboard so the glass tube does not shatter.'
      );
    } else {
      safetyWarnings.push(
        'HEAVY METAL LEACHING RISK: Electronic circuitry contains lead, cadmium, and brominated flame retardants. Must not enter municipal landfills.'
      );
    }

    prepSteps.push(
      'Store in a dry box and deposit at an authorized E-Waste collection center, CPCB producer take-back kiosk, or ULB E-Waste drive.'
    );
  }
  // RULE 3: Sharps & Broken Glass/Metal (Physical Injury Priority)
  else if (hasSharpHazard) {
    category = WasteCategory.DOMESTIC_HAZARDOUS;
    regulatoryBasis = 'SWM Rules 2016 — Domestic Hazardous & Safai Mitra Safety Protocol';
    contaminationRiskLabel = 'High';
    recyclabilityLabel = 'Non-Recyclable (Safe Containment)';

    safetyWarnings.push(
      'LACERATION HAZARD: Loose broken glass or sharp metal causes severe hand injuries to sanitation workers during manual sorting.'
    );
    prepSteps.push(
      'Wrap all sharp edges or glass shards tightly in multiple layers of thick newspaper or place inside a taped cardboard box.'
    );
    prepSteps.push(
      'Label the outside package clearly as "SHARP / BROKEN GLASS" before handing over to the hazardous/reject stream.'
    );
  }
  // RULE 4: Domestic Hazardous Chemicals & Pharmaceuticals
  else if (hasChemicalOrPharma) {
    category = WasteCategory.DOMESTIC_HAZARDOUS;
    regulatoryBasis = 'SWM Rules 2016 — Schedule I (Domestic Hazardous Waste)';
    contaminationRiskLabel = 'Critical';
    recyclabilityLabel = 'Non-Recyclable (Safe Containment)';

    if (obs.detectedMaterial === MaterialCode.PHARMACEUTICAL_MEDICINE) {
      safetyWarnings.push(
        'PHARMACEUTICAL CONTAMINATION RISK: Do not flush expired medicines down toilets or drains—active pharmaceutical ingredients pollute groundwater. Do not leave accessible in open bins.'
      );
      prepSteps.push(
        'Keep tablets/capsules sealed inside their blister pack or original container to prevent accidental ingestion by stray animals or children.'
      );
      prepSteps.push(
        'Place in the Domestic Hazardous stream (Black Bin) or return to a pharmacy medicine take-back drop box.'
      );
    } else {
      safetyWarnings.push(
        'TOXIC CHEMICAL RESIDUE: Pesticide, paint, solvent, or harsh cleaner containers contaminate recyclable plastics and poison composting microbes.'
      );
      prepSteps.push(
        'Ensure the cap is tightly sealed so residual fumes or liquids cannot leak.'
      );
      prepSteps.push(
        'Never rinse chemical or pesticide containers into household sinks; route the sealed container directly to Domestic Hazardous Waste.'
      );
    }
  }
  // RULE 5: Organic, Biodegradable, Soiled Paper & Certified Compostable PLA
  else if (
    obs.detectedMaterial === MaterialCode.ORGANIC_FOOD ||
    obs.detectedMaterial === MaterialCode.GARDEN_BIOMASS ||
    obs.detectedMaterial === MaterialCode.SOILED_PAPER ||
    obs.detectedMaterial === MaterialCode.COMPOSTABLE_PLA ||
    (obs.detectedMaterial === MaterialCode.PAPER_CARDBOARD &&
      obs.contaminationState === ContaminationLevel.FOOD_GREASE_RESIDUE)
  ) {
    category = WasteCategory.WET_BIODEGRADABLE;
    regulatoryBasis = 'SWM Rules 2016 — Biodegradable / Compostable Stream';
    contaminationRiskLabel = 'Low';
    recyclabilityLabel = 'Compostable / Bio-Methanation';

    if (
      obs.detectedMaterial === MaterialCode.PAPER_CARDBOARD ||
      obs.detectedMaterial === MaterialCode.SOILED_PAPER
    ) {
      prepSteps.push(
        'Tear off any clean, unstained cardboard flaps and place them in the Dry (Blue) bin.'
      );
      prepSteps.push(
        'Place the grease-soaked or food-stained paper section into the Wet (Green) biodegradable bin (grease ruins paper pulp recycling).'
      );
    } else if (obs.detectedMaterial === MaterialCode.COMPOSTABLE_PLA) {
      prepSteps.push(
        'Verify the CPCB IS 17088 compostable certification mark is present; remove any non-compostable stickers.'
      );
      prepSteps.push(
        'Route to industrial composting / Wet Waste stream—never mix PLA bioplastic with PET #1 recyclables.'
      );
    } else {
      prepSteps.push(
        'Remove any plastic wrappers, rubber bands, fruit stickers, or twist-ties before placing in the Wet bin.'
      );
      prepSteps.push(
        'Drain excess free liquid so the wet bin liner does not rupture during collection.'
      );
    }
  }
  // RULE 6: Construction & Demolition / Inert Ceramics
  else if (obs.detectedMaterial === MaterialCode.CONSTRUCTION_INERT) {
    category = WasteCategory.CONSTRUCTION_DEMOLITION;
    regulatoryBasis = 'Construction and Demolition Waste Management Rules 2016';
    contaminationRiskLabel = 'Moderate';
    recyclabilityLabel = 'Non-Recyclable (Safe Containment)';

    prepSteps.push(
      'Keep ceramic, tile, or concrete debris in a sturdy woven sack separate from daily household wet and dry bins.'
    );
    prepSteps.push(
      'Deposit at your municipal ward C&D collection point (ceramics cannot be melted with silicate glass bottles).'
    );
  }
  // RULE 7: Multi-Layered Packaging (MLP)
  else if (obs.detectedMaterial === MaterialCode.MLP_PACKAGING) {
    category = WasteCategory.DRY_NON_RECYCLABLE;
    regulatoryBasis = 'Plastic Waste Management Rules 2016 (MLP Co-Processing)';
    contaminationRiskLabel =
      obs.contaminationState === ContaminationLevel.CLEAN ? 'Low' : 'Moderate';
    recyclabilityLabel = 'Co-Processing Only';

    if (obs.contaminationState !== ContaminationLevel.CLEAN) {
      prepSteps.push(
        'Empty all crumbs or food residue and wipe/rinse the inside of the wrapper so it does not attract pests or rot in the Dry stream.'
      );
    }
    prepSteps.push(
      'Cut open packets using a clean straight cut (avoid snipping off tiny triangular plastic corners, which become microplastic litter).'
    );
    prepSteps.push(
      'Ensure the wrapper is completely dry before placing it in the Dry waste collection bag.'
    );
  }
  // RULE 8: Standard Dry Recyclables (PET, HDPE/PP, Clean Paper/Cardboard, Intact Glass, Metal, Textile)
  else {
    category = WasteCategory.DRY_RECYCLABLE;
    regulatoryBasis = 'SWM Rules 2016 & Plastic Waste Management Rules 2016';
    recyclabilityLabel = 'High (Material Recovery)';

    if (obs.contaminationState === ContaminationLevel.LIQUID_CONTAINING) {
      contaminationRiskLabel = 'High';
      safetyWarnings.push(
        'CROSS-STREAM CONTAMINATION ALERT: Container still holds liquid. Discarding liquid-filled containers into the Dry (Blue) bin ruins paper and cardboard recyclables.'
      );
      prepSteps.push(
        'Step 1: Uncap and empty all remaining liquid into a sink or Wet waste stream.'
      );
      prepSteps.push(
        'Step 2: Quick-rinse the interior with water and shake dry before placing in the Dry bin.'
      );
    } else if (obs.contaminationState === ContaminationLevel.FOOD_GREASE_RESIDUE) {
      contaminationRiskLabel = 'Moderate';
      safetyWarnings.push(
        'ORGANIC RESIDUE WARNING: Unrinsed food residue inside recyclable containers causes fungal growth and causes the item to be rejected at the MRF.'
      );
      prepSteps.push(
        'Scrape any leftover food into the Green (Wet) bin, then rinse and air-dry the container.'
      );
    } else {
      contaminationRiskLabel = 'Low';
      prepSteps.push('Verify the item is empty, clean, and dry before disposal.');
    }

    if (obs.physicalCondition === PhysicalCondition.COMPOSITE_MULTI_PART) {
      prepSteps.push(
        'Separate different material components (e.g., unscrew plastic/metal cap or peel off loose sleeve) so each polymer/metal sorts cleanly.'
      );
    }

    if (
      obs.detectedMaterial === MaterialCode.PET_PLASTIC ||
      obs.detectedMaterial === MaterialCode.HDPE_PP_PLASTIC ||
      obs.detectedMaterial === MaterialCode.METAL_ALUMINUM_STEEL
    ) {
      prepSteps.push(
        'Crush the bottle or can vertically to save volume in the Dry collection bag, then replace the cap.'
      );
    } else if (obs.detectedMaterial === MaterialCode.PAPER_CARDBOARD) {
      prepSteps.push(
        'Flatten cardboard boxes and remove plastic packing tape or bubble-wrap liners.'
      );
    }
  }

  const streamRule = jurisdiction.streams[category];

  return {
    ...obs,
    materialLabel: MATERIAL_HUMAN_LABELS[obs.detectedMaterial] || 'Unclassified Material',
    wasteCategory: category,
    disposalDestination: streamRule.binName,
    binColorBadge: streamRule.binColorLabel,
    accentTheme: streamRule.accentTheme,
    collectionNotes: streamRule.collectionNotes,
    preparationSteps: prepSteps,
    safetyWarnings,
    regulatoryBasis,
    contaminationRiskLabel,
    recyclabilityLabel,
  };
}

/**
 * Evaluates a full scene perception output against the selected municipal jurisdiction.
 */
export function evaluateScene(
  rawScene: RawScenePerception,
  jurisdictionId: string,
  mode: 'LIVE_AI' | 'DEMO_SIMULATION',
  modeReason?: string
): ValidatedSceneAnalysis {
  const jurisdiction =
    JURISDICTION_PROFILES.find((j) => j.id === jurisdictionId) || JURISDICTION_PROFILES[0];

  const validatedItems = (rawScene.items || []).map((item) =>
    evaluateWasteItem(item, jurisdiction)
  );

  const distinctDestinations = new Set(validatedItems.map((i) => i.disposalDestination));
  let separationAlert: string | undefined;

  if (validatedItems.length > 1 && distinctDestinations.size > 1) {
    separationAlert = `Multi-Stream Mixed Waste Detected: This scene contains ${validatedItems.length} items spanning ${distinctDestinations.size} different waste streams. Do not discard together—separate each component as instructed below.`;
  }

  const now = new Date();
  return {
    analysisId: `TV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    timestamp: now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    timestampIso: now.toISOString(),
    mode,
    modeReason,
    jurisdiction,
    isWasteSceneValid: rawScene.isWasteSceneValid,
    invalidSceneReason: rawScene.invalidSceneReason,
    sceneSummary: rawScene.sceneSummary,
    isMixedWaste: rawScene.isMixedWaste || distinctDestinations.size > 1,
    overallSceneConfidence: rawScene.overallSceneConfidence,
    items: validatedItems,
    separationAlert,
  };
}

/**
 * Curated realistic Indian waste preset scenarios for instant testing & Demo fallback.
 */
export interface WasteSamplePreset {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  rawPerception: RawScenePerception;
}

export const WASTE_SAMPLE_PRESETS: WasteSamplePreset[] = [
  {
    id: 'mixed_kitchen_takeaway',
    title: 'Mixed Kitchen & Takeaway Tray',
    subtitle: 'PET bottle with leftover liquid, banana peels, and grease-stained pizza box',
    badgeText: 'Mixed 3-Item Scene',
    rawPerception: {
      isWasteSceneValid: true,
      sceneSummary:
        'Mixed household post-meal waste containing a clear PET beverage bottle with residual liquid, organic fruit peels, and a grease-saturated corrugated takeaway box.',
      isMixedWaste: true,
      overallSceneConfidence: 95.4,
      items: [
        {
          id: 'item-1',
          itemName: 'Clear Plastic Beverage Bottle (Half-Filled)',
          detectedMaterial: MaterialCode.PET_PLASTIC,
          visibleMaterialEvidence:
            'Transparent blow-molded PET (#1) bottle with polypropylene screw cap; visible liquid meniscus inside.',
          contaminationState: ContaminationLevel.LIQUID_CONTAINING,
          physicalCondition: PhysicalCondition.COMPOSITE_MULTI_PART,
          hazards: [],
          confidenceScore: 96.8,
          polymerOrMaterialPurity: 94,
          isAmbiguous: false,
          boundingBox: { x: 8, y: 14, width: 26, height: 68 },
        },
        {
          id: 'item-2',
          itemName: 'Organic Banana Peels & Vegetable Trimmings',
          detectedMaterial: MaterialCode.ORGANIC_FOOD,
          visibleMaterialEvidence: 'Uncooked plant biomass and fruit rinds with no plastic packaging attached.',
          contaminationState: ContaminationLevel.CLEAN,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [],
          confidenceScore: 98.2,
          polymerOrMaterialPurity: 99,
          isAmbiguous: false,
          boundingBox: { x: 38, y: 42, width: 25, height: 42 },
        },
        {
          id: 'item-3',
          itemName: 'Grease-Soaked Cardboard Takeaway Box',
          detectedMaterial: MaterialCode.PAPER_CARDBOARD,
          visibleMaterialEvidence:
            'Uncoated corrugated kraft board with heavy translucent oil saturation across bottom base.',
          contaminationState: ContaminationLevel.FOOD_GREASE_RESIDUE,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [],
          confidenceScore: 91.2,
          polymerOrMaterialPurity: 68,
          isAmbiguous: false,
          boundingBox: { x: 66, y: 18, width: 28, height: 64 },
        },
      ],
    },
  },
  {
    id: 'hazardous_ewaste_bench',
    title: 'Domestic Hazardous & E-Waste Mix',
    subtitle: 'Swollen lithium battery pack, shattered glass medicine vial, and USB cable',
    badgeText: 'High Safety Priority',
    rawPerception: {
      isWasteSceneValid: true,
      sceneSummary:
        'High-risk household discard group containing an expanded lithium-ion pouch cell, fractured glass medication vial, and insulated copper charging cord.',
      isMixedWaste: true,
      overallSceneConfidence: 94.1,
      items: [
        {
          id: 'item-haz-1',
          itemName: 'Swollen Lithium-Ion Battery Cell',
          detectedMaterial: MaterialCode.BATTERY_CELL,
          visibleMaterialEvidence:
            'Metallic pouch cell with visible casing expansion and exposed contact tabs.',
          contaminationState: ContaminationLevel.CLEAN,
          physicalCondition: PhysicalCondition.CRUSHED_DEFORMED,
          hazards: [HazardFlag.FIRE_BATTERY_HAZARD, HazardFlag.TOXIC_CHEMICAL],
          confidenceScore: 97.5,
          polymerOrMaterialPurity: 92,
          isAmbiguous: false,
          boundingBox: { x: 10, y: 24, width: 25, height: 48 },
        },
        {
          id: 'item-haz-2',
          itemName: 'Shattered Glass Medicine Vial',
          detectedMaterial: MaterialCode.GLASS_BROKEN_SHARP,
          visibleMaterialEvidence:
            'Fractured amber borosilicate glass ampoule with jagged sharp shards and pharmaceutical label.',
          contaminationState: ContaminationLevel.CHEMICAL_RESIDUE,
          physicalCondition: PhysicalCondition.SHARP_BROKEN,
          hazards: [HazardFlag.SHARP_LACERATION_RISK, HazardFlag.TOXIC_CHEMICAL],
          confidenceScore: 94.6,
          polymerOrMaterialPurity: 88,
          isAmbiguous: false,
          boundingBox: { x: 40, y: 30, width: 24, height: 46 },
        },
        {
          id: 'item-haz-3',
          itemName: 'Frayed USB Charging Cable',
          detectedMaterial: MaterialCode.E_WASTE_ELECTRONICS,
          visibleMaterialEvidence: 'PVC-jacketed copper wire with USB-A/Type-C metal connectors.',
          contaminationState: ContaminationLevel.CLEAN,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [],
          confidenceScore: 96.0,
          polymerOrMaterialPurity: 90,
          isAmbiguous: false,
          boundingBox: { x: 68, y: 20, width: 24, height: 60 },
        },
      ],
    },
  },
  {
    id: 'ambiguous_cup_and_snack',
    title: 'Ambiguous Clear Cup & Foil Snack Packet',
    subtitle: 'Unlabeled transparent takeaway cup (PET vs PLA) + Multi-Layered Plastic wrapper',
    badgeText: 'Ambiguity & Clarification',
    rawPerception: {
      isWasteSceneValid: true,
      sceneSummary:
        'Contains an unlabeled transparent cold-drink cup with optically indistinguishable polymer composition (PET vs Compostable PLA) alongside a metallized snack pouch.',
      isMixedWaste: true,
      overallSceneConfidence: 78.5,
      items: [
        {
          id: 'item-amb-1',
          itemName: 'Unlabeled Transparent Cold Beverage Cup',
          detectedMaterial: MaterialCode.AMBIGUOUS_UNKNOWN,
          visibleMaterialEvidence:
            'Clear thermoformed cup; base embossing is not visible from camera angle to distinguish #1 PET from #7 PLA bioplastic.',
          contaminationState: ContaminationLevel.CLEAN,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [],
          confidenceScore: 64.0,
          polymerOrMaterialPurity: 50,
          isAmbiguous: true,
          ambiguityReason:
            'Conventional #1 PET plastic and IS 17088 Compostable PLA cups are visually identical without inspecting the bottom resin stamp or CPCB green logo.',
          clarificationQuestion:
            'Check the bottom or side of the cup: What marking or physical property do you see?',
          clarificationOptions: [
            {
              id: 'opt-pet',
              label: 'Marked #1 PET / #5 PP (or No Compostable Logo)',
              description: 'Routes to Dry Recyclable (Blue Bin)',
              overrideMaterial: MaterialCode.PET_PLASTIC,
              overrideContamination: ContaminationLevel.CLEAN,
            },
            {
              id: 'opt-pla',
              label: 'Has CPCB Green Logo / "100% Compostable IS 17088"',
              description: 'Routes to Industrial Composting / Wet Stream',
              overrideMaterial: MaterialCode.COMPOSTABLE_PLA,
              overrideContamination: ContaminationLevel.CLEAN,
            },
            {
              id: 'opt-soiled',
              label: 'Contains Leftover Milkshake / Drink Liquid',
              description: 'Requires emptying liquid & rinsing before Dry Bin',
              overrideMaterial: MaterialCode.PET_PLASTIC,
              overrideContamination: ContaminationLevel.LIQUID_CONTAINING,
            },
          ],
          boundingBox: { x: 14, y: 16, width: 32, height: 66 },
        },
        {
          id: 'item-amb-2',
          itemName: 'Metallized Namkeen / Chips Wrapper (MLP)',
          detectedMaterial: MaterialCode.MLP_PACKAGING,
          visibleMaterialEvidence:
            'Flexible laminated polymer film with reflective inner aluminum barrier layer.',
          contaminationState: ContaminationLevel.FOOD_GREASE_RESIDUE,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [],
          confidenceScore: 93.2,
          polymerOrMaterialPurity: 85,
          isAmbiguous: false,
          boundingBox: { x: 54, y: 24, width: 34, height: 54 },
        },
      ],
    },
  },
  {
    id: 'sanitary_and_pharma',
    title: 'Household Sanitary & Medical Discard',
    subtitle: 'Used surgical face mask, expired tablet blister pack, and soiled cotton swab',
    badgeText: 'Bio-Safety Protocol',
    rawPerception: {
      isWasteSceneValid: true,
      sceneSummary:
        'Household health and hygiene discards requiring strict pathogen containment and hazardous pharmaceutical routing.',
      isMixedWaste: true,
      overallSceneConfidence: 96.2,
      items: [
        {
          id: 'item-san-1',
          itemName: 'Used 3-Ply Non-Woven Face Mask',
          detectedMaterial: MaterialCode.SANITARY_BIOMEDICAL,
          visibleMaterialEvidence:
            'Pleated polypropylene non-woven mask with ear loops; classified as infectious household bio-medical waste.',
          contaminationState: ContaminationLevel.BIO_FLUID_CONTAMINATED,
          physicalCondition: PhysicalCondition.INTACT,
          hazards: [HazardFlag.BIOHAZARD_PATHOGEN],
          confidenceScore: 98.1,
          polymerOrMaterialPurity: 95,
          isAmbiguous: false,
          boundingBox: { x: 10, y: 22, width: 36, height: 54 },
        },
        {
          id: 'item-san-2',
          itemName: 'Blister Pack with Expired Tablets',
          detectedMaterial: MaterialCode.PHARMACEUTICAL_MEDICINE,
          visibleMaterialEvidence:
            'PVC/Aluminum push-through blister strip containing intact pharmaceutical tablets.',
          contaminationState: ContaminationLevel.CHEMICAL_RESIDUE,
          physicalCondition: PhysicalCondition.COMPOSITE_MULTI_PART,
          hazards: [HazardFlag.TOXIC_CHEMICAL],
          confidenceScore: 94.3,
          polymerOrMaterialPurity: 82,
          isAmbiguous: false,
          boundingBox: { x: 54, y: 26, width: 34, height: 50 },
        },
      ],
    },
  },
];
