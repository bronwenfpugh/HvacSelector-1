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
      
      const result = await storage.calculateRecommendations(loadInputs, preferences);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into user-friendly messages
        const validationErrors = error.errors.map(err => {
          const field = err.path.join('.');
          let message = err.message;
          
          // Provide contractor-friendly error messages
          if (err.code === 'too_big' && field.includes('Btu')) {
            message = `${field} value is too high - verify Manual J calculations`;
          } else if (err.code === 'too_small' && field.includes('Btu')) {
            message = `${field} value is too low - check load calculation inputs`;
          } else if (field === 'sensibleCoolingBtu' && err.message.includes('exceed')) {
            message = 'Sensible cooling load cannot be greater than total cooling load - check your calculations';
          } else if (err.message.includes('sensible heat ratio')) {
            message = 'Sensible heat ratio is outside normal range (65-100%) - verify latent load calculations';
          } else if (err.message.includes('at least one load')) {
            message = 'Enter either a heating load or cooling load to calculate equipment recommendations';
          } else if (err.message.includes('design temperature')) {
            message = 'Winter design temperature must be lower than summer design temperature';
          }
          
          return {
            field,
            message,
            code: err.code
          };
        });
        
        res.status(400).json({ 
          error: "Invalid input data", 
          validationErrors
        });
      } else {
        console.error("Error calculating recommendations:", error);
        res.status(500).json({ 
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
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
