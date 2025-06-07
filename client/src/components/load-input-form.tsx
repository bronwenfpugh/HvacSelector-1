import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calculator, Settings, ChevronDown, Filter } from "lucide-react";
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [latentCooling, setLatentCooling] = useState(0);
  const [shr, setShr] = useState(0);

  // Initialize unit location filter with all options if empty
  useEffect(() => {
    if (!preferences.unitLocationFilter || preferences.unitLocationFilter.length === 0) {
      onPreferencesChange({
        ...preferences,
        unitLocationFilter: ['indoor', 'outdoor', 'split_system']
      });
    }
  }, []);

  // Calculate derived values and validate relationships
  useEffect(() => {
    const latent = Math.max(0, loadInputs.totalCoolingBtu - loadInputs.sensibleCoolingBtu);
    const shrValue = loadInputs.totalCoolingBtu > 0 ? loadInputs.sensibleCoolingBtu / loadInputs.totalCoolingBtu : 0;
    
    setLatentCooling(latent);
    setShr(shrValue);

    // Clear existing cross-validation errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.sensibleCoolingBtu;
      delete newErrors.totalHeatingBtu;
      return newErrors;
    });

    // Add cross-validation for sensible cooling vs total cooling
    if (loadInputs.totalCoolingBtu > 0 && loadInputs.sensibleCoolingBtu > loadInputs.totalCoolingBtu) {
      setErrors(prev => ({
        ...prev,
        sensibleCoolingBtu: "Cannot exceed total cooling load"
      }));
    }

    // Add validation for sensible heat ratio
    if (loadInputs.totalCoolingBtu > 0 && (shrValue < 0.65 || shrValue > 1.0)) {
      setErrors(prev => ({
        ...prev,
        sensibleCoolingBtu: `Sensible heat ratio ${(shrValue * 100).toFixed(0)}% is outside normal range (65-100%)`
      }));
    }

    // Validate that at least one load is provided
    if (loadInputs.totalHeatingBtu === 0 && loadInputs.totalCoolingBtu === 0) {
      setErrors(prev => ({
        ...prev,
        totalHeatingBtu: "Enter either heating or cooling load"
      }));
    }
  }, [loadInputs.totalCoolingBtu, loadInputs.sensibleCoolingBtu, loadInputs.totalHeatingBtu]);

  const validateInput = (field: keyof LoadInputs, value: number): string => {
    const validationRules: Record<string, { min: number; max: number; name: string }> = {
      totalHeatingBtu: { min: 0, max: 500000, name: "Total Heating Load" },
      totalCoolingBtu: { min: 0, max: 500000, name: "Total Cooling Load" },
      sensibleCoolingBtu: { min: 0, max: 500000, name: "Sensible Cooling Load" },
      outdoorSummerDesignTemp: { min: -30, max: 150, name: "Outdoor Summer Design Temperature" },
      outdoorWinterDesignTemp: { min: -30, max: 150, name: "Outdoor Winter Design Temperature" },
      elevation: { min: -3000, max: 30000, name: "Elevation" },
      indoorHumidity: { min: 0, max: 100, name: "Indoor Humidity" },
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
    
    // Smart unit location auto-selection
    let newUnitLocationFilter = preferences.unitLocationFilter || [];
    
    if (checked) {
      // Auto-select unit location based on equipment type
      if (type === 'furnace' && !newUnitLocationFilter.includes('indoor')) {
        newUnitLocationFilter = [...newUnitLocationFilter, 'indoor'];
      } else if (type === 'ac' && !newUnitLocationFilter.includes('outdoor')) {
        newUnitLocationFilter = [...newUnitLocationFilter, 'outdoor'];
      } else if (type === 'heat_pump' && !newUnitLocationFilter.includes('split_system')) {
        newUnitLocationFilter = [...newUnitLocationFilter, 'split_system'];
      } else if (type === 'boiler' && !newUnitLocationFilter.includes('indoor')) {
        newUnitLocationFilter = [...newUnitLocationFilter, 'indoor'];
      } else if (type === 'furnace_ac_combo' && !newUnitLocationFilter.includes('split_system')) {
        newUnitLocationFilter = [...newUnitLocationFilter, 'split_system'];
      }
    } else {
      // If all equipment types are unchecked, reset to all unit locations
      if (newTypes.length === 0) {
        newUnitLocationFilter = ['indoor', 'outdoor', 'split_system'];
      }
    }
    
    onPreferencesChange({ 
      ...preferences, 
      equipmentTypes: newTypes,
      unitLocationFilter: newUnitLocationFilter.length > 0 ? newUnitLocationFilter : undefined
    });
  };

  const handleSizingPreferenceChange = (value: string) => {
    onPreferencesChange({ 
      ...preferences, 
      sizingPreference: value as 'size_to_heating' | 'size_to_cooling' 
    });
  };

  const handleDistributionTypeChange = (value: string) => {
    onPreferencesChange({
      ...preferences,
      distributionType: value === 'any' ? undefined : value as 'ducted' | 'ductless' | 'hydronic'
    });
  };

  const handleBrandFilterChange = (value: string) => {
    onPreferencesChange({
      ...preferences,
      brandFilter: value === 'any' ? undefined : [value]
    });
  };

  const handleUnitLocationFilterChange = (location: string, checked: boolean) => {
    const newLocationFilter = checked 
      ? [...(preferences.unitLocationFilter || []), location as any]
      : (preferences.unitLocationFilter || []).filter(l => l !== location);
    
    onPreferencesChange({
      ...preferences,
      unitLocationFilter: newLocationFilter.length > 0 ? newLocationFilter : undefined
    });
  };

  const handleStagingFilterChange = (staging: string, checked: boolean) => {
    const newStaging = checked 
      ? [...(preferences.stagingFilter || []), staging as any]
      : (preferences.stagingFilter || []).filter(s => s !== staging);
    
    onPreferencesChange({
      ...preferences,
      stagingFilter: newStaging.length > 0 ? newStaging : undefined
    });
  };

  const handleMinAfueChange = (value: string) => {
    const numValue = parseFloat(value) || undefined;
    onPreferencesChange({
      ...preferences,
      minAfue: numValue
    });
  };

  const handleMaxPriceChange = (value: string) => {
    const numValue = parseFloat(value) || undefined;
    onPreferencesChange({
      ...preferences,
      maxPrice: numValue
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

        {/* Advanced Load Inputs */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <h3 className="text-lg font-semibold text-carbon">Advanced Load Inputs</h3>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="summerTemp" className="text-sm font-medium text-carbon">
                  Summer Design (°F)
                </Label>
                <Input
                  id="summerTemp"
                  type="number"
                  placeholder="95"
                  min="-30"
                  max="150"
                  value={loadInputs.outdoorSummerDesignTemp || ""}
                  onChange={(e) => handleInputChange('outdoorSummerDesignTemp', e.target.value)}
                  className="mt-2"
                />
                {errors.outdoorSummerDesignTemp && (
                  <div className="mt-1 text-xs text-error-red">{errors.outdoorSummerDesignTemp}</div>
                )}
              </div>
              <div>
                <Label htmlFor="winterTemp" className="text-sm font-medium text-carbon">
                  Winter Design (°F)
                </Label>
                <Input
                  id="winterTemp"
                  type="number"
                  placeholder="10"
                  min="-30"
                  max="150"
                  value={loadInputs.outdoorWinterDesignTemp || ""}
                  onChange={(e) => handleInputChange('outdoorWinterDesignTemp', e.target.value)}
                  className="mt-2"
                />
                {errors.outdoorWinterDesignTemp && (
                  <div className="mt-1 text-xs text-error-red">{errors.outdoorWinterDesignTemp}</div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="elevation" className="text-sm font-medium text-carbon">
                  Elevation (ft)
                </Label>
                <Input
                  id="elevation"
                  type="number"
                  placeholder="1000"
                  min="-3000"
                  max="30000"
                  value={loadInputs.elevation || ""}
                  onChange={(e) => handleInputChange('elevation', e.target.value)}
                  className="mt-2"
                />
                {errors.elevation && (
                  <div className="mt-1 text-xs text-error-red">{errors.elevation}</div>
                )}
              </div>
              <div>
                <Label htmlFor="humidity" className="text-sm font-medium text-carbon">
                  Indoor Humidity (%)
                </Label>
                <Input
                  id="humidity"
                  type="number"
                  placeholder="50"
                  min="0"
                  max="100"
                  value={loadInputs.indoorHumidity || ""}
                  onChange={(e) => handleInputChange('indoorHumidity', e.target.value)}
                  className="mt-2"
                />
                {errors.indoorHumidity && (
                  <div className="mt-1 text-xs text-error-red">{errors.indoorHumidity}</div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Equipment Type Selector */}
        <div>
          <h3 className="text-lg font-semibold text-carbon mb-4">Equipment Types</h3>
          <div className="space-y-3">
            {[
              { id: 'furnace', label: 'Furnaces' },
              { id: 'ac', label: 'Air Conditioners' },
              { id: 'heat_pump', label: 'Heat Pumps' },
              { id: 'boiler', label: 'Boilers' },
              { id: 'furnace_ac_combo', label: 'Furnace + AC Combos' },
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

        {/* Equipment Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <h3 className="text-lg font-semibold text-carbon flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Equipment Filters</span>
              </h3>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Distribution Type */}
            <div>
              <Label className="text-sm font-medium text-carbon">Distribution Type</Label>
              <Select
                value={preferences.distributionType || ""}
                onValueChange={handleDistributionTypeChange}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any distribution type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any distribution type</SelectItem>
                  <SelectItem value="ducted">Ducted</SelectItem>
                  <SelectItem value="ductless">Ductless</SelectItem>
                  <SelectItem value="hydronic">Hydronic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div>
              <Label className="text-sm font-medium text-carbon">Brand Filter</Label>
              <Select
                value={preferences.brandFilter?.[0] || "any"}
                onValueChange={handleBrandFilterChange}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any brand</SelectItem>
                  <SelectItem value="Carrier">Carrier</SelectItem>
                  <SelectItem value="Trane">Trane</SelectItem>
                  <SelectItem value="Lennox">Lennox</SelectItem>
                  <SelectItem value="Rheem">Rheem</SelectItem>
                  <SelectItem value="Goodman">Goodman</SelectItem>
                  <SelectItem value="American Standard">American Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unit Location Filter */}
            <div>
              <Label className="text-sm font-medium text-carbon mb-3 block">Unit Location</Label>
              <div className="space-y-2">
                {[
                  { id: 'indoor', label: 'Indoor Units', description: 'Furnaces, boilers, indoor components' },
                  { id: 'outdoor', label: 'Outdoor Units', description: 'Air conditioners, outdoor components' },
                  { id: 'split_system', label: 'Split Systems', description: 'Heat pumps, combo systems' },
                ].map(({ id, label, description }) => (
                  <div key={id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`location-${id}`}
                      checked={preferences.unitLocationFilter?.includes(id as any) || false}
                      onCheckedChange={(checked) => handleUnitLocationFilterChange(id, checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`location-${id}`} className="text-sm font-medium text-carbon cursor-pointer">
                        {label}
                      </Label>
                      <div className="text-xs text-slate-2">{description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staging Filter */}
            <div>
              <Label className="text-sm font-medium text-carbon mb-3 block">Staging Types</Label>
              <div className="space-y-2">
                {[
                  { id: 'single_stage', label: 'Single Stage' },
                  { id: 'two_stage', label: 'Two Stage' },
                  { id: 'variable_speed', label: 'Variable Speed' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`staging-${id}`}
                      checked={preferences.stagingFilter?.includes(id as any) || false}
                      onCheckedChange={(checked) => handleStagingFilterChange(id, checked as boolean)}
                    />
                    <Label htmlFor={`staging-${id}`} className="text-sm font-medium text-carbon cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* AFUE Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAfue" className="text-sm font-medium text-carbon">
                  Min AFUE (%)
                </Label>
                <Input
                  id="minAfue"
                  type="number"
                  placeholder="80"
                  min="70"
                  max="98"
                  step="1"
                  value={preferences.minAfue ? Math.round(preferences.minAfue * 100).toString() : ""}
                  onChange={(e) => handleMinAfueChange(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-sm font-medium text-carbon">
                  Max Price ($)
                </Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="5000"
                  min="0"
                  step="100"
                  value={preferences.maxPrice || ""}
                  onChange={(e) => handleMaxPriceChange(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
