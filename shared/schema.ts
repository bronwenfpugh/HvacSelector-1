import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Equipment data structure
export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  model: text("model").notNull(),
  price: real("price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  equipmentType: text("equipment_type", { 
    enum: ['furnace', 'ac', 'heat_pump', 'boiler', 'furnace_ac_combo'] 
  }).notNull(),
  distributionType: text("distribution_type", { 
    enum: ['ducted', 'ductless', 'hydronic'] 
  }).notNull(),
  staging: text("staging", { 
    enum: ['single_stage', 'two_stage', 'variable_speed'] 
  }).notNull(),
  unitLocation: text("unit_location", { 
    enum: ['indoor', 'outdoor', 'split_system'] 
  }).notNull(),
  systemFunction: text("system_function", { 
    enum: ['heating', 'cooling', 'heating_cooling'] 
  }).notNull(),
  
  // Capacity fields (all in BTU/hr)
  nominalTons: real("nominal_tons"),
  nominalBtu: real("nominal_btu"),
  heatingCapacityBtu: real("heating_capacity_btu"),
  coolingCapacityBtu: real("cooling_capacity_btu"),
  latentCoolingBtu: real("latent_cooling_btu"),
  
  // Efficiency ratings
  afue: real("afue"), // decimal, e.g., 0.95 for 95%
  seer: real("seer"),
  hspf: real("hspf"),
  
  // Physical specifications
  cabinetWidth: real("cabinet_width"), // inches
  cabinetHeight: real("cabinet_height"), // inches
  cabinetDepth: real("cabinet_depth"), // inches
  
  imageUrl: text("image_url").notNull(),
});

// Load calculation inputs with cross-validation
export const loadInputsSchema = z.object({
  totalHeatingBtu: z.number().min(0).max(500000),
  totalCoolingBtu: z.number().min(0).max(500000),
  sensibleCoolingBtu: z.number().min(0).max(500000),
  outdoorSummerDesignTemp: z.number().min(-30).max(150).optional(),
  outdoorWinterDesignTemp: z.number().min(-30).max(150).optional(),
  elevation: z.number().min(-3000).max(30000).optional(),
  indoorHumidity: z.number().min(0).max(100).optional(),
}).refine(
  (data) => data.sensibleCoolingBtu <= data.totalCoolingBtu,
  {
    message: "Sensible cooling load cannot exceed total cooling load",
    path: ["sensibleCoolingBtu"],
  }
).refine(
  (data) => {
    if (data.totalCoolingBtu > 0) {
      const shr = data.sensibleCoolingBtu / data.totalCoolingBtu;
      return shr >= 0.65 && shr <= 1.0;
    }
    return true;
  },
  {
    message: "Sensible heat ratio must be between 0.65 and 1.0 for cooling loads",
    path: ["sensibleCoolingBtu"],
  }
).refine(
  (data) => {
    // Require heating or cooling load to be greater than zero
    return data.totalHeatingBtu > 0 || data.totalCoolingBtu > 0;
  },
  {
    message: "At least one load (heating or cooling) must be greater than zero",
    path: ["totalHeatingBtu"],
  }
).refine(
  (data) => {
    // If design temperatures are provided, winter should be less than summer
    if (data.outdoorWinterDesignTemp && data.outdoorSummerDesignTemp) {
      return data.outdoorWinterDesignTemp < data.outdoorSummerDesignTemp;
    }
    return true;
  },
  {
    message: "Winter design temperature must be less than summer design temperature",
    path: ["outdoorWinterDesignTemp"],
  }
);

// User preferences
export const userPreferencesSchema = z.object({
  equipmentTypes: z.array(z.enum(['furnace', 'ac', 'heat_pump', 'boiler', 'furnace_ac_combo'])),
  distributionType: z.enum(['ducted', 'ductless', 'hydronic']).optional(),
  sizingPreference: z.enum(['size_to_heating', 'size_to_cooling']).optional(),
  brandFilter: z.array(z.string()).optional(),
  stagingFilter: z.array(z.enum(['single_stage', 'two_stage', 'variable_speed'])).optional(),
  minAfue: z.number().optional(),
  maxPrice: z.number().optional(),
});

// Equipment recommendation result with equipment-type-specific validation
const baseEquipmentSchema = z.object({
  id: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  price: z.number(),
  distributionType: z.enum(['ducted', 'ductless', 'hydronic']),
  staging: z.enum(['single_stage', 'two_stage', 'variable_speed']),
  imageUrl: z.string(),
});

const furnaceEquipmentSchema = baseEquipmentSchema.extend({
  equipmentType: z.literal('furnace'),
  nominalTons: z.null(),
  nominalBtu: z.number(),
  heatingCapacityBtu: z.number(),
  coolingCapacityBtu: z.null(),
  latentCoolingBtu: z.null(),
  afue: z.number(),
  seer: z.null(),
  hspf: z.null(),
});

const acEquipmentSchema = baseEquipmentSchema.extend({
  equipmentType: z.literal('ac'),
  nominalTons: z.number(),
  nominalBtu: z.null(),
  heatingCapacityBtu: z.null(),
  coolingCapacityBtu: z.number(),
  latentCoolingBtu: z.number(),
  afue: z.null(),
  seer: z.number(),
  hspf: z.null(),
});

const heatPumpEquipmentSchema = baseEquipmentSchema.extend({
  equipmentType: z.literal('heat_pump'),
  nominalTons: z.number(),
  nominalBtu: z.null(),
  heatingCapacityBtu: z.number(),
  coolingCapacityBtu: z.number(),
  latentCoolingBtu: z.number(),
  afue: z.null(),
  seer: z.number(),
  hspf: z.number(),
});

