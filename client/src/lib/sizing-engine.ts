import type { LoadInputs, UserPreferences, Equipment, EquipmentRecommendation, TypedEquipment, FurnaceEquipment, AcEquipment, HeatPumpEquipment, BoilerEquipment, ComboEquipment, EquipmentValidationError, ValidationSummary, EquipmentCalculationResult } from "@shared/schema";

// Type guard functions for compile-time safety
export function isFurnace(equipment: Equipment): equipment is FurnaceEquipment {
  return equipment.equipmentType === 'furnace' && 
         equipment.nominalBtu !== null && 
         equipment.heatingCapacityBtu !== null && 
         equipment.afue !== null &&
         equipment.nominalTons === null &&
         equipment.coolingCapacityBtu === null &&
         equipment.seer === null;
}

export function isAc(equipment: Equipment): equipment is AcEquipment {
  return equipment.equipmentType === 'ac' &&
         equipment.nominalTons !== null &&
         equipment.coolingCapacityBtu !== null &&
         equipment.latentCoolingBtu !== null &&
         equipment.seer !== null &&
         equipment.nominalBtu === null &&
         equipment.heatingCapacityBtu === null &&
         equipment.afue === null;
}

export function isHeatPump(equipment: Equipment): equipment is HeatPumpEquipment {
  return equipment.equipmentType === 'heat_pump' &&
         equipment.nominalTons !== null &&
         equipment.heatingCapacityBtu !== null &&
         equipment.coolingCapacityBtu !== null &&
         equipment.latentCoolingBtu !== null &&
         equipment.seer !== null &&
         equipment.hspf !== null &&
         equipment.nominalBtu === null &&
         equipment.afue === null;
}

export function isBoiler(equipment: Equipment): equipment is BoilerEquipment {
  return equipment.equipmentType === 'boiler' &&
         equipment.nominalBtu !== null &&
         equipment.heatingCapacityBtu !== null &&
         equipment.afue !== null &&
         equipment.nominalTons === null &&
         equipment.coolingCapacityBtu === null &&
         equipment.seer === null;
}

export function isCombo(equipment: Equipment): equipment is ComboEquipment {
  return equipment.equipmentType === 'furnace_ac_combo' &&
         equipment.nominalTons !== null &&
         equipment.nominalBtu !== null &&
         equipment.heatingCapacityBtu !== null &&
         equipment.coolingCapacityBtu !== null &&
         equipment.latentCoolingBtu !== null &&
         equipment.afue !== null &&
         equipment.seer !== null &&
         equipment.hspf === null;
}

// Data normalization function to ensure consistency
function normalizeEquipmentData(equipment: Equipment): Equipment {
  return {
    ...equipment,
    // Normalize null/undefined values based on equipment type
    nominalTons: equipment.equipmentType === 'furnace' || equipment.equipmentType === 'boiler' 
      ? null 
      : equipment.nominalTons ?? null,
    nominalBtu: equipment.equipmentType === 'ac' 
      ? null 
      : equipment.nominalBtu ?? null,
    heatingCapacityBtu: equipment.equipmentType === 'ac' 
      ? null 
      : equipment.heatingCapacityBtu ?? null,
    coolingCapacityBtu: equipment.equipmentType === 'furnace' || equipment.equipmentType === 'boiler' 
      ? null 
      : equipment.coolingCapacityBtu ?? null,
    latentCoolingBtu: equipment.equipmentType === 'furnace' || equipment.equipmentType === 'boiler' 
      ? null 
      : equipment.latentCoolingBtu ?? null,
    afue: equipment.equipmentType === 'ac' || equipment.equipmentType === 'heat_pump' 
      ? null 
      : equipment.afue ?? null,
    seer: equipment.equipmentType === 'furnace' || equipment.equipmentType === 'boiler' 
      ? null 
      : equipment.seer ?? null,
    hspf: equipment.equipmentType !== 'heat_pump' 
      ? null 
      : equipment.hspf ?? null,
  };
}

// Equipment validation with error collection
interface EquipmentValidationResult {
  equipment?: TypedEquipment;
  error?: EquipmentValidationError;
}

