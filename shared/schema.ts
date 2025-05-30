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

// Load calculation inputs
export const loadInputsSchema = z.object({
  totalHeatingBtu: z.number().min(0).max(500000),
  totalCoolingBtu: z.number().min(0).max(500000),
  sensibleCoolingBtu: z.number().min(0).max(500000),
  outdoorSummerDesignTemp: z.number().min(-30).max(150).optional(),
  outdoorWinterDesignTemp: z.number().min(-30).max(150).optional(),
  elevation: z.number().min(-3000).max(30000).optional(),
  indoorHumidity: z.number().min(0).max(100).optional(),
});

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

// Equipment recommendation result
export const equipmentRecommendationSchema = z.object({
  equipment: z.object({
    id: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    price: z.number(),
    equipmentType: z.enum(['furnace', 'ac', 'heat_pump', 'boiler', 'furnace_ac_combo']),
    distributionType: z.enum(['ducted', 'ductless', 'hydronic']),
    staging: z.enum(['single_stage', 'two_stage', 'variable_speed']),
    nominalTons: z.number().nullable(),
    nominalBtu: z.number().nullable(),
    heatingCapacityBtu: z.number().nullable(),
    coolingCapacityBtu: z.number().nullable(),
    latentCoolingBtu: z.number().nullable(),
    afue: z.number().nullable(),
    seer: z.number().nullable(),
    hspf: z.number().nullable(),
    imageUrl: z.string(),
  }),
  sizingStatus: z.enum(['optimal', 'acceptable', 'oversized', 'undersized']),
  sizingPercentage: z.number(),
  warnings: z.array(z.string()),
  instructions: z.array(z.string()),
  backupHeatRequired: z.number().optional(),
  recommendedCfm: z.number().optional(),
});

export const insertEquipmentSchema = createInsertSchema(equipment);
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type LoadInputs = z.infer<typeof loadInputsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type EquipmentRecommendation = z.infer<typeof equipmentRecommendationSchema>;
