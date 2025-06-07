import { useState } from "react";
import { Settings } from "lucide-react";
import LoadInputForm from "@/components/load-input-form";
import EquipmentResults from "@/components/equipment-results";
import ValidationSummaryComponent from "@/components/validation-summary";
import { generateValidationReport, generateMissingDataCSV } from "@/lib/validation-report";
import type { LoadInputs, UserPreferences, EquipmentRecommendation, ValidationSummary } from "@shared/schema";

export default function Home() {
  const [loadInputs, setLoadInputs] = useState<LoadInputs>({
    totalHeatingBtu: 0,
    totalCoolingBtu: 0,
    sensibleCoolingBtu: 0,
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    equipmentTypes: ['furnace', 'ac', 'heat_pump'],
    sizingPreference: 'size_to_cooling',
  });

  const [recommendations, setRecommendations] = useState<EquipmentRecommendation[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);

  const handleGenerateValidationReport = () => {
    const report = generateValidationReport();
    console.log(report);

    // Also create downloadable CSV
    const csv = generateMissingDataCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment-validation-issues.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async (inputs: LoadInputs, prefs: UserPreferences) => {
    setIsCalculating(true);
    try {
      const response = await fetch('/api/calculate-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loadInputs: inputs, preferences: prefs }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setValidationSummary(data.validationSummary);
    } catch (error) {
      console.error('Error calculating recommendations:', error);
      setRecommendations([]);
      setValidationSummary(null);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-dust-1 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Settings className="text-electric-purple text-2xl" />
            <h1 className="text-2xl font-semibold text-carbon">HVAC Equipment Selection</h1>
          </div>
          <div className="text-sm text-slate-1">
            Residential Load Matching Tool
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Sidebar */}
          <div className="lg:col-span-1">
            <LoadInputForm
              loadInputs={loadInputs}
              preferences={preferences}
              onLoadInputsChange={setLoadInputs}
              onPreferencesChange={setPreferences}
              onCalculate={handleCalculate}
              isCalculating={isCalculating}
            />
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center mb-8">
                <h1 className="text-display-3 font-bold text-carbon mb-4">
                  HVAC Equipment Selector
                </h1>
                <p className="text-subtitle-normal text-slate-1 max-w-2xl mx-auto">
                  Calculate heating and cooling loads, then get equipment recommendations based on your specific requirements and preferences.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleGenerateValidationReport}
                    className="px-4 py-2 bg-electric-purple text-white rounded-md hover:bg-electric-purple/80 text-sm"
                  >
                    Generate Equipment Validation Report
                  </button>
                </div>
              </div>
            </div>
            {validationSummary && validationSummary.totalEquipment > 0 && (
              <ValidationSummaryComponent validationSummary={validationSummary} />
            )}
            <EquipmentResults
              recommendations={recommendations}
              isLoading={isCalculating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}