function validateTypedEquipment(equipment: Equipment): EquipmentValidationResult {
  const normalized = normalizeEquipmentData(equipment);
  
  // Try type validation
  if (isFurnace(normalized)) return { equipment: normalized };
  if (isAc(normalized)) return { equipment: normalized };
  if (isHeatPump(normalized)) return { equipment: normalized };
  if (isBoiler(normalized)) return { equipment: normalized };
  if (isCombo(normalized)) return { equipment: normalized };
  
  // Create detailed error for failed validation
  return {
    error: {
      equipmentId: equipment.id,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      errorType: 'type_validation',
      severity: 'critical',
      message: `Equipment does not match ${equipment.equipmentType} requirements`,
      technicalDetails: `Missing required fields for ${equipment.equipmentType} type validation`
    }
  };
}

// Equipment-specific validation functions
function validateEquipmentSpecs(equipment: Equipment): string[] {
  const errors: string[] = [];

  switch (equipment.equipmentType) {
    case 'furnace':
      if (equipment.afue && (equipment.afue < 0.80 || equipment.afue > 0.98)) {
        errors.push(`Furnace AFUE rating ${(equipment.afue * 100).toFixed(0)}% is outside typical range (80-98%)`);
      }
      if (equipment.heatingCapacityBtu && equipment.nominalBtu && 
          equipment.heatingCapacityBtu > equipment.nominalBtu * 1.1) {
        errors.push(`Heating capacity exceeds nominal input by more than 10% - verify manufacturer data`);
      }
      break;

    case 'ac':
      if (equipment.seer && (equipment.seer < 13 || equipment.seer > 25)) {
        errors.push(`AC SEER rating ${equipment.seer} is outside typical range (13-25)`);
      }
      if (equipment.nominalTons && equipment.coolingCapacityBtu &&
          Math.abs(equipment.coolingCapacityBtu - (equipment.nominalTons * 12000)) > 2000) {
        errors.push(`Cooling capacity doesn't match nominal tonnage - verify equipment specifications`);
      }
      break;

    case 'heat_pump':
      if (equipment.seer && (equipment.seer < 13 || equipment.seer > 25)) {
        errors.push(`Heat pump SEER rating ${equipment.seer} is outside typical range (13-25)`);
      }
      if (equipment.hspf && (equipment.hspf < 8 || equipment.hspf > 15)) {
        errors.push(`Heat pump HSPF rating ${equipment.hspf} is outside typical range (8-15)`);
      }
      if (equipment.heatingCapacityBtu && equipment.coolingCapacityBtu &&
          equipment.heatingCapacityBtu > equipment.coolingCapacityBtu * 1.5) {
        errors.push(`Heating capacity significantly exceeds cooling capacity - verify cold climate heat pump specifications`);
      }
      break;

    case 'boiler':
      if (equipment.afue && (equipment.afue < 0.80 || equipment.afue > 0.98)) {
        errors.push(`Boiler AFUE rating ${(equipment.afue * 100).toFixed(0)}% is outside typical range (80-98%)`);
      }
      if (equipment.distributionType !== 'hydronic') {
        errors.push(`Boiler must use hydronic distribution system`);
      }
      break;

    case 'furnace_ac_combo':
      if (equipment.afue && (equipment.afue < 0.80 || equipment.afue > 0.98)) {
        errors.push(`Combo system furnace AFUE rating ${(equipment.afue * 100).toFixed(0)}% is outside typical range (80-98%)`);
      }
      if (equipment.seer && (equipment.seer < 13 || equipment.seer > 25)) {
        errors.push(`Combo system AC SEER rating ${equipment.seer} is outside typical range (13-25)`);
      }
      if (!equipment.heatingCapacityBtu || !equipment.coolingCapacityBtu) {
        errors.push(`Combo system must have both heating and cooling capacities`);
      }
      break;
  }

  return errors;
}

