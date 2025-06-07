
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useState, createElement } from "react";
import { Badge } from "@/components/ui/badge";
import type { ValidationSummary } from "@shared/schema";

interface ValidationSummaryProps {
  validationSummary: ValidationSummary;
}

export default function ValidationSummaryComponent({ validationSummary }: ValidationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!validationSummary || validationSummary.totalEquipment === 0) {
    return null;
  }

  const { totalEquipment, includedEquipment, excludedEquipment, errors } = validationSummary;
  
  // Group errors by severity
  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const warningErrors = errors.filter(e => e.severity === 'warning');
  const infoErrors = errors.filter(e => e.severity === 'info');

  const hasErrors = errors.length > 0;
  const hasIssues = excludedEquipment > 0 || hasErrors;

  // Badge content and styling
  const badgeText = hasIssues 
    ? `${includedEquipment}/${totalEquipment}`
    : `${totalEquipment}`;
  
  const badgeIcon = hasIssues ? "⚠" : "✓";
  const badgeVariant = hasIssues ? "destructive" : "secondary";
  const badgeClasses = hasIssues 
    ? "bg-warning-orange/10 text-warning-orange border-warning-orange/20 hover:bg-warning-orange/20" 
    : "bg-success-green/10 text-success-green border-success-green/20 hover:bg-success-green/20";

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-error-red" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning-orange" />;
      case 'info':
        return <Info className="h-4 w-4 text-slate-1" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-red';
      case 'warning':
        return 'text-warning-orange';
      case 'info':
        return 'text-slate-1';
      default:
        return 'text-slate-1';
    }
  };

  // Collapsed badge view
  if (!isExpanded) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsExpanded(true)}
          className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${badgeClasses}`}
          title="Equipment validation details"
        >
          <span className="text-sm">{badgeIcon}</span>
          <span>{badgeText}</span>
          <span className="text-xs opacity-70">validation</span>
        </button>
      </div>
    );
  }

  // Expanded detailed view
  return (
    <div className="bg-dust-3 border border-dust-1 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 text-warning-orange" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success-green" />
          )}
          <h3 className="text-headline-5 font-semibold text-carbon">
            🔧 Equipment Processing Summary (Developer Mode)
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-electric-purple hover:text-electric-purple/80 text-button-normal font-medium"
        >
          Collapse
        </button>
      </div>

      <div className="text-description-regular text-slate-1 mb-3">
        <div className="flex items-center space-x-4">
          <span>
            <span className="font-medium text-carbon">{includedEquipment}</span> of{' '}
            <span className="font-medium text-carbon">{totalEquipment}</span> equipment items processed
          </span>
          {!hasErrors && (
            <span className="flex items-center space-x-1 text-success-green">
              <span className="w-2 h-2 bg-success-green rounded-full"></span>
              <span className="text-description-regular">All validated successfully</span>
            </span>
          )}
        </div>
        {excludedEquipment > 0 && (
          <div className="mt-1">
            <span className="text-warning-orange font-medium">
              {excludedEquipment} items excluded due to validation issues
            </span>
          </div>
        )}
      </div>

      {/* Summary counts - only show if there are errors */}
      {hasErrors && (
        <div className="flex flex-wrap gap-4 mb-3">
          {criticalErrors.length > 0 && (
            <div className="flex items-center space-x-1">
              <XCircle className="h-4 w-4 text-error-red" />
              <span className="text-description-regular text-error-red">
                {criticalErrors.length} critical issue{criticalErrors.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {warningErrors.length > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4 text-warning-orange" />
              <span className="text-description-regular text-warning-orange">
                {warningErrors.length} warning{warningErrors.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {infoErrors.length > 0 && (
            <div className="flex items-center space-x-1">
              <Info className="h-4 w-4 text-slate-1" />
              <span className="text-description-regular text-slate-1">
                {infoErrors.length} info note{infoErrors.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Detailed error list */}
      {hasErrors && (
        <div className="border-t border-dust-1 pt-3">
          <div className="space-y-3">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded border border-dust-1">
                {getSeverityIcon(error.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-description-regular font-medium text-carbon">
                      {error.manufacturer} {error.model}
                    </span>
                    <span className={`text-description-regular ${getSeverityColor(error.severity)}`}>
                      ({error.severity})
                    </span>
                  </div>
                  <p className="text-description-regular text-slate-1 mb-1">
                    {error.message}
                  </p>
                  {error.technicalDetails && (
                    <p className="text-description-regular text-slate-2 text-xs">
                      Technical: {error.technicalDetails}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
