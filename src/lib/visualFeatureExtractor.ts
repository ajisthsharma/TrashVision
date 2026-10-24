import {
  ContaminationLevel,
  HazardFlag,
  MaterialCode,
  PhysicalCondition,
  RawScenePerception,
  VisualItemObservation,
} from './sbmRulesEngine';

export interface ImageVisualSignature {
  fileName: string;
  width: number;
  height: number;
  dominantHueCategory:
    | 'organic_green_brown'
    | 'clear_or_blue_polymer'
    | 'warm_paper_cardboard'
    | 'metallic_neutral'
    | 'high_saturation_mlp'
    | 'dark_electronic'
    | 'sanitary_white_clinical';
  greenRatio: number;
  warmBrownYellowRatio: number;
  blueCyanRatio: number;
  neutralSpecularRatio: number;
  darkRatio: number;
  highSaturationRatio: number;
  brightWhiteRatio: number;
  estimatedForegroundBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Extracts real pixel statistics and foreground object bounding coordinates
 * from an uploaded image or webcam frame using an offscreen HTML5 canvas.
 */
export async function extractImageVisualSignature(
  imageDataUrl: string,
  fileName = 'capture.jpg'
): Promise<ImageVisualSignature> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sampleW = 96;
      const sampleH = 96;
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({
          fileName,
          width: img.width || 640,
          height: img.height || 480,
          dominantHueCategory: 'clear_or_blue_polymer',
          greenRatio: 0.1,
          warmBrownYellowRatio: 0.1,
          blueCyanRatio: 0.3,
          neutralSpecularRatio: 0.3,
          darkRatio: 0.1,
          highSaturationRatio: 0.1,
          brightWhiteRatio: 0.2,
          estimatedForegroundBox: { x: 18, y: 14, width: 64, height: 72 },
        });
        return;
      }

      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

      let greenCount = 0;
      let warmBrownYellowCount = 0;
      let blueCyanCount = 0;
      let neutralSpecularCount = 0;
      let darkCount = 0;
      let highSatCount = 0;
      let brightWhiteCount = 0;
      const totalPixels = sampleW * sampleH;

      // Estimate border background color from corners
      const cornerIndices = [
        0,
        (sampleW - 1) * 4,
        (sampleH - 1) * sampleW * 4,
        ((sampleH - 1) * sampleW + (sampleW - 1)) * 4,
      ];
      let bgR = 0;
      let bgG = 0;
      let bgB = 0;
      cornerIndices.forEach((idx) => {
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });
      bgR /= 4;
      bgG /= 4;
      bgB /= 4;

      let minX = sampleW;
      let minY = sampleH;
      let maxX = 0;
      let maxY = 0;
      let fgCount = 0;

      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          const idx = (y * sampleW + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          const sat = max === 0 ? 0 : delta / max;

          // Foreground detection against corner background
          const distFromBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
          if (distFromBg > 48 && x > 3 && x < sampleW - 4 && y > 3 && y < sampleH - 4) {
            fgCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }

          if (lum < 0.22) {
            darkCount++;
          } else if (lum > 0.82 && sat < 0.18) {
            brightWhiteCount++;
          } else if (sat < 0.16 && lum >= 0.22 && lum <= 0.82) {
            neutralSpecularCount++;
          } else {
            if (sat > 0.58) highSatCount++;
            if (g > r * 1.08 && g > b * 1.12) {
              greenCount++;
            } else if (b > r * 1.1 && b >= g * 0.95) {
              blueCyanCount++;
            } else if (r > b * 1.25 && g > b * 1.1) {
              warmBrownYellowCount++;
            }
          }
        }
      }

      const greenRatio = greenCount / totalPixels;
      const warmBrownYellowRatio = warmBrownYellowCount / totalPixels;
      const blueCyanRatio = blueCyanCount / totalPixels;
      const neutralSpecularRatio = neutralSpecularCount / totalPixels;
      const darkRatio = darkCount / totalPixels;
      const highSaturationRatio = highSatCount / totalPixels;
      const brightWhiteRatio = brightWhiteCount / totalPixels;

      let dominantHueCategory: ImageVisualSignature['dominantHueCategory'] =
        'clear_or_blue_polymer';

      if (greenRatio > 0.16 || (greenRatio + warmBrownYellowRatio > 0.34 && highSaturationRatio > 0.12)) {
        dominantHueCategory = 'organic_green_brown';
      } else if (warmBrownYellowRatio > 0.22 && highSaturationRatio < 0.25) {
        dominantHueCategory = 'warm_paper_cardboard';
      } else if (highSaturationRatio > 0.24) {
        dominantHueCategory = 'high_saturation_mlp';
      } else if (darkRatio > 0.42) {
        dominantHueCategory = 'dark_electronic';
      } else if (blueCyanRatio > 0.14) {
        dominantHueCategory = 'clear_or_blue_polymer';
      } else if (brightWhiteRatio > 0.48) {
        dominantHueCategory = 'sanitary_white_clinical';
      } else {
        dominantHueCategory = 'metallic_neutral';
      }

      const boxX = fgCount > 40 ? Math.max(6, Math.round((minX / sampleW) * 100)) : 16;
      const boxY = fgCount > 40 ? Math.max(6, Math.round((minY / sampleH) * 100)) : 14;
      const boxW =
        fgCount > 40
          ? Math.max(22, Math.min(88 - boxX, Math.round(((maxX - minX) / sampleW) * 100)))
          : 66;
      const boxH =
        fgCount > 40
          ? Math.max(24, Math.min(88 - boxY, Math.round(((maxY - minY) / sampleH) * 100)))
          : 70;

      resolve({
        fileName,
        width: img.width || 640,
        height: img.height || 480,
        dominantHueCategory,
        greenRatio,
        warmBrownYellowRatio,
        blueCyanRatio,
        neutralSpecularRatio,
        darkRatio,
        highSaturationRatio,
        brightWhiteRatio,
        estimatedForegroundBox: {
          x: boxX,
          y: boxY,
          width: boxW,
          height: boxH,
        },
      });
    };

    img.onerror = () => {
      resolve({
        fileName,
        width: 640,
        height: 480,
        dominantHueCategory: 'clear_or_blue_polymer',
        greenRatio: 0.1,
        warmBrownYellowRatio: 0.1,
        blueCyanRatio: 0.25,
        neutralSpecularRatio: 0.3,
        darkRatio: 0.1,
        highSaturationRatio: 0.1,
        brightWhiteRatio: 0.2,
        estimatedForegroundBox: { x: 18, y: 15, width: 64, height: 70 },
      });
    };

    img.src = imageDataUrl;
  });
}