// Comprehensive load validation
function validateLoadInputs(loadInputs: LoadInputs): string[] {
  const errors: string[] = [];

  // Check for unrealistic load combinations
  if (loadInputs.totalHeatingBtu > 200000 && loadInputs.totalCoolingBtu > 100000) {
    errors.push(`Very high heating (${loadInputs.totalHeatingBtu.toLocaleString()}) and cooling (${loadInputs.totalCoolingBtu.toLocaleString()}) loads - verify Manual J calculations`);
  }

  // Check for extremely low sensible heat ratios
  if (loadInputs.totalCoolingBtu > 0) {
    const shr = loadInputs.sensibleCoolingBtu / loadInputs.totalCoolingBtu;
    if (shr < 0.70) {
      errors.push(`Very low sensible heat ratio (${(shr * 100).toFixed(0)}%) indicates high latent load - consider dehumidification equipment`);
    }
  }

  // Check for unbalanced loads in moderate climates
  if (loadInputs.totalHeatingBtu > 0 && loadInputs.totalCoolingBtu > 0) {
    const ratio = loadInputs.totalHeatingBtu / loadInputs.totalCoolingBtu;
    if (ratio > 3.0) {
      errors.push(`Heating load is ${ratio.toFixed(1)}x cooling load - verify building envelope and climate zone`);
    } else if (ratio < 0.5) {
      errors.push(`Cooling load is ${(1/ratio).toFixed(1)}x heating load - consider cooling-focused equipment selection`);
    }
  }

  return errors;
}

// Helper function to create properly typed equipment objects for recommendations
function createEquipmentRecommendationObject(
  equipment: Equipment,
  equipmentType: Equipment['equipmentType']
): TypedEquipment {
  const baseEquipment = {
    id: equipment.id,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    price: equipment.price,
    distributionType: equipment.distributionType,
    staging: equipment.staging,
    imageUrl: equipment.imageUrl,
  };

  switch (equipmentType) {
    case 'furnace':
      if (!equipment.nominalBtu || !equipment.heatingCapacityBtu || !equipment.afue) {
        throw new Error(`Furnace ${equipment.id} missing required fields: nominalBtu, heatingCapacityBtu, or afue`);
      }
      return {
        ...baseEquipment,
        equipmentType: 'furnace',
        nominalTons: null,
        nominalBtu: equipment.nominalBtu,
        heatingCapacityBtu: equipment.heatingCapacityBtu,
        coolingCapacityBtu: null,
        latentCoolingBtu: null,
        afue: equipment.afue,
        seer: null,
        hspf: null,
      };

    case 'ac':
      if (!equipment.nominalTons || !equipment.coolingCapacityBtu || !equipment.latentCoolingBtu || !equipment.seer) {
        throw new Error(`AC ${equipment.id} missing required fields: nominalTons, coolingCapacityBtu, latentCoolingBtu, or seer`);
      }
      return {
        ...baseEquipment,
        equipmentType: 'ac',
        nominalTons: equipment.nominalTons,
        nominalBtu: null,
        heatingCapacityBtu: null,
        coolingCapacityBtu: equipment.coolingCapacityBtu,
        latentCoolingBtu: equipment.latentCoolingBtu,
        afue: null,
        seer: equipment.seer,
        hspf: null,
      };

    case 'heat_pump':
      if (!equipment.nominalTons || !equipment.heatingCapacityBtu || !equipment.coolingCapacityBtu || 
          !equipment.latentCoolingBtu || !equipment.seer || !equipment.hspf) {
        throw new Error(`Heat pump ${equipment.id} missing required fields: nominalTons, heatingCapacityBtu, coolingCapacityBtu, latentCoolingBtu, seer, or hspf`);
      }
      return {
        ...baseEquipment,
        equipmentType: 'heat_pump',
        nominalTons: equipment.nominalTons,
        nominalBtu: null,
        heatingCapacityBtu: equipment.heatingCapacityBtu,
        coolingCapacityBtu: equipment.coolingCapacityBtu,
        latentCoolingBtu: equipment.latentCoolingBtu,
        afue: null,
        seer: equipment.seer,
        hspf: equipment.hspf,
      };

    case 'boiler':
      if (!equipment.nominalBtu || !equipment.heatingCapacityBtu || !equipment.afue) {
        throw new Error(`Boiler ${equipment.id} missing required fields: nominalBtu, heatingCapacityBtu, or afue`);
      }
      return {
        ...baseEquipment,
        equipmentType: 'boiler',
        nominalTons: null,
        nominalBtu: equipment.nominalBtu,
        heatingCapacityBtu: equipment.heatingCapacityBtu,
        coolingCapacityBtu: null,
        latentCoolingBtu: null,
        afue: equipment.afue,
        seer: null,
        hspf: null,
      };

    case 'furnace_ac_combo':
      if (!equipment.nominalTons || !equipment.nominalBtu || !equipment.heatingCapacityBtu || 
          !equipment.coolingCapacityBtu || !equipment.latentCoolingBtu || !equipment.afue || !equipment.seer) {
        throw new Error(`Combo system ${equipment.id} missing required fields: nominalTons, nominalBtu, heatingCapacityBtu, coolingCapacityBtu, latentCoolingBtu, afue, or seer`);
      }
      return {
        ...baseEquipment,
        equipmentType: 'furnace_ac_combo',
        nominalTons: equipment.nominalTons,
        nominalBtu: equipment.nominalBtu,
        heatingCapacityBtu: equipment.heatingCapacityBtu,
        coolingCapacityBtu: equipment.coolingCapacityBtu,
        latentCoolingBtu: equipment.latentCoolingBtu,
        afue: equipment.afue,
        seer: equipment.seer,
        hspf: null,
      };

    default:
      throw new Error(`Unsupported equipment type: ${equipmentType}`);
  }
}

