import type { LoadInputs, UserPreferences, Equipment, EquipmentRecommendation } from "@shared/schema";

export function calculateEquipmentRecommendations(
  loadInputs: LoadInputs,
  preferences: UserPreferences,
  equipmentList: Equipment[]
): EquipmentRecommendation[] {
  const recommendations: EquipmentRecommendation[] = [];
  
  // Calculate derived values
  const latentCooling = loadInputs.totalCoolingBtu - loadInputs.sensibleCoolingBtu;
  const shr = loadInputs.totalCoolingBtu > 0 ? loadInputs.sensibleCoolingBtu / loadInputs.totalCoolingBtu : 0;

  // Filter equipment by type preferences
  const filteredEquipment = equipmentList.filter(eq => 
    preferences.equipmentTypes.includes(eq.equipmentType) && eq.isActive
  );

  for (const equipment of filteredEquipment) {
    const recommendation = evaluateEquipment(equipment, loadInputs, preferences, shr, latentCooling);
    if (recommendation) {
      recommendations.push(recommendation);
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

  return recommendations;
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

  switch (equipment.equipmentType) {
    case 'furnace':
      return evaluateFurnace(equipment, loadInputs, warnings, instructions);
    
    case 'ac':
      return evaluateAirConditioner(equipment, loadInputs, shr, warnings, instructions);
    
    case 'heat_pump':
      return evaluateHeatPump(equipment, loadInputs, preferences, shr, latentCooling, warnings, instructions);
    
    default:
      return null;
  }
}

function evaluateFurnace(
  equipment: Equipment,
  loadInputs: LoadInputs,
  warnings: string[],
  instructions: string[]
): EquipmentRecommendation | null {
  if (!equipment.heatingCapacityBtu || loadInputs.totalHeatingBtu === 0) return null;

  const actualOutput = equipment.heatingCapacityBtu; // Already adjusted for AFUE in data
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
    equipment: {
      id: equipment.id,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      price: equipment.price,
      equipmentType: equipment.equipmentType,
      distributionType: equipment.distributionType,
      staging: equipment.staging,
      nominalBtu: equipment.nominalBtu,
      afue: equipment.afue,
      imageUrl: equipment.imageUrl,
    },
    sizingStatus,
    sizingPercentage,
    warnings,
    instructions,
  };
}

function evaluateAirConditioner(
  equipment: Equipment,
  loadInputs: LoadInputs,
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
    equipment: {
      id: equipment.id,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      price: equipment.price,
      equipmentType: equipment.equipmentType,
      distributionType: equipment.distributionType,
      staging: equipment.staging,
      nominalTons: equipment.nominalTons,
      coolingCapacityBtu: equipment.coolingCapacityBtu,
      seer: equipment.seer,
      imageUrl: equipment.imageUrl,
    },
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
    equipment: {
      id: equipment.id,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      price: equipment.price,
      equipmentType: equipment.equipmentType,
      distributionType: equipment.distributionType,
      staging: equipment.staging,
      nominalTons: equipment.nominalTons,
      heatingCapacityBtu: equipment.heatingCapacityBtu,
      coolingCapacityBtu: equipment.coolingCapacityBtu,
      seer: equipment.seer,
      hspf: equipment.hspf,
      imageUrl: equipment.imageUrl,
    },
    sizingStatus,
    sizingPercentage,
    warnings,
    instructions,
    backupHeatRequired,
    recommendedCfm,
  };
}
