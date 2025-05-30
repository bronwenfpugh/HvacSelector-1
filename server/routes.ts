import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loadInputsSchema, userPreferencesSchema } from "@shared/schema";
import { z } from "zod";

const calculateRequestSchema = z.object({
  loadInputs: loadInputsSchema,
  preferences: userPreferencesSchema,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Calculate equipment recommendations
  app.post("/api/calculate-recommendations", async (req, res) => {
    try {
      const { loadInputs, preferences } = calculateRequestSchema.parse(req.body);
      
      const recommendations = await storage.calculateRecommendations(loadInputs, preferences);
      
      res.json({ recommendations });
    } catch (error) {
      console.error("Error calculating recommendations:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid request data" 
      });
    }
  });

  // Get all equipment (for debugging/admin purposes)
  app.get("/api/equipment", async (req, res) => {
    try {
      const equipment = await storage.getAllEquipment();
      res.json({ equipment });
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