export function calculateEquipmentRecommendations(
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  equipmentList: Equipment[]
): EquipmentCalculationResult {
  const recommendations: EquipmentRecommendation[] = [];
  const validationErrors: EquipmentValidationError[] = [];
  
  // Validate load inputs and add warnings to all recommendations
  const loadValidationErrors = validateLoadInputs(loadInputs);
  
  // Calculate derived values
  const latentCooling = loadInputs.totalCoolingBtu - loadInputs.sensibleCoolingBtu;
  const shr = loadInputs.totalCoolingBtu > 0 ? loadInputs.sensibleCoolingBtu / loadInputs.totalCoolingBtu : 0;

  // Filter equipment by type preferences
  const filteredEquipment = equipmentList.filter(eq => 
    preferences.equipmentTypes.includes(eq.equipmentType) && eq.isActive
  );

  for (const equipment of filteredEquipment) {
    // Validate equipment with error collection
    const validationResult = validateTypedEquipment(equipment);
    
    if (validationResult.error) {
      validationErrors.push(validationResult.error);
      continue;
    }
    
    if (validationResult.equipment) {
      // Validate equipment specifications
      const equipmentValidationErrors = validateEquipmentSpecs(equipment);
      
      // Add spec validation errors to collection
      if (equipmentValidationErrors.length > 0) {
        validationErrors.push({
          equipmentId: equipment.id,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          errorType: 'spec_validation',
          severity: 'warning',
          message: `Equipment has ${equipmentValidationErrors.length} specification warning(s)`,
          technicalDetails: equipmentValidationErrors.join('; ')
        });
      }
      
      const recommendation = evaluateEquipment(validationResult.equipment, loadInputs, preferences, shr, latentCooling);
      if (recommendation) {
        // Add validation warnings to the recommendation
        recommendation.warnings.push(...loadValidationErrors);
        recommendation.warnings.push(...equipmentValidationErrors);
        recommendations.push(recommendation);
      }
    }
  }

  // Sort by sizing match quality (optimal first, then acceptable, then oversized)
  recommendations.sort((a, b) => {
    const statusOrder = { optimal: 1, acceptable: 2, oversized: 3, undersized: 4 };
    const statusCompare = statusOrder[a.sizingStatus] - statusOrder[b.sizingStatus];
    if (statusCompare !== 0) return statusCompare;
    
    // Within same status, sort by how close to 100%
    return Math.abs(a.sizingPercentage - 100) - Math.abs(b.sizingPercentage - 100);
  });

  // Create validation summary
  const validationSummary: ValidationSummary = {
    totalEquipment: filteredEquipment.length,
    includedEquipment: recommendations.length,
    excludedEquipment: filteredEquipment.length - recommendations.length,
    errors: validationErrors
  };

  return {
    recommendations,
    validationSummary
  };
}



