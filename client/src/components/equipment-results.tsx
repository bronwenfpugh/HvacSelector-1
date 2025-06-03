import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { AlertTriangle, CheckCircle, ThumbsUp, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import type { EquipmentRecommendation } from "@shared/schema";

interface EquipmentResultsProps {
  recommendations: EquipmentRecommendation[];
  isLoading: boolean;
}

export default function EquipmentResults({ recommendations, isLoading }: EquipmentResultsProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(() => {
    const stored = sessionStorage.getItem('showTechnicalDetails');
    return stored !== null ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    sessionStorage.setItem('showTechnicalDetails', JSON.stringify(showTechnicalDetails));
  }, [showTechnicalDetails]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="w-4 h-4" />;
      case 'acceptable':
        return <ThumbsUp className="w-4 h-4" />;
      case 'oversized':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-success-green/10 text-success-green';
      case 'acceptable':
        return 'bg-electric-purple/10 text-electric-purple';
      case 'oversized':
        return 'bg-warning-orange/10 text-warning-orange';
      default:
        return 'bg-slate-2/10 text-slate-2';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'Optimal Match';
      case 'acceptable':
        return 'Acceptable Match';
      case 'oversized':
        return 'Oversized';
      case 'undersized':
        return 'Undersized';
      default:
        return status;
    }
  };

  const getSizingColor = (percentage: number, status: string) => {
    if (status === 'optimal') return 'text-success-green';
    if (status === 'acceptable') return 'text-electric-purple';
    if (status === 'oversized') return 'text-warning-orange';
    return 'text-slate-2';
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-carbon">Equipment Recommendations</h2>
            <p className="text-slate-1 mt-1">Calculating recommendations...</p>
          </div>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-dust-2 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-carbon">Equipment Recommendations</h2>
            <p className="text-slate-1 mt-1">No calculations performed yet</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-slate-2 mb-4" />
          <h3 className="text-lg font-semibold text-carbon mb-2">Ready to Calculate</h3>
          <p className="text-slate-1 mb-6">Enter your Manual J loads and select equipment types to see recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-carbon">Equipment Recommendations</h2>
          <p className="text-slate-1 mt-1">Showing viable options sorted by size match quality</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-1">
            <span className="font-semibold">{recommendations.length}</span> matches found
          </div>
          <div className="flex items-center space-x-2">
            <Toggle
              pressed={showTechnicalDetails}
              onPressedChange={setShowTechnicalDetails}
              aria-label="Toggle technical details"
              className="text-sm"
            >
              <FileText className="w-4 h-4 mr-1" />
              Technical Details
            </Toggle>
          </div>
          <Select defaultValue="size-match">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="size-match">Sort by Size Match</SelectItem>
              <SelectItem value="price">Sort by Price</SelectItem>
              <SelectItem value="brand">Sort by Brand</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Equipment Results */}
      <div className="space-y-6">
        {recommendations.map((recommendation) => (
          <Card key={recommendation.equipment.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
            recommendation.sizingStatus === 'oversized' ? 'border-warning-orange/30' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <img
                    src={recommendation.equipment.imageUrl}
                    alt={`${recommendation.equipment.manufacturer} ${recommendation.equipment.model}`}
                    className="w-24 h-24 object-cover rounded-lg border border-dust-1"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-carbon">
                        {recommendation.equipment.model}
                      </h3>
                      <p className="text-sm text-slate-1">
                        {recommendation.equipment.manufacturer} - {
                          recommendation.equipment.equipmentType === 'heat_pump' ? 'Heat Pump' :
                          recommendation.equipment.equipmentType === 'ac' ? 'Air Conditioner' :
                          recommendation.equipment.equipmentType === 'furnace' ? 'Gas Furnace' :
                          'Equipment'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-carbon">
                        ${recommendation.equipment.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-1">Price</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-slate-1">Capacity</div>
                      {(() => {
                        // Check if there's an elevation derating warning
                        const deratingWarning = recommendation.warnings.find(warning => 
                          warning.includes("Derate heating capacity by") && warning.includes("due to elevation")
                        );

                        if (deratingWarning && (recommendation.equipment.equipmentType === 'furnace' || recommendation.equipment.equipmentType === 'furnace_ac_combo')) {
                          // Extract derating percentage from warning message
                          const percentMatch = deratingWarning.match(/Derate heating capacity by (\d+\.?\d*)% due to elevation/);
                          const deratingPercentage = percentMatch ? parseFloat(percentMatch[1]) : 0;

                          const nominalCapacity = recommendation.equipment.nominalBtu || 0;
                          const effectiveCapacity = Math.round(nominalCapacity * (1 - deratingPercentage / 100));

                          return (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-carbon">
                                Nominal: {nominalCapacity.toLocaleString()} BTU/hr
                              </div>
                              <div className="text-sm font-semibold text-warning-orange">
                                Effective: {effectiveCapacity.toLocaleString()} BTU/hr
                              </div>
                              <div className="text-xs text-slate-1">
                                (after elevation derating)
                              </div>
                            </div>
                          );
                        } else {
                          // Normal capacity display
                          return (
                            <div className="text-sm font-semibold text-carbon">
                              {recommendation.equipment.nominalTons ? 
                                `${recommendation.equipment.nominalTons} Tons` : 
                                `${(recommendation.equipment.nominalBtu || 0).toLocaleString()} BTU/hr`
                              }
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-1">
                        {recommendation.equipment.equipmentType === 'furnace' ? 'AFUE' : 'SEER'}
                      </div>
                      <div className="text-sm font-semibold text-carbon">
                        {recommendation.equipment.equipmentType === 'furnace' ? 
                          `${Math.round((recommendation.equipment.afue || 0) * 100)}%` :
                          recommendation.equipment.seer || 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-1">Staging</div>
                      <div className="text-sm font-semibold text-carbon">
                        {recommendation.equipment.staging === 'single_stage' ? 'Single Stage' :
                         recommendation.equipment.staging === 'two_stage' ? 'Two Stage' :
                         'Variable Speed'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-1">Size Match</div>
                      <div className={`text-sm font-semibold ${getSizingColor(recommendation.sizingPercentage, recommendation.sizingStatus)}`}>
                        {recommendation.sizingPercentage}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <Badge variant="secondary" className={`${getStatusColor(recommendation.sizingStatus)} border-0`}>
                      {getStatusIcon(recommendation.sizingStatus)}
                      <span className="ml-1">{getStatusLabel(recommendation.sizingStatus)}</span>
                    </Badge>
                    <span className="text-sm text-slate-1">
                      {recommendation.sizingStatus === 'optimal' ? 'Within optimal sizing range' :
                       recommendation.sizingStatus === 'acceptable' ? 'Acceptable sizing with considerations' :
                       recommendation.sizingStatus === 'oversized' ? `${recommendation.sizingPercentage}% oversized` :
                       'Size match details'}
                    </span>
                  </div>

                  {/* Technical Details Section */}
                  {showTechnicalDetails && (recommendation.instructions.length > 0 || recommendation.warnings.length > 0 || recommendation.backupHeatRequired || recommendation.recommendedCfm) && (
                    <div className={`p-3 rounded-lg ${
                      recommendation.warnings.length > 0 ? 
                      'bg-warning-orange/10 border border-warning-orange/20' : 
                      'bg-dust-3'
                    }`}>
                      {recommendation.warnings.length > 0 && (
                        <div className="flex items-start space-x-2 mb-2">
                          <AlertTriangle className="text-warning-orange mt-0.5 flex-shrink-0 w-4 h-4" />
                          <div>
                            <div className="text-sm font-medium text-carbon mb-2">
                              {recommendation.warnings.length > 1 ? 'Important Requirements:' : 'Important Requirement:'}
                            </div>
                            <ul className="text-sm text-slate-1 space-y-1">
                              {recommendation.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {recommendation.instructions.length > 0 && (
                        <div className={recommendation.warnings.length > 0 ? 'mt-3' : ''}>
                          <div className="text-sm font-medium text-carbon mb-2">Installation Notes:</div>
                          <ul className="text-sm text-slate-1 space-y-1">
                            {recommendation.instructions.map((instruction, index) => (
                              <li key={index}>• {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {recommendation.backupHeatRequired && (
                        <div className={recommendation.warnings.length > 0 || recommendation.instructions.length > 0 ? 'mt-3' : ''}>
                          <div className="text-sm font-medium text-carbon mb-1">Backup Heat Required:</div>
                          <div className="text-sm text-slate-1">
                            {recommendation.backupHeatRequired.toLocaleString()} BTU/hr
                          </div>
                        </div>
                      )}
                      {recommendation.recommendedCfm && (
                        <div className={recommendation.warnings.length > 0 || recommendation.instructions.length > 0 || recommendation.backupHeatRequired ? 'mt-3' : ''}>
                          <div className="text-sm font-medium text-carbon mb-1">Recommended Airflow:</div>
                          <div className="text-sm text-slate-1">
                            {recommendation.recommendedCfm.toLocaleString()} CFM
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Details Hidden Indicator */}
                  {!showTechnicalDetails && (recommendation.warnings.length > 0 || recommendation.instructions.length > 0) && (
                    <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                      <div className="text-sm text-slate-600 text-center">
                        {recommendation.warnings.length > 0 && `${recommendation.warnings.length} warning${recommendation.warnings.length > 1 ? 's' : ''}`}
                        {recommendation.warnings.length > 0 && recommendation.instructions.length > 0 && ' • '}
                        {recommendation.instructions.length > 0 && `${recommendation.instructions.length} installation note${recommendation.instructions.length > 1 ? 's' : ''}`}
                        {' hidden - toggle Technical Details to view'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}