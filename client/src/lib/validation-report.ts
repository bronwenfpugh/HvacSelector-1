
import type { Equipment, EquipmentValidationError } from "@shared/schema";
import { equipmentDatabase } from "./equipment-data";

// Type guard functions for validation
function isFurnaceValid(equipment: Equipment): boolean {
  return equipment.equipmentType === 'furnace' && 
         equipment.nominalBtu !== null && 
         equipment.heatingCapacityBtu !== null && 
         equipment.afue !== null &&
         equipment.nominalTons === null &&
         equipment.coolingCapacityBtu === null &&
         equipment.seer === null &&
         equipment.hspf === null;
}

function isAcValid(equipment: Equipment): boolean {
  return equipment.equipmentType === 'ac' &&
         equipment.nominalTons !== null &&
         equipment.coolingCapacityBtu !== null &&
         equipment.latentCoolingBtu !== null &&
         equipment.seer !== null &&
         equipment.nominalBtu === null &&
         equipment.heatingCapacityBtu === null &&
         equipment.afue === null &&
         equipment.hspf === null;
}

function isHeatPumpValid(equipment: Equipment): boolean {
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

function isBoilerValid(equipment: Equipment): boolean {
  return equipment.equipmentType === 'boiler' &&
         equipment.nominalBtu !== null &&
         equipment.heatingCapacityBtu !== null &&
         equipment.afue !== null &&
         equipment.nominalTons === null &&
         equipment.coolingCapacityBtu === null &&
         equipment.seer === null &&
         equipment.hspf === null;
}

function isComboValid(equipment: Equipment): boolean {
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

interface ValidationDetail {
  field: string;
  expected: string;
  actual: string;
  issue: string;
}

function getValidationDetails(equipment: Equipment): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  
  switch (equipment.equipmentType) {
    case 'furnace':
      if (equipment.nominalBtu === null) {
        details.push({
          field: 'nominalBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for furnaces'
        });
      }
      if (equipment.heatingCapacityBtu === null) {
        details.push({
          field: 'heatingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for furnaces'
        });
      }
      if (equipment.afue === null) {
        details.push({
          field: 'afue',
          expected: 'number',
          actual: 'null',
          issue: 'Required for furnaces'
        });
      }
      if (equipment.nominalTons !== null) {
        details.push({
          field: 'nominalTons',
          expected: 'null',
          actual: String(equipment.nominalTons),
          issue: 'Must be null for furnaces'
        });
      }
      if (equipment.coolingCapacityBtu !== null) {
        details.push({
          field: 'coolingCapacityBtu',
          expected: 'null',
          actual: String(equipment.coolingCapacityBtu),
          issue: 'Must be null for furnaces'
        });
      }
      if (equipment.seer !== null) {
        details.push({
          field: 'seer',
          expected: 'null',
          actual: String(equipment.seer),
          issue: 'Must be null for furnaces'
        });
      }
      if (equipment.hspf !== null) {
        details.push({
          field: 'hspf',
          expected: 'null',
          actual: String(equipment.hspf),
          issue: 'Must be null for furnaces'
        });
      }
      break;

    case 'ac':
      if (equipment.nominalTons === null) {
        details.push({
          field: 'nominalTons',
          expected: 'number',
          actual: 'null',
          issue: 'Required for air conditioners'
        });
      }
      if (equipment.coolingCapacityBtu === null) {
        details.push({
          field: 'coolingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for air conditioners'
        });
      }
      if (equipment.latentCoolingBtu === null) {
        details.push({
          field: 'latentCoolingBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for air conditioners'
        });
      }
      if (equipment.seer === null) {
        details.push({
          field: 'seer',
          expected: 'number',
          actual: 'null',
          issue: 'Required for air conditioners'
        });
      }
      if (equipment.nominalBtu !== null) {
        details.push({
          field: 'nominalBtu',
          expected: 'null',
          actual: String(equipment.nominalBtu),
          issue: 'Must be null for air conditioners'
        });
      }
      if (equipment.heatingCapacityBtu !== null) {
        details.push({
          field: 'heatingCapacityBtu',
          expected: 'null',
          actual: String(equipment.heatingCapacityBtu),
          issue: 'Must be null for air conditioners'
        });
      }
      if (equipment.afue !== null) {
        details.push({
          field: 'afue',
          expected: 'null',
          actual: String(equipment.afue),
          issue: 'Must be null for air conditioners'
        });
      }
      if (equipment.hspf !== null) {
        details.push({
          field: 'hspf',
          expected: 'null',
          actual: String(equipment.hspf),
          issue: 'Must be null for air conditioners'
        });
      }
      break;

    case 'heat_pump':
      if (equipment.nominalTons === null) {
        details.push({
          field: 'nominalTons',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.heatingCapacityBtu === null) {
        details.push({
          field: 'heatingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.coolingCapacityBtu === null) {
        details.push({
          field: 'coolingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.latentCoolingBtu === null) {
        details.push({
          field: 'latentCoolingBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.seer === null) {
        details.push({
          field: 'seer',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.hspf === null) {
        details.push({
          field: 'hspf',
          expected: 'number',
          actual: 'null',
          issue: 'Required for heat pumps'
        });
      }
      if (equipment.nominalBtu !== null) {
        details.push({
          field: 'nominalBtu',
          expected: 'null',
          actual: String(equipment.nominalBtu),
          issue: 'Must be null for heat pumps'
        });
      }
      if (equipment.afue !== null) {
        details.push({
          field: 'afue',
          expected: 'null',
          actual: String(equipment.afue),
          issue: 'Must be null for heat pumps'
        });
      }
      break;

    case 'boiler':
      if (equipment.nominalBtu === null) {
        details.push({
          field: 'nominalBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for boilers'
        });
      }
      if (equipment.heatingCapacityBtu === null) {
        details.push({
          field: 'heatingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for boilers'
        });
      }
      if (equipment.afue === null) {
        details.push({
          field: 'afue',
          expected: 'number',
          actual: 'null',
          issue: 'Required for boilers'
        });
      }
      if (equipment.nominalTons !== null) {
        details.push({
          field: 'nominalTons',
          expected: 'null',
          actual: String(equipment.nominalTons),
          issue: 'Must be null for boilers'
        });
      }
      if (equipment.coolingCapacityBtu !== null) {
        details.push({
          field: 'coolingCapacityBtu',
          expected: 'null',
          actual: String(equipment.coolingCapacityBtu),
          issue: 'Must be null for boilers'
        });
      }
      if (equipment.seer !== null) {
        details.push({
          field: 'seer',
          expected: 'null',
          actual: String(equipment.seer),
          issue: 'Must be null for boilers'
        });
      }
      if (equipment.hspf !== null) {
        details.push({
          field: 'hspf',
          expected: 'null',
          actual: String(equipment.hspf),
          issue: 'Must be null for boilers'
        });
      }
      break;

    case 'furnace_ac_combo':
      if (equipment.nominalTons === null) {
        details.push({
          field: 'nominalTons',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.nominalBtu === null) {
        details.push({
          field: 'nominalBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.heatingCapacityBtu === null) {
        details.push({
          field: 'heatingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.coolingCapacityBtu === null) {
        details.push({
          field: 'coolingCapacityBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.latentCoolingBtu === null) {
        details.push({
          field: 'latentCoolingBtu',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.afue === null) {
        details.push({
          field: 'afue',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.seer === null) {
        details.push({
          field: 'seer',
          expected: 'number',
          actual: 'null',
          issue: 'Required for combo systems'
        });
      }
      if (equipment.hspf !== null) {
        details.push({
          field: 'hspf',
          expected: 'null',
          actual: String(equipment.hspf),
          issue: 'Must be null for combo systems'
        });
      }
      break;
  }

  return details;
}

export function generateValidationReport(): string {
  const report: string[] = [];
  const invalidEquipment: Array<{ equipment: Equipment; details: ValidationDetail[] }> = [];
  
  report.push("=".repeat(80));
  report.push("EQUIPMENT VALIDATION REPORT");
  report.push("=".repeat(80));
  report.push("");
  
  // Analyze each equipment item
  for (const equipment of equipmentDatabase) {
    let isValid = false;
    
    switch (equipment.equipmentType) {
      case 'furnace':
        isValid = isFurnaceValid(equipment);
        break;
      case 'ac':
        isValid = isAcValid(equipment);
        break;
      case 'heat_pump':
        isValid = isHeatPumpValid(equipment);
        break;
      case 'boiler':
        isValid = isBoilerValid(equipment);
        break;
      case 'furnace_ac_combo':
        isValid = isComboValid(equipment);
        break;
    }
    
    if (!isValid) {
      const details = getValidationDetails(equipment);
      invalidEquipment.push({ equipment, details });
    }
  }
  
  // Summary
  report.push(`SUMMARY:`);
  report.push(`- Total equipment items: ${equipmentDatabase.length}`);
  report.push(`- Valid equipment items: ${equipmentDatabase.length - invalidEquipment.length}`);
  report.push(`- Invalid equipment items: ${invalidEquipment.length}`);
  report.push("");
  
  if (invalidEquipment.length === 0) {
    report.push("✅ ALL EQUIPMENT ITEMS ARE VALID!");
    report.push("");
    return report.join("\n");
  }
  
  // Group by validation issue type
  const issueCategories: { [key: string]: Array<{ equipment: Equipment; details: ValidationDetail[] }> } = {};
  
  for (const item of invalidEquipment) {
    for (const detail of item.details) {
      const category = `${detail.field}: ${detail.issue}`;
      if (!issueCategories[category]) {
        issueCategories[category] = [];
      }
      issueCategories[category].push(item);
    }
  }
  
  // Top causes of invalidation
  report.push("TOP CAUSES OF INVALIDATION:");
  report.push("-".repeat(40));
  
  const sortedCategories = Object.entries(issueCategories)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 5);
  
  for (const [category, items] of sortedCategories) {
    report.push(`${items.length} items: ${category}`);
  }
  report.push("");
  
  // Detailed breakdown by equipment type
  const byType: { [key: string]: Array<{ equipment: Equipment; details: ValidationDetail[] }> } = {};
  for (const item of invalidEquipment) {
    const type = item.equipment.equipmentType;
    if (!byType[type]) byType[type] = [];
    byType[type].push(item);
  }
  
  for (const [type, items] of Object.entries(byType)) {
    report.push(`INVALID ${type.toUpperCase()} EQUIPMENT (${items.length} items):`);
    report.push("-".repeat(60));
    
    for (const item of items) {
      const eq = item.equipment;
      report.push(`${eq.manufacturer} ${eq.model} (${eq.id})`);
      for (const detail of item.details) {
        report.push(`  ❌ ${detail.field}: Expected ${detail.expected}, got ${detail.actual}`);
        report.push(`     Issue: ${detail.issue}`);
      }
      report.push("");
    }
  }
  
  // Specific fixing recommendations
  report.push("FIXING RECOMMENDATIONS:");
  report.push("-".repeat(40));
  
  for (const [category, items] of sortedCategories) {
    const [field, issue] = category.split(': ');
    report.push(`For ${items.length} items with "${field}: ${issue}":`);
    
    if (field === 'latentCoolingBtu' && issue === 'Required for air conditioners') {
      report.push("  - Calculate as 30-35% of total cooling capacity");
      report.push("  - Formula: latentCoolingBtu = coolingCapacityBtu * 0.33");
    } else if (field === 'latentCoolingBtu' && issue === 'Required for heat pumps') {
      report.push("  - Calculate as 30-35% of total cooling capacity");
      report.push("  - Formula: latentCoolingBtu = coolingCapacityBtu * 0.33");
    } else if (field === 'hspf' && issue === 'Required for heat pumps') {
      report.push("  - Look up manufacturer specifications");
      report.push("  - Typical range: 8.0 - 10.5 for modern heat pumps");
    } else if (issue.includes('Must be null')) {
      report.push(`  - Set ${field} to null for this equipment type`);
    } else if (issue.includes('Required for')) {
      report.push(`  - Look up manufacturer specifications for ${field}`);
    }
    report.push("");
  }
  
  return report.join("\n");
}

// Function to generate a CSV with missing data for manual completion
export function generateMissingDataCSV(): string {
  const csvRows: string[] = [];
  const headers = ['id', 'manufacturer', 'model', 'equipmentType', 'missingField', 'suggestedValue', 'notes'];
  csvRows.push(headers.join(','));
  
  for (const equipment of equipmentDatabase) {
    let isValid = false;
    
    switch (equipment.equipmentType) {
      case 'furnace':
        isValid = isFurnaceValid(equipment);
        break;
      case 'ac':
        isValid = isAcValid(equipment);
        break;
      case 'heat_pump':
        isValid = isHeatPumpValid(equipment);
        break;
      case 'boiler':
        isValid = isBoilerValid(equipment);
        break;
      case 'furnace_ac_combo':
        isValid = isComboValid(equipment);
        break;
    }
    
    if (!isValid) {
      const details = getValidationDetails(equipment);
      for (const detail of details) {
        if (detail.expected !== 'null') {
          let suggestedValue = '';
          let notes = '';
          
          if (detail.field === 'latentCoolingBtu' && equipment.coolingCapacityBtu) {
            suggestedValue = String(Math.round(equipment.coolingCapacityBtu * 0.33));
            notes = '33% of cooling capacity';
          } else if (detail.field === 'hspf') {
            suggestedValue = '9.0';
            notes = 'Typical value - verify with manufacturer data';
          }
          
          csvRows.push([
            equipment.id,
            equipment.manufacturer,
            equipment.model,
            equipment.equipmentType,
            detail.field,
            suggestedValue,
            notes
          ].join(','));
        }
      }
    }
  }
  
  return csvRows.join('\n');
}