function evaluateEquipment(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  shr: number,
  latentCooling: number
): EquipmentRecommendation | null {
  const warnings: string[] = [];
  const instructions: string[] = [];
  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'undersized';
  let sizingPercentage = 0;
  let backupHeatRequired: number | undefined;
  let recommendedCfm: number | undefined;

  // Apply equipment filters
  if (!passesFilters(equipment, preferences)) {
    return null;
  }

  switch (equipment.equipmentType) {
    case 'furnace':
      return evaluateFurnace(equipment, loadInputs, preferences, warnings, instructions);
    
    case 'ac':
      return evaluateAirConditioner(equipment, loadInputs, preferences, shr, warnings, instructions);
    
    case 'heat_pump':
      return evaluateHeatPump(equipment, loadInputs, preferences, shr, latentCooling, warnings, instructions);
    
    case 'boiler':
      const boilerResult = evaluateBoiler(equipment, loadInputs, preferences, warnings, instructions);
      return boilerResult;
    
    case 'furnace_ac_combo':
      const comboResult = evaluateComboSystem(equipment, loadInputs, preferences, shr, latentCooling, warnings, instructions);
      return comboResult;
    
    default:
      return null;
  }
}

function passesFilters(equipment: Equipment, preferences: UserPreferences): boolean {
  // Brand filter
  if (preferences.brandFilter && preferences.brandFilter.length > 0) {
    if (!preferences.brandFilter.includes(equipment.manufacturer)) {
      return false;
    }
  }

  // Distribution type filter
  if (preferences.distributionType && equipment.distributionType !== preferences.distributionType) {
    return false;
  }

  // Staging filter
  if (preferences.stagingFilter && preferences.stagingFilter.length > 0) {
    if (!preferences.stagingFilter.includes(equipment.staging)) {
      return false;
    }
  }

  // AFUE filter
  if (preferences.minAfue && equipment.afue && equipment.afue < preferences.minAfue) {
    return false;
  }

  // Price filter
  if (preferences.maxPrice && equipment.price > preferences.maxPrice) {
    return false;
  }

  return true;
}

function evaluateFurnace(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.heatingCapacityBtu || loadInputs.totalHeatingBtu === 0) return null;

  let actualOutput = equipment.heatingCapacityBtu; // Already adjusted for AFUE in data
  
  // Apply elevation derating for furnaces
  if (loadInputs.elevation && loadInputs.elevation > 1000) {
    const deratingPercentage = 3 * loadInputs.elevation / 1000;
    const deratingFactor = 1 - (deratingPercentage / 100);
    actualOutput = actualOutput * deratingFactor;
    warnings.push(`Derate heating capacity by ${deratingPercentage.toFixed(1)}% due to elevation.`);
  }

  const sizingPercentage = Math.round((actualOutput / loadInputs.totalHeatingBtu) * 100);
  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'undersized';

  if (sizingPercentage >= 100 && sizingPercentage <= 140) {
    sizingStatus = 'optimal';
  } else if (sizingPercentage >= 140 && sizingPercentage <= 200) {
    sizingStatus = 'oversized';
    warnings.push(`This furnace is ${sizingPercentage}% oversized. Use only if the AC system requires more blower power to accommodate the cooling load.`);
  } else if (sizingPercentage < 100) {
    return null; // Don't show undersized equipment
  } else {
    return null; // Too oversized
  }

  // Add standard furnace instructions
  instructions.push("Verify ductwork can handle required airflow");
  instructions.push("Check static pressure requirements for optimal performance");

  return {
    equipment: createEquipmentRecommendationObject(equipment, 'furnace'),
    sizingStatus,
    sizingPercentage,
    warnings,
    instructions,
  };
}

function evaluateAirConditioner(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  shr: number,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.coolingCapacityBtu || loadInputs.totalCoolingBtu === 0) return null;

  const sizingPercentage = Math.round((equipment.coolingCapacityBtu / loadInputs.totalCoolingBtu) * 100);
  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'undersized';

  // Use cooling sizing rules similar to heat pump
  const minRange = equipment.staging === 'single_stage' ? 90 : equipment.staging === 'two_stage' ? 90 : 90;
  const maxRange = equipment.staging === 'single_stage' ? (loadInputs.totalCoolingBtu <= 24000 ? 120 : 115) : 
                   equipment.staging === 'two_stage' ? 125 : 130;

  if (sizingPercentage >= minRange && sizingPercentage <= maxRange) {
    sizingStatus = sizingPercentage <= 110 ? 'optimal' : 'acceptable';
  } else if (sizingPercentage > maxRange) {
    sizingStatus = 'oversized';
    warnings.push(`This air conditioner is ${sizingPercentage}% oversized and may struggle with humidity control.`);
  } else {
    return null; // Don't show undersized equipment
  }

  // Calculate recommended CFM
  const tons = equipment.nominalTons || (equipment.coolingCapacityBtu! / 12000);
  const cfmPerTon = shr < 0.85 ? 350 : shr <= 0.95 ? 400 : 450;
  const recommendedCfm = Math.ceil(tons * cfmPerTon);

  instructions.push(`Verify existing ductwork is capable of handling at least ${recommendedCfm.toLocaleString()} CFM`);
  if (shr < 0.95) {
    instructions.push(`Use OEM data to verify system has adequate latent capacity`);
  }

  return {
    equipment: createEquipmentRecommendationObject(equipment, 'ac'),
    sizingStatus,
    sizingPercentage,
    warnings,
    instructions,
    recommendedCfm,
  };
}

