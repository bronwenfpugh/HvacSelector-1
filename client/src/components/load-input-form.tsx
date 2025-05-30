import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calculator, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoadInputs, UserPreferences } from "@shared/schema";

interface LoadInputFormProps {
  loadInputs: LoadInputs;
  preferences: UserPreferences;
  onLoadInputsChange: (inputs: LoadInputs) => void;
  onPreferencesChange: (prefs: UserPreferences) => void;
  onCalculate: (inputs: LoadInputs, prefs: UserPreferences) => void;
  isCalculating: boolean;
}

export default function LoadInputForm({
  loadInputs,
  preferences,
  onLoadInputsChange,
  onPreferencesChange,
  onCalculate,
  isCalculating
}: LoadInputFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [latentCooling, setLatentCooling] = useState(0);
  const [shr, setShr] = useState(0);

  // Calculate derived values
  useEffect(() => {
    const latent = Math.max(0, loadInputs.totalCoolingBtu - loadInputs.sensibleCoolingBtu);
    const shrValue = loadInputs.totalCoolingBtu > 0 ? loadInputs.sensibleCoolingBtu / loadInputs.totalCoolingBtu : 0;
    
    setLatentCooling(latent);
    setShr(shrValue);
  }, [loadInputs.totalCoolingBtu, loadInputs.sensibleCoolingBtu]);

  const validateInput = (field: keyof LoadInputs, value: number): string => {
    const validationRules = {
      totalHeatingBtu: { min: 0, max: 500000, name: "Total Heating Load" },
      totalCoolingBtu: { min: 0, max: 500000, name: "Total Cooling Load" },
      sensibleCoolingBtu: { min: 0, max: 500000, name: "Sensible Cooling Load" },
    };

    const rule = validationRules[field];
    if (!rule) return "";

    if (value < rule.min || value > rule.max) {
      return `${rule.name} must be between ${rule.min.toLocaleString()} and ${rule.max.toLocaleString()}`;
    }

    if (field === 'sensibleCoolingBtu' && value > loadInputs.totalCoolingBtu) {
      return "Sensible cooling cannot exceed total cooling load";
    }

    return "";
  };

  const handleInputChange = (field: keyof LoadInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newInputs = { ...loadInputs, [field]: numValue };
    
    // Validate
    const error = validateInput(field, numValue);
    setErrors(prev => ({ ...prev, [field]: error }));
    
    onLoadInputsChange(newInputs);
  };

  const handleEquipmentTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...preferences.equipmentTypes, type as any]
      : preferences.equipmentTypes.filter(t => t !== type);
    
    onPreferencesChange({ ...preferences, equipmentTypes: newTypes });
  };

  const handleSizingPreferenceChange = (value: string) => {
    onPreferencesChange({ 
      ...preferences, 
      sizingPreference: value as 'size_to_heating' | 'size_to_cooling' 
    });
  };

  const isFormValid = () => {
    const hasInputs = loadInputs.totalHeatingBtu > 0 || loadInputs.totalCoolingBtu > 0;
    const hasNoErrors = Object.values(errors).every(error => !error);
    const hasEquipmentTypes = preferences.equipmentTypes.length > 0;
    
    return hasInputs && hasNoErrors && hasEquipmentTypes;
  };

  const handleCalculate = () => {
    if (isFormValid()) {
      onCalculate(loadInputs, preferences);
    }
  };

  return (
    <Card className="bg-dust-3 sticky top-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-carbon flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Load Calculation Inputs</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Load Inputs */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="heatingBtu" className="text-sm font-medium text-carbon">
              Total Heating Load (BTU/hr)
            </Label>
            <Input
              id="heatingBtu"
              type="number"
              placeholder="Enter heating load"
              min="0"
              max="500000"
              value={loadInputs.totalHeatingBtu || ""}
              onChange={(e) => handleInputChange('totalHeatingBtu', e.target.value)}
              className={`mt-2 ${errors.totalHeatingBtu ? 'border-error-red' : ''}`}
            />
            <div className="mt-1 text-sm text-slate-2">Range: 0 - 500,000 BTU/hr</div>
            {errors.totalHeatingBtu && (
              <div className="mt-1 text-sm text-error-red">{errors.totalHeatingBtu}</div>
            )}
          </div>

          <div>
            <Label htmlFor="coolingBtu" className="text-sm font-medium text-carbon">
              Total Cooling Load (BTU/hr)
            </Label>
            <Input
              id="coolingBtu"
              type="number"
              placeholder="Enter cooling load"
              min="0"
              max="500000"
              value={loadInputs.totalCoolingBtu || ""}
              onChange={(e) => handleInputChange('totalCoolingBtu', e.target.value)}
              className={`mt-2 ${errors.totalCoolingBtu ? 'border-error-red' : ''}`}
            />
            <div className="mt-1 text-sm text-slate-2">Range: 0 - 500,000 BTU/hr</div>
            {errors.totalCoolingBtu && (
              <div className="mt-1 text-sm text-error-red">{errors.totalCoolingBtu}</div>
            )}
          </div>

          <div>
            <Label htmlFor="sensibleCoolingBtu" className="text-sm font-medium text-carbon">
              Sensible Cooling Load (BTU/hr)
            </Label>
            <Input
              id="sensibleCoolingBtu"
              type="number"
              placeholder="Enter sensible cooling load"
              min="0"
              max="500000"
              value={loadInputs.sensibleCoolingBtu || ""}
              onChange={(e) => handleInputChange('sensibleCoolingBtu', e.target.value)}
              className={`mt-2 ${errors.sensibleCoolingBtu ? 'border-error-red' : ''}`}
            />
            <div className="mt-1 text-sm text-slate-2">Must be ≤ total cooling load</div>
            {errors.sensibleCoolingBtu && (
              <div className="mt-1 text-sm text-error-red">{errors.sensibleCoolingBtu}</div>
            )}
          </div>

          {/* Auto-calculated fields */}
          <div className="space-y-3 pt-4 border-t border-dust-1">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-1">Latent Cooling Load:</span>
              <span className="text-sm font-semibold text-carbon">
                {latentCooling.toLocaleString()} BTU/hr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-1">Sensible Heat Ratio:</span>
              <span className="text-sm font-semibold text-carbon">
                {shr.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Equipment Type Selector */}
        <div>
          <h3 className="text-lg font-semibold text-carbon mb-4">Equipment Types</h3>
          <div className="space-y-3">
            {[
              { id: 'furnace', label: 'Furnaces' },
              { id: 'ac', label: 'Air Conditioners' },
              { id: 'heat_pump', label: 'Heat Pumps' },
            ].map(({ id, label }) => (
              <div key={id} className="flex items-center space-x-3">
                <Checkbox
                  id={id}
                  checked={preferences.equipmentTypes.includes(id as any)}
                  onCheckedChange={(checked) => handleEquipmentTypeChange(id, checked as boolean)}
                />
                <Label htmlFor={id} className="text-sm font-medium text-carbon cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Heat Pump Sizing Preference */}
        {preferences.equipmentTypes.includes('heat_pump') && (
          <div>
            <h3 className="text-lg font-semibold text-carbon mb-4">Heat Pump Sizing</h3>
            <RadioGroup
              value={preferences.sizingPreference || 'size_to_cooling'}
              onValueChange={handleSizingPreferenceChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="size_to_cooling" id="cooling" />
                <Label htmlFor="cooling" className="text-sm font-medium text-carbon cursor-pointer">
                  Size to Cooling Load
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="size_to_heating" id="heating" />
                <Label htmlFor="heating" className="text-sm font-medium text-carbon cursor-pointer">
                  Size to Heating Load
                </Label>
              </div>
            </RadioGroup>
            <div className="mt-2 text-xs text-slate-2">
              Affects heat pump selection when heating load exceeds cooling load
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          disabled={!isFormValid() || isCalculating}
          className="w-full bg-electric-purple hover:bg-purple-600 text-white font-semibold py-4 px-6 disabled:bg-slate-2 disabled:cursor-not-allowed"
        >
          <Calculator className="mr-2 h-4 w-4" />
          {isCalculating ? 'Calculating...' : 'Calculate Equipment Options'}
        </Button>
      </CardContent>
    </Card>
  );
}
