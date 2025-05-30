import { equipmentDatabase } from "../client/src/lib/equipment-data";
import { calculateEquipmentRecommendations } from "../client/src/lib/sizing-engine";
import type { Equipment, LoadInputs, UserPreferences, EquipmentRecommendation } from "@shared/schema";

export interface IStorage {
  getAllEquipment(): Promise<Equipment[]>;
  calculateRecommendations(loadInputs: LoadInputs, preferences: UserPreferences): Promise<EquipmentRecommendation[]>;
}

export class MemStorage implements IStorage {
  private equipment: Equipment[];

  constructor() {
    this.equipment = [...equipmentDatabase];
  }

  async getAllEquipment(): Promise<Equipment[]> {
    return this.equipment.filter(eq => eq.isActive);
  }

  async calculateRecommendations(
    loadInputs: LoadInputs, 
    preferences: UserPreferences
  ): Promise<EquipmentRecommendation[]> {
    const activeEquipment = this.equipment.filter(eq => eq.isActive);
    
    // Use the sizing engine to calculate recommendations
    const recommendations = calculateEquipmentRecommendations(
      loadInputs,
      preferences,
      activeEquipment
    );

    return recommendations;
  }
}

export const storage = new MemStorage();