function evaluateHeatPump(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  shr: number,
  latentCooling: number,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.coolingCapacityBtu || !equipment.heatingCapacityBtu) return null;
  if (loadInputs.totalCoolingBtu === 0 && loadInputs.totalHeatingBtu === 0) return null;

  const isHeatingDominant = loadInputs.totalHeatingBtu > loadInputs.totalCoolingBtu;
  const sizeToHeating = preferences.sizingPreference === 'size_to_heating';
  
  let sizingPercentage: number;
  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'undersized';
  let backupHeatRequired: number | undefined;

  if (isHeatingDominant && shr < 0.95 && !sizeToHeating) {
    // Size to cooling load when heating > cooling and SHR < 0.95 and user selects "size to cooling"
    sizingPercentage = Math.round((equipment.coolingCapacityBtu / loadInputs.totalCoolingBtu) * 100);
    
    const minRange = equipment.staging === 'single_stage' ? 90 : equipment.staging === 'two_stage' ? 90 : 90;
    const maxRange = equipment.staging === 'single_stage' ? (loadInputs.totalCoolingBtu <= 24000 ? 120 : 115) : 
                     equipment.staging === 'two_stage' ? 125 : 130;

    if (sizingPercentage >= minRange && sizingPercentage <= maxRange) {
      sizingStatus = sizingPercentage <= 110 ? 'optimal' : 'acceptable';
      
      // Calculate backup heat needed
      const heatDeficit = loadInputs.totalHeatingBtu - equipment.heatingCapacityBtu;
      if (heatDeficit > 0) {
        backupHeatRequired = Math.round((heatDeficit / 3412) * 10) / 10; // Convert to kW, round to 1 decimal
        warnings.push(`Be sure to add backup heat. ${backupHeatRequired} kW of backup heat are required.`);
      }
      
      instructions.push(`Use OEM data to verify the system has ${latentCooling.toLocaleString()} BTU min latent capacity`);
    } else if (sizingPercentage > maxRange) {
      sizingStatus = 'oversized';
    } else {
      return null;
    }
  } else if (isHeatingDominant && sizeToHeating) {
    // Size to heating load when user selects "size to heating"
    sizingPercentage = Math.round((equipment.heatingCapacityBtu / loadInputs.totalHeatingBtu) * 100);
    
    if (sizingPercentage >= 100 && sizingPercentage <= 150) {
      sizingStatus = sizingPercentage <= 120 ? 'optimal' : 'acceptable';
      
      if (shr < 0.95) {
        warnings.push("A system sized for heating will be oversized for cooling and struggle to remove moisture. Add a standalone dehumidifier and use OEM data to verify that the system turns down to <80% of total cooling load.");
      } else {
        instructions.push("Sizing the system to heating will oversize it for cooling. For optimal comfort and to avoid wear & tear on the system, use performance data to verify that it turns down to <80% of total cooling load.");
      }
    } else if (sizingPercentage > 150) {
      sizingStatus = 'oversized';
    } else {
      return null;
    }
  } else {
    // Size to cooling load (default case)
    sizingPercentage = Math.round((equipment.coolingCapacityBtu / loadInputs.totalCoolingBtu) * 100);
    
    const minRange = equipment.staging === 'single_stage' ? 90 : equipment.staging === 'two_stage' ? 90 : 90;
    const maxRange = equipment.staging === 'single_stage' ? (loadInputs.totalCoolingBtu <= 24000 ? 120 : 115) : 
                     equipment.staging === 'two_stage' ? 125 : 130;

    if (sizingPercentage >= minRange && sizingPercentage <= maxRange) {
      sizingStatus = sizingPercentage <= 110 ? 'optimal' : 'acceptable';
    } else if (sizingPercentage > maxRange) {
      sizingStatus = 'oversized';
    } else {
      return null;
    }
  }

  // Calculate recommended CFM for all heat pumps
  const tons = equipment.nominalTons || (equipment.coolingCapacityBtu / 12000);
  const cfmPerTon = shr < 0.85 ? 350 : shr <= 0.95 ? 400 : 450;
  const recommendedCfm = Math.ceil(tons * cfmPerTon);

  instructions.push(`Verify existing ductwork is capable of handling at least ${recommendedCfm.toLocaleString()} CFM`);

  return {
    equipment: createEquipmentRecommendationObject(equipment, 'heat_pump'),
    sizingStatus,
    sizingPercentage,
    warnings,
    instructions,
    backupHeatRequired,
    recommendedCfm,
  };
}

