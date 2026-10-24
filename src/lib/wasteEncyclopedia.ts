import { WasteCategory } from './sbmRulesEngine';

export interface WasteDirectoryEntry {
  id: string;
  name: string;
  hindiVernacular: string;
  category: WasteCategory;
  material: string;
  recyclability: 'High (MRF Recovery)' | 'Compostable / Bio-CNG' | 'Cement Co-Processing' | 'Safe Containment Only';
  prepInstruction: string;
  hazardNote?: string;
}

export const WASTE_ENCYCLOPEDIA: WasteDirectoryEntry[] = [
  {
    id: 'enc-1',
    name: 'PET Water & Beverage Bottle (#1)',
    hindiVernacular: 'Paani ki Botal / Plastic Bottle',
    category: WasteCategory.DRY_RECYCLABLE,
    material: 'Polyethylene Terephthalate (PET #1)',
    recyclability: 'High (MRF Recovery)',
    prepInstruction: 'Empty all liquid, give a quick rinse, crush vertically to save space, and screw the cap back on.',
  },
  {
    id: 'enc-2',
    name: 'Tetra Pak / Aseptic Juice & Milk Carton',
    hindiVernacular: 'Juice / Doodh ka Dabba',
    category: WasteCategory.DRY_RECYCLABLE,
    material: 'Paperboard (75%) + Polyethylene (20%) + Aluminum (5%)',
    recyclability: 'High (MRF Recovery)',
    prepInstruction: 'Push straw inside or separate, rinse out milk/juice residue, flatten the carton, and place in Dry bin.',
  },
  {
    id: 'enc-3',
    name: 'Grease-Soaked Pizza / Takeaway Cardboard',
    hindiVernacular: 'Tel laga Gatta / Pizza Box',
    category: WasteCategory.WET_BIODEGRADABLE,
    material: 'Oil-Saturated Cellulose Kraft Board',
    recyclability: 'Compostable / Bio-CNG',
    prepInstruction: 'Tear off the clean top lid for the Blue (Dry) bin; tear the greasy bottom half into pieces for the Green (Wet) bin.',
  },
  {
    id: 'enc-4',
    name: 'Chips, Biscuit & Namkeen Wrapper (MLP)',
    hindiVernacular: 'Kurkure / Gutkha / Panni Packet',
    category: WasteCategory.DRY_NON_RECYCLABLE,
    material: 'Multi-Layered Plastic (Metallized BOPP/PET)',
    recyclability: 'Cement Co-Processing',
    prepInstruction: 'Shake out crumbs, wipe clean if oily, cut straight across (never snip tiny corners), and keep dry for MLP collection.',
  },
  {
    id: 'enc-5',
    name: 'Swollen Lithium-Ion or AA/AAA Battery',
    hindiVernacular: 'Purani Battery / Cell',
    category: WasteCategory.E_WASTE,
    material: 'Lithium Cobalt Oxide / Alkaline Electrochemical Cell',
    recyclability: 'High (MRF Recovery)',
    prepInstruction: 'Tape both terminals with clear tape. Deposit only at an authorized E-Waste drop box.',
    hazardNote: 'CRITICAL FIRE RISK: Crushing in municipal garbage trucks triggers thermal runaway fires.',
  },
  {
    id: 'enc-6',
    name: 'Used Sanitary Napkins, Diapers & Bandages',
    hindiVernacular: 'Sanitary Pad / Diaper / Patti',
    category: WasteCategory.SANITARY_BIOMEDICAL,
    material: 'Super-Absorbent Polymer (SAP) + Non-Woven Polypropylene',
    recyclability: 'Safe Containment Only',
    prepInstruction: 'Wrap securely in newspaper or a red-cross sanitary pouch and mark with a bold Red "X".',
    hazardNote: 'BIOHAZARD: Exposes manual sanitation workers (Safai Mitras) to bloodborne pathogens if unwrapped.',
  },
  {
    id: 'enc-7',
    name: 'Broken Glass Bottle or Mirror Shards',
    hindiVernacular: 'Toota Kanch / Sheesha',
    category: WasteCategory.DOMESTIC_HAZARDOUS,
    material: 'Fractured Silicate Glass',
    recyclability: 'Safe Containment Only',
    prepInstruction: 'Wrap in multiple thick layers of newspaper, tape shut, and write "SHARP / BROKEN GLASS" on outside.',
    hazardNote: 'LACERATION HAZARD: Never mix loose glass shards into Blue or Green bags.',
  },
  {
    id: 'enc-8',
    name: 'Expired Medicines & Tablet Blister Packs',
    hindiVernacular: 'Purani Dawai / Patta',
    category: WasteCategory.DOMESTIC_HAZARDOUS,
    material: 'PVC-Aluminum Blister + Active Pharmaceutical Ingredients',
    recyclability: 'Safe Containment Only',
    prepInstruction: 'Keep sealed in blister strip and route to Domestic Hazardous (Black Bin) or pharmacy take-back.',
    hazardNote: 'TOXIC LEACHING: Never flush antibiotics or pharmaceuticals down household sinks or toilets.',
  },
  {
    id: 'enc-9',
    name: 'CFL Bulb & Fluorescent Tube Light',
    hindiVernacular: 'CFL / Tube Light',
    category: WasteCategory.E_WASTE,
    material: 'Glass Tube + Phosphor Powder + Mercury Vapor',
    recyclability: 'Safe Containment Only',
    prepInstruction: 'Place inside original cardboard sleeve so glass does not shatter; hand over to E-Waste collection.',
    hazardNote: 'MERCURY VAPOR HAZARD: Releases neurotoxic mercury gas if broken inside bins.',
  },
  {
    id: 'enc-10',
    name: 'Vegetable Peels, Tea Leaves & Cooked Food',
    hindiVernacular: 'Geela Kachra / Sabzi ke Chilke / Chai Patti',
    category: WasteCategory.WET_BIODEGRADABLE,
    material: 'Organic Biomass',
    recyclability: 'Compostable / Bio-CNG',
    prepInstruction: 'Drain excess water/gravy and discard directly into the Green (Wet) bin without plastic polythene liners.',
  },
  {
    id: 'enc-11',
    name: 'Coconut Shells & Sugarcane Bagasse',
    hindiVernacular: 'Nariyal ka Khopra',
    category: WasteCategory.WET_BIODEGRADABLE,
    material: 'High-Lignin Fibrous Biomass',
    recyclability: 'Compostable / Bio-CNG',
    prepInstruction: 'Keep separate or place in Wet/Garden Biomass stream (takes longer to compost; often shredded for cocopeat).',
  },
  {
    id: 'enc-12',
    name: 'Broken Ceramic Mug, Crockery or Tiles',
    hindiVernacular: 'Toota Cup / चीनी मिट्टी (Chini Mitti)',
    category: WasteCategory.CONSTRUCTION_DEMOLITION,
    material: 'Vitrified Ceramic / Stoneware',
    recyclability: 'Safe Containment Only',
    prepInstruction: 'Wrap sharp edges in paper and route to C&D / Inert stream. Never place ceramics in glass recycling.',
  },
];