const boilerEquipmentSchema = baseEquipmentSchema.extend({
  equipmentType: z.literal('boiler'),
  nominalTons: z.null(),
  nominalBtu: z.number(),
  heatingCapacityBtu: z.number(),
  coolingCapacityBtu: z.null(),
  latentCoolingBtu: z.null(),
  afue: z.number(),
  seer: z.null(),
  hspf: z.null(),
});

const comboEquipmentSchema = baseEquipmentSchema.extend({
  equipmentType: z.literal('furnace_ac_combo'),
  nominalTons: z.number(),
  nominalBtu: z.number(),
  heatingCapacityBtu: z.number(),
  coolingCapacityBtu: z.number(),
  latentCoolingBtu: z.number(),
  afue: z.number(),
  seer: z.number(),
  hspf: z.null(),
});

const equipmentRecommendationEquipmentSchema = z.discriminatedUnion('equipmentType', [
  furnaceEquipmentSchema,
  acEquipmentSchema,
  heatPumpEquipmentSchema,
  boilerEquipmentSchema,
  comboEquipmentSchema,
]);

export const equipmentRecommendationSchema = z.object({
  equipment: equipmentRecommendationEquipmentSchema,
  sizingStatus: z.enum(['optimal', 'acceptable', 'oversized', 'undersized']),
  sizingPercentage: z.number(),
  warnings: z.array(z.string()),
  instructions: z.array(z.string()),
  backupHeatRequired: z.number().optional(),
  recommendedCfm: z.number().optional(),
});

// Strict equipment type definitions for compile-time safety
export type FurnaceEquipment = {
  equipmentType: 'furnace';
  nominalTons: null;
  nominalBtu: number;
  heatingCapacityBtu: number;
  coolingCapacityBtu: null;
  latentCoolingBtu: null;
  afue: number;
  seer: null;
  hspf: null;
} & Omit<typeof equipment.$inferSelect, 'equipmentType' | 'nominalTons' | 'nominalBtu' | 'heatingCapacityBtu' | 'coolingCapacityBtu' | 'latentCoolingBtu' | 'afue' | 'seer' | 'hspf'>;

export type AcEquipment = {
  equipmentType: 'ac';
  nominalTons: number;
  nominalBtu: null;
  heatingCapacityBtu: null;
  coolingCapacityBtu: number;
  latentCoolingBtu: number;
  afue: null;
  seer: number;
  hspf: null;
} & Omit<typeof equipment.$inferSelect, 'equipmentType' | 'nominalTons' | 'nominalBtu' | 'heatingCapacityBtu' | 'coolingCapacityBtu' | 'latentCoolingBtu' | 'afue' | 'seer' | 'hspf'>;

export type HeatPumpEquipment = {
  equipmentType: 'heat_pump';
  nominalTons: number;
  nominalBtu: null;
  heatingCapacityBtu: number;
  coolingCapacityBtu: number;
  latentCoolingBtu: number;
  afue: null;
  seer: number;
  hspf: number;
} & Omit<typeof equipment.$inferSelect, 'equipmentType' | 'nominalTons' | 'nominalBtu' | 'heatingCapacityBtu' | 'coolingCapacityBtu' | 'latentCoolingBtu' | 'afue' | 'seer' | 'hspf'>;

export type BoilerEquipment = {
  equipmentType: 'boiler';
  nominalTons: null;
  nominalBtu: number;
  heatingCapacityBtu: number;
  coolingCapacityBtu: null;
  latentCoolingBtu: null;
  afue: number;
  seer: null;
  hspf: null;
} & Omit<typeof equipment.$inferSelect, 'equipmentType' | 'nominalTons' | 'nominalBtu' | 'heatingCapacityBtu' | 'coolingCapacityBtu' | 'latentCoolingBtu' | 'afue' | 'seer' | 'hspf'>;

export type ComboEquipment = {
  equipmentType: 'furnace_ac_combo';
  nominalTons: number;
  nominalBtu: number;
  heatingCapacityBtu: number;
  coolingCapacityBtu: number;
  latentCoolingBtu: number;
  afue: number;
  seer: number;
  hspf: null;
} & Omit<typeof equipment.$inferSelect, 'equipmentType' | 'nominalTons' | 'nominalBtu' | 'heatingCapacityBtu' | 'coolingCapacityBtu' | 'latentCoolingBtu' | 'afue' | 'seer' | 'hspf'>;

// Discriminated union of all equipment types
export type TypedEquipment = FurnaceEquipment | AcEquipment | HeatPumpEquipment | BoilerEquipment | ComboEquipment;

export const insertEquipmentSchema = createInsertSchema(equipment);
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type LoadInputs = z.infer<typeof loadInputsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type EquipmentRecommendation = z.infer<typeof equipmentRecommendationSchema>;

// Equipment validation result types
export interface EquipmentValidationError {
  equipmentId: string;
  manufacturer: string;
  model: string;
  errorType: 'type_validation' | 'spec_validation' | 'data_inconsistency';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  technicalDetails?: string;
}

export interface ValidationSummary {
  totalEquipment: number;
  includedEquipment: number;
  excludedEquipment: number;
  errors: EquipmentValidationError[];
}

export interface EquipmentCalculationResult {
  recommendations: EquipmentRecommendation[];
  validationSummary: ValidationSummary;
}