function evaluateBoiler(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.heatingCapacityBtu || loadInputs.totalHeatingBtu === 0) return null;

  const actualOutput = equipment.heatingCapacityBtu;
  const sizingPercentage = Math.round((actualOutput / loadInputs.totalHeatingBtu) * 100);
  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'undersized';

  if (sizingPercentage >= 100 && sizingPercentage <= 125) {
    sizingStatus = 'optimal';
  } else if (sizingPercentage >= 125 && sizingPercentage <= 150) {
    sizingStatus = 'acceptable';
    warnings.push(`This boiler is ${sizingPercentage}% of the heating load. Consider if oversizing is appropriate for pickup and recovery.`);
  } else if (sizingPercentage > 150) {
    sizingStatus = 'oversized';
    warnings.push(`This boiler is significantly oversized at ${sizingPercentage}% of load. May cause short cycling and reduced efficiency.`);
  } else {
    return null; // Don't show undersized equipment
  }

  // Add hydronic-specific instructions
  if (equipment.distributionType === 'hydronic') {
    instructions.push('Verify zone control and pump sizing for proper flow rates');
    instructions.push('Consider boiler reset controls for optimal efficiency');
  }

  return {
    equipment: createEquipmentRecommendationObject(equipment, 'boiler'),
    sizingStatus,
    sizingPercentage,
    backupHeatRequired: undefined,
    recommendedCfm: undefined,
    warnings,
    instructions,
  };
}

function evaluateComboSystem(
  equipment: Equipment,
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  shr: number,
  latentCooling: number,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.heatingCapacityBtu || !equipment.coolingCapacityBtu) return null;
  if (loadInputs.totalHeatingBtu === 0 && loadInputs.totalCoolingBtu === 0) return null;

  const heatingPercentage = loadInputs.totalHeatingBtu > 0 
    ? Math.round((equipment.heatingCapacityBtu / loadInputs.totalHeatingBtu) * 100)
    : 100;
  
  const coolingPercentage = loadInputs.totalCoolingBtu > 0
    ? Math.round((equipment.coolingCapacityBtu / loadInputs.totalCoolingBtu) * 100)
    : 100;

  // System must meet both heating and cooling loads adequately
  if (heatingPercentage < 100 || coolingPercentage < 100) {
    return null; // Don't show undersized equipment
  }

  let sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized' = 'optimal';
  const avgPercentage = Math.round((heatingPercentage + coolingPercentage) / 2);

  if (heatingPercentage > 140 || coolingPercentage > 130) {
    sizingStatus = 'oversized';
    warnings.push(`System oversized - Heating: ${heatingPercentage}%, Cooling: ${coolingPercentage}%`);
  } else if (heatingPercentage > 125 || coolingPercentage > 115) {
    sizingStatus = 'acceptable';
  }

  // Add combo-specific instructions
  instructions.push('Verify shared ductwork is sized for both heating and cooling airflow requirements');
  instructions.push('Consider zoning controls if heating and cooling loads vary significantly by area');

  return {
    equipment: createEquipmentRecommendationObject(equipment, 'furnace_ac_combo'),
    sizingStatus,
    sizingPercentage: avgPercentage,
    backupHeatRequired: undefined,
    recommendedCfm: Math.round((equipment.coolingCapacityBtu || 0) / 12000 * 400),
    warnings,
    instructions,
  };
}