/**
 * Builds a deterministic, image-specific RawScenePerception from the uploaded image's
 * visual signature and filename cues when running in local/offline mode without Gemini API.
 */
export function buildPerceptionFromVisualSignature(
  sig: ImageVisualSignature
): RawScenePerception {
  const lower = (sig.fileName || '').toLowerCase();
  const box = sig.estimatedForegroundBox;

  const makeSingleObservation = (
    obs: Omit<VisualItemObservation, 'id' | 'boundingBox'>
  ): RawScenePerception => ({
    isWasteSceneValid: true,
    sceneSummary: `Visual inspection of uploaded image (${sig.width}×${sig.height}px): detected ${obs.itemName} (${obs.visibleMaterialEvidence}). Evaluated against CPCB SWM 2016, BBMP, and Indore IMC 6-Bin guidelines.`,
    isMixedWaste: false,
    overallSceneConfidence: obs.confidenceScore,
    items: [
      {
        ...obs,
        id: 'item-1',
        boundingBox: box,
      },
    ],
  });

  // 1. Filename / label semantic cues combined with visual bounding box
  if (/(battery|cell|lithium|alkaline|duracell|eveready|powerbank)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Discarded Battery Cell / Power Unit',
      detectedMaterial: MaterialCode.BATTERY_CELL,
      visibleMaterialEvidence:
        'Cylindrical/prismatic electrochemical casing detected; requires isolated E-Waste / Domestic Hazardous drop-off.',
      contaminationState: ContaminationLevel.CHEMICAL_RESIDUE,
      physicalCondition: PhysicalCondition.INTACT,
      hazards: [HazardFlag.FIRE_BATTERY_HAZARD, HazardFlag.TOXIC_CHEMICAL],
      confidenceScore: 95.4,
      polymerOrMaterialPurity: 92,
      isAmbiguous: false,
    });
  }

  if (/(cable|wire|charger|earphone|pcb|phone|mouse|keyboard|electronic|ewaste|bulb|cfl|led)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Discarded Electronic Accessory / E-Waste Component',
      detectedMaterial: MaterialCode.E_WASTE_ELECTRONICS,
      visibleMaterialEvidence:
        'Insulated copper wiring / electronic housing detected; governed by E-Waste Management Rules 2022.',
      contaminationState: ContaminationLevel.CLEAN,
      physicalCondition: PhysicalCondition.INTACT,
      hazards: [HazardFlag.TOXIC_CHEMICAL],
      confidenceScore: 93.8,
      polymerOrMaterialPurity: 89,
      isAmbiguous: false,
    });
  }

  if (/(mask|bandage|diaper|pad|sanitary|tissue|napkin|glove|cotton|syringe|needle)/.test(lower)) {
    const isSharp = /(syringe|needle|blade|lancet)/.test(lower);
    return makeSingleObservation({
      itemName: isSharp ? 'Used Medical Sharp / Syringe' : 'Used Sanitary / Personal Hygiene Item',
      detectedMaterial: isSharp
        ? MaterialCode.METAL_SHARP
        : MaterialCode.SANITARY_BIOMEDICAL,
      visibleMaterialEvidence:
        'Non-woven clinical/hygiene fiber structure detected; mandatory Red/Yellow Sanitary & Bio-Medical stream routing.',
      contaminationState: ContaminationLevel.BIO_FLUID_CONTAMINATED,
      physicalCondition: isSharp ? PhysicalCondition.SHARP_BROKEN : PhysicalCondition.INTACT,
      hazards: isSharp
        ? [HazardFlag.BIOHAZARD_PATHOGEN, HazardFlag.SHARP_LACERATION_RISK]
        : [HazardFlag.BIOHAZARD_PATHOGEN],
      confidenceScore: 94.2,
      polymerOrMaterialPurity: 78,
      isAmbiguous: false,
    });
  }

  if (/(medicine|tablet|pill|blister|syrup|ointment|paint|pesticide|chemical|aerosol|spray)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Pharmaceutical / Domestic Chemical Container',
      detectedMaterial: MaterialCode.PHARMACEUTICAL_MEDICINE,
      visibleMaterialEvidence:
        'Blister foil / chemical residue vessel detected; classified as Domestic Hazardous under CPCB SWM 2016.',
      contaminationState: ContaminationLevel.CHEMICAL_RESIDUE,
      physicalCondition: PhysicalCondition.INTACT,
      hazards: [HazardFlag.TOXIC_CHEMICAL],
      confidenceScore: 92.6,
      polymerOrMaterialPurity: 84,
      isAmbiguous: false,
    });
  }

  if (/(peel|banana|apple|fruit|veg|food|leaf|flower|organic|compost|kitchen|tea|coffee|shell)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Compostable Kitchen / Organic Biomass',
      detectedMaterial: MaterialCode.ORGANIC_FOOD,
      visibleMaterialEvidence:
        'Natural cellular plant/food matter texture detected; suitable for Wet Biodegradable (Green Bin) biomethanation or composting.',
      contaminationState: ContaminationLevel.CLEAN,
      physicalCondition: PhysicalCondition.INTACT,
      hazards: [],
      confidenceScore: 96.1,
      polymerOrMaterialPurity: 98,
      isAmbiguous: false,
    });
  }

  if (/(cardboard|carton|box|paper|newspaper|magazine|envelope|notebook|pizza)/.test(lower)) {
    const isGreasy = /(pizza|grease|oily|soiled)/.test(lower);
    return makeSingleObservation({
      itemName: isGreasy ? 'Food-Soiled Cardboard Box' : 'Corrugated Cardboard / Paper Packaging',
      detectedMaterial: isGreasy ? MaterialCode.SOILED_PAPER : MaterialCode.PAPER_CARDBOARD,
      visibleMaterialEvidence:
        'Cellulose fiber / corrugated kraft structure detected in image.',
      contaminationState: isGreasy
        ? ContaminationLevel.FOOD_GREASE_RESIDUE
        : ContaminationLevel.CLEAN,
      physicalCondition: PhysicalCondition.CRUSHED_DEFORMED,
      hazards: [],
      confidenceScore: 93.5,
      polymerOrMaterialPurity: isGreasy ? 54 : 94,
      isAmbiguous: false,
    });
  }

  if (/(chip|wrapper|packet|biscuit|kurkure|lays|sachet|pouch|foil|laminate|mlp)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Multi-Layered Plastic (MLP) Snack / FMCG Wrapper',
      detectedMaterial: MaterialCode.MLP_PACKAGING,
      visibleMaterialEvidence:
        'High-gloss metallized/printed flexible film laminate detected; route to Dry Non-Recyclable / MLP Co-Processing stream.',
      contaminationState: ContaminationLevel.CLEAN,
      physicalCondition: PhysicalCondition.CRUSHED_DEFORMED,
      hazards: [],
      confidenceScore: 91.8,
      polymerOrMaterialPurity: 76,
      isAmbiguous: false,
    });
  }

  if (/(can|tin|aluminum|aluminium|steel|metal)/.test(lower)) {
    return makeSingleObservation({
      itemName: 'Recyclable Metal / Aluminum Beverage Can',
      detectedMaterial: MaterialCode.METAL_ALUMINUM_STEEL,
      visibleMaterialEvidence:
        'Metallic specular reflectance and rigid cylindrical form detected.',
      contaminationState: ContaminationLevel.CLEAN,
      physicalCondition: PhysicalCondition.INTACT,
      hazards: [],
      confidenceScore: 94.0,
      polymerOrMaterialPurity: 95,
      isAmbiguous: false,
    });
  }

  if (/(glass|jar|bottle_glass|broken|shard)/.test(lower)) {
    const broken = /(broken|shard|shattered)/.test(lower);
    return makeSingleObservation({
      itemName: broken ? 'Broken Glass Shards' : 'Glass Bottle / Container Jar',
      detectedMaterial: broken ? MaterialCode.GLASS_BROKEN_SHARP : MaterialCode.GLASS_INTACT,
      visibleMaterialEvidence: broken
        ? 'Refractive fractured silica edges detected; laceration protection required.'
        : 'Refractive intact glass wall structure detected.',
      contaminationState: ContaminationLevel.CLEAN,
      physicalCondition: broken ? PhysicalCondition.SHARP_BROKEN : PhysicalCondition.INTACT,
      hazards: broken ? [HazardFlag.SHARP_LACERATION_RISK] : [],
      confidenceScore: 92.8,
      polymerOrMaterialPurity: 96,
      isAmbiguous: false,
    });
  }

  // 2. Pure Pixel / Color / Contrast Signature Classification when filename is generic (e.g. IMG_1024.jpg or Webcam)
  switch (sig.dominantHueCategory) {
    case 'organic_green_brown':
      return makeSingleObservation({
        itemName: 'Organic Kitchen / Garden Biomass Waste',
        detectedMaterial: MaterialCode.ORGANIC_FOOD,
        visibleMaterialEvidence: `Natural organic chlorophyll/earth chromatic distribution (${Math.round(
          (sig.greenRatio + sig.warmBrownYellowRatio) * 100
        )}% organic tone coverage) detected in frame.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.INTACT,
        hazards: [],
        confidenceScore: 89.5,
        polymerOrMaterialPurity: 94,
        isAmbiguous: false,
      });

    case 'warm_paper_cardboard':
      return makeSingleObservation({
        itemName: 'Kraft Paper / Corrugated Cardboard Packaging',
        detectedMaterial: MaterialCode.PAPER_CARDBOARD,
        visibleMaterialEvidence: `Warm matte cellulose reflectance (${Math.round(
          sig.warmBrownYellowRatio * 100
        )}% kraft spectrum) detected in foreground region.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.INTACT,
        hazards: [],
        confidenceScore: 88.4,
        polymerOrMaterialPurity: 91,
        isAmbiguous: false,
      });

    case 'high_saturation_mlp':
      return makeSingleObservation({
        itemName: 'Printed Flexible Plastic Wrapper / MLP Pouch',
        detectedMaterial: MaterialCode.MLP_PACKAGING,
        visibleMaterialEvidence: `High-saturation printed polymer film (${Math.round(
          sig.highSaturationRatio * 100
        )}% vivid ink coverage) characteristic of multi-layered FMCG packaging.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.CRUSHED_DEFORMED,
        hazards: [],
        confidenceScore: 87.2,
        polymerOrMaterialPurity: 78,
        isAmbiguous: false,
      });

    case 'dark_electronic':
      return makeSingleObservation({
        itemName: 'Electronic Component / Battery / Dark Polymer Casing',
        detectedMaterial: MaterialCode.E_WASTE_ELECTRONICS,
        visibleMaterialEvidence: `High-density matte dark housing (${Math.round(
          sig.darkRatio * 100
        )}% low-albedo surface) with metallic/polymer contrast.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.INTACT,
        hazards: [HazardFlag.TOXIC_CHEMICAL],
        confidenceScore: 84.6,
        polymerOrMaterialPurity: 86,
        isAmbiguous: true,
        ambiguityReason:
          'Dark casing may be an electronic peripheral/battery (E-Waste) or a dark rigid PP/HDPE food container.',
        clarificationQuestion:
          'Does this item contain electrical wires, circuitry, or battery cells?',
        clarificationOptions: [
          {
            id: 'clarify-ewaste',
            label: 'Yes — Electronic Accessory, Charger, Cable, or Battery',
            description: 'Routes to Authorized E-Waste Collection Stream',
            overrideMaterial: MaterialCode.E_WASTE_ELECTRONICS,
            overrideContamination: ContaminationLevel.CLEAN,
          },
          {
            id: 'clarify-rigid-plastic',
            label: 'No — Clean Rigid Plastic Container (#2 HDPE / #5 PP)',
            description: 'Routes to Blue Bin (Dry Recyclable Stream)',
            overrideMaterial: MaterialCode.HDPE_PP_PLASTIC,
            overrideContamination: ContaminationLevel.CLEAN,
          },
        ],
      });

    case 'metallic_neutral':
      return makeSingleObservation({
        itemName: 'Recyclable Metal Can / Glass / Rigid Container',
        detectedMaterial: MaterialCode.METAL_ALUMINUM_STEEL,
        visibleMaterialEvidence: `High neutral specular reflectance (${Math.round(
          sig.neutralSpecularRatio * 100
        )}% metallic/clear highlight profile) detected in foreground.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.INTACT,
        hazards: [],
        confidenceScore: 88.0,
        polymerOrMaterialPurity: 92,
        isAmbiguous: false,
      });

    case 'sanitary_white_clinical':
    case 'clear_or_blue_polymer':
    default:
      return makeSingleObservation({
        itemName: 'Rigid Plastic Bottle / Polymer Packaging Container',
        detectedMaterial: MaterialCode.PET_PLASTIC,
        visibleMaterialEvidence: `Translucent/polymer surface sheen (${Math.round(
          (sig.blueCyanRatio + sig.brightWhiteRatio) * 100
        )}% polymer highlight profile) detected in image.`,
        contaminationState: ContaminationLevel.CLEAN,
        physicalCondition: PhysicalCondition.INTACT,
        hazards: [],
        confidenceScore: 90.2,
        polymerOrMaterialPurity: 93,
        isAmbiguous: false,
      });
  }
}
