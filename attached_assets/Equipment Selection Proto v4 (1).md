# Equipment Selection PRD

## Overview 
Create a webapp for residential HVAC contractors that matches users' ServiceTitan pricebook equipment to the home's Manual J load using equipment nominal output. The app prioritizes speed and simplicity while providing precise, reliable equipment recommendations with clear guidance.

**Key Success Metrics:**
- Equipment selection completed in under 2 minutes
- Clear guidance provided for all recommendations
- Handles typical pricebooks of 50-500 equipment items efficiently

## User Stories
- As a busy contractor, I want to quickly enter my Manual J loads and see all viable equipment (including a realistic photo for each piece of equipment) from my ServiceTitan pricebook in under 2 minutes
- As a contractor with basic HVAC knowledge, I want clear guidance on why each piece of equipment is recommended and any special considerations
- As a contractor, I want to see all viable options (not just "best" picks) so I can make the final decision based on price, availability, and customer preferences

## Data Model

### Equipment Data Structure
```typescript
interface Equipment {
  id: string;
  manufacturer: string;
  model: string;
  price: number;
  isActive: boolean;
  equipmentType: 'furnace' | 'ac' | 'heat_pump' | 'boiler' | 'furnace_ac_combo';
  distributionType: 'ducted' | 'ductless' | 'hydronic';
  staging: 'single_stage' | 'two_stage' | 'variable_speed';
  unitLocation: 'indoor' | 'outdoor' | 'split_system';
  systemFunction: 'heating' | 'cooling' | 'heating_cooling';
  
  // Capacity fields (all in BTU/hr)
  nominalTons?: number; // For ACs and heat pumps only
  nominalBtu?: number; // For furnaces and boilers only
  heatingCapacityBtu?: number;
  coolingCapacityBtu?: number;
  latentCoolingBtu?: number;
  
  // Efficiency ratings
  afue?: number; // Furnaces and boilers (decimal, e.g., 0.95 for 95%)
  seer?: number; // ACs and heat pumps
  hspf?: number; // Heat pumps
  
  // Physical specifications
  cabinetWidth?: number; // inches
  cabinetHeight?: number; // inches
  cabinetDepth?: number; // inches
  
  // Image (placeholder for now)
  imageUrl: string; // Will use placeholder images
}
```

### Load Calculation Input Structure
```typescript
interface LoadInputs {
  // Phase 1 - Core inputs
  totalHeatingBtu: number;
  totalCoolingBtu: number;
  sensibleCoolingBtu: number;
  
  // Phase 2 - Advanced inputs
  outdoorSummerDesignTemp?: number; // °F
  outdoorWinterDesignTemp?: number; // °F
  elevation?: number; // feet above sea level
  indoorHumidity?: number; // % RH
  
  // Calculated fields
  latentCoolingBtu: number; // totalCoolingBtu - sensibleCoolingBtu
  sensibleHeatRatio: number; // sensibleCoolingBtu / totalCoolingBtu
}
```

### User Selection Preferences
```typescript
interface UserPreferences {
  equipmentTypes: Array<'furnace' | 'ac' | 'heat_pump' | 'boiler' | 'furnace_ac_combo'>;
  distributionType?: 'ducted' | 'ductless' | 'hydronic';
  sizingPreference?: 'size_to_heating' | 'size_to_cooling'; // For heat pumps when heating > cooling
  brandFilter?: string[];
  stagingFilter?: Array<'single_stage' | 'two_stage' | 'variable_speed'>;
  minAfue?: number;
  maxPrice?: number;
}
```

### Equipment Recommendation Result
```typescript
interface EquipmentRecommendation {
  equipment: Equipment;
  sizingStatus: 'optimal' | 'acceptable' | 'oversized' | 'undersized';
  sizingPercentage: number; // e.g., 110 means 110% of load
  warnings: string[];
  instructions: string[];
  backupHeatRequired?: number; // kW, for heat pumps
  recommendedCfm?: number; // For ducted systems
}
```

### Validation Rules
```typescript
interface ValidationRules {
  totalHeatingBtu: { min: 0, max: 500000 };
  totalCoolingBtu: { min: 0, max: 500000 };
  sensibleCoolingBtu: { min: 0, max: 500000 };
  outdoorSummerDesignTemp: { min: -30, max: 150 };
  outdoorWinterDesignTemp: { min: -30, max: 150 };
  elevation: { min: -3000, max: 30000 };
  sensibleHeatRatio: { min: 0, max: 1 };
}
```

### Mock Data Structure
Create mock equipment data with realistic capacity ranges:
- **Furnaces**: 40,000 - 120,000 BTU/hr
- **Air Conditioners**: 1.5 - 5 tons (18,000 - 60,000 BTU/hr)
- **Heat Pumps**: 1.5 - 5 tons (18,000 - 60,000 BTU/hr)
- **Boilers**: 50,000 - 150,000 BTU/hr
- **Combo Systems**: Match furnace + AC pairings

Include major brands: Carrier, Trane, Lennox, Rheem, Goodman, American Standard

## Implementation Phases 

### Phase 1: Core Equipment Matching (MVP)
**Goal: Get contractors from load input to equipment list in 60 seconds**

**Features:**
- Simple load input form (Total heating BTU, Total cooling BTU, Sensible cooling BTU; app infers latent cooling BTU and sensible heat ratio)
- Basic equipment filtering by nominal capacity
- Clear equipment recommendations with sizing guidance
- Mock ServiceTitan pricebook data for development
- Real-time calculation engine with instant results

**Equipment Types Supported:**
- Furnaces (heating only)
- Air conditioners (cooling only) 
- Heat pumps (heating & cooling)

**Technical Requirements:**
- Form validation with immediate feedback
- Equipment filtering algorithms optimized for real-time performance
- Responsive design for mobile and desktop
- Error handling for edge cases (no matches found, invalid inputs)

### Phase 2: Advanced Filtering & Guidance
**Goal: Add precision filters and comprehensive guidance**

**Features:**
- Additional load inputs (design temperatures, elevation, humidity)
- Equipment filters (brand, staging, distribution type, AFUE, cabinet size, option to size to heating or cooling load)
- Advanced sizing guidance and warnings
- Mock ServiceTitan pricebook data (expanded dataset)
- Support for boilers and combination systems

### Phase 3: Enhanced User Experience
**Goal: Polish and optimize for daily use**

**Features:**
- Replace mock data with actual ServiceTitan pricebook data (CSV upload capability)
- Performance optimizations for large datasets
- Enhanced equipment imagery and specifications

## Sizing Logic Implementation

### Phase 1 Sizing Logic:

**Furnaces:**
- List furnaces with 'actual output capacity' within 100-140% of heating load (optimal sizing)
- Also show furnaces with 'actual output capacity' within 140-200% of heating load with disclaimer: "This furnace is {percentage}% oversized. Use only if the AC system requires more blower power to accommodate the cooling load."
- Calculate 'actual output capacity' as: `heatingCapacityBtu * afue`

**Air Conditioners:**
- Use same rules as heat pump sized to cooling (below) except remove "backup heat needed" instruction

**Heat Pumps - Complex Decision Tree:**

1. **When heating load > cooling load AND SHR < 0.95 AND user selects "size to cooling load":**
   - Single stage: If total cooling ≤ 24,000 BTU, list equipment within 90-120% of (total cool load/12,000); if > 24,000 BTU, list within 90-115%
   - Two stage: List equipment within 90-125% of (total cool load/12,000)
   - Variable speed: List equipment within 90-130% of (total cool load/12,000)
   - Add instruction: "Be sure to add backup heat. {X} kW of backup heat are required." (Calculate as: (totalHeatingBtu - heatingCapacityBtu) / 3412)
   - Add instruction: "Use OEM data to verify the system has {latentCoolingBtu} BTU min latent capacity."

2. **When heating load > cooling load AND SHR < 0.95 AND user selects "size to heating load":**
   - List heat pump equipment within 100-150% of (heating load/12,000)
   - Add instruction: "A system sized for heating will be oversized for cooling and struggle to remove moisture. Add a standalone dehumidifier and use OEM data to verify that the system turns down to <80% of total cooling load."

3. **When heating load > cooling load AND SHR > 0.95:**
   - List heat pump equipment within 100-150% of (heating load/12,000)
   - Add instruction: "Sizing the system to heating will oversize it for cooling. For optimal comfort and to avoid wear & tear on the system, use performance data to verify that it turns down to <80% of total cooling load."

4. **When heating load < cooling load:**
   - Use same rules as "heat pump sized to cooling" above, except remove "backup heat needed" instruction

### Phase 2 Advanced Logic:

**Distribution Type Logic:**
- If equipment type = "furnace" or "furnace + AC": automatically set distribution = "ducted"
- If equipment type = "boiler": automatically set distribution = "hydronic"  
- If equipment type = "AC" or "heat pump": prompt user to select distribution type

**System Type Auto-Detection:**
- Furnace/Boiler → "heating"
- Furnace + AC → "heating & cooling"
- AC → "cooling"
- Heat pump → "heating & cooling"

**Advanced Instructions:**
- **Ducted systems:** "Remember to check whether the fan is powerful enough (static pressure) to move the air through the duct system. If not, consider modifying ductwork, increasing return size, adjusting airflow, or selecting a smaller system size."

- **CFM Verification for ducted cooling:** "Verify that the existing duct system is capable of handling at least {X} CFM."
  - Calculate recommended CFM: (closest standard tonnage > (total cool load/12,000)) × CFM/ton
  - Standard tonnages: 1.5, 2, 2.5, 3, 4, 5 tons
  - CFM/ton rates: SHR < 0.85 = 350 CFM/ton; SHR 0.85-0.95 = 400 CFM/ton; SHR > 0.95 = 450 CFM/ton

- **High elevation (>1,000 ft) with furnaces:** "Cooling and fossil fuel heating capacity will decrease (about 2–4% reduction in capacity per 1,000 feet above sea level)."

- **High outdoor temps (>95°F) for cooling:** "High outdoor temperatures affect system capacity. Verify capacity for your area using performance data."

- **Dry climates (SHR > 0.95) for cooling:** "Dry climates affect system capacity. Verify capacity for your area using performance data."

- **Heat pumps in mild climates (outdoor winter DB > 30°F):** "Heat pumps lose capacity as outdoor temps drop. Use a cold climate heat pump and make sure that the system will meet the heating load at your outdoor winter design temp. (We recommend using a balance point chart.)"

## Technical Specifications

### Performance Requirements
- Initial page load: < 2 seconds
- Equipment filtering response: < 500ms
- Form validation feedback: Immediate (< 100ms)
- Handle up to 500 equipment items efficiently

### Error Handling
- **No matches found:** Display "No matches found" with clear messaging
- **Invalid inputs:** Show field-specific validation errors with helpful guidance
- **Calculation errors:** Graceful fallbacks with user notification

### Responsive Design Requirements
- Tablet optimization for field use
- Desktop support for office environments
- Touch-friendly controls for mobile devices

### Data Management
- Real-time calculations (no pre-computation)
- Client-side filtering for performance
- Efficient equipment sorting by size match quality
- Single-session tool (no data persistence required)

## Design System
[Design system section remains unchanged from original PRD]

### Color Palette
- **Primary Colors:**
  - Carbon: #101010 (primary text, high contrast elements)
  - Slate 1: #606060 (secondary text)
  - Slate 2: #757575 (tertiary text)
  - Dust 1: #EAEAEA (light backgrounds, dividers)
  - Dust 2: #F0F0F0 (subtle backgrounds)
  - Dust 3: #F6F6F6 (card backgrounds, input fields)
  - White: #FFFFFF (main background, content areas)

- **Accent Colors:**
  - Electric Purple: #683F4 (primary brand color, CTAs)
  - Radiant Orange: #F7685A (warnings, alerts)

- **Status Colors:**
  - Warning Orange: #FF8C80 (warning states)
  - Success Green: #00CD42 (success states, available reports)
  - Error Red: #E84456 (error states, destructive actions)

- **Story Editor Colors (for data visualization):**
  - Default Purple: #8B69C3 (primary charts/graphs)
  - Default Slate: #92AC97 (secondary data)
  - Variant Coral: #F18777 (highlighting, important data points)
  - Variant Teal: #709C91 (supplementary data)
  - Variant Magenta: #D279C0 (accent data)
  - Variant Gold: #DFC470 (special indicators)

### Typography
- **Font Family:** Archivo (primary font for all text)

**Hierarchy:**
- Headline 1: SemiBold 32px/35px (main page titles)
- Headline 2: SemiBold 24px/28px (section headers)
- Headline 3: SemiBold 22px/25px (subsection headers)
- Headline 4: SemiBold 20px/25px (card titles)
- Headline 5: SemiBold 18px/20px (component headers)
- Headline 6: SemiBold 16px/20px (small headers)

**Body Text:**
- Button Large: SemiBold 15px/16px (primary CTAs)
- Button Normal: Medium 15px/16px (secondary buttons)
- Button Small: Medium 13px/15px (tertiary buttons)
- Form Entry: Regular 15px/20px (input fields, form labels)
- Description Large: Light 15px/20px (help text, descriptions)
- Description Regular: Regular 13px/15px (body text)
- Description Light: Light 13px/15px (secondary body text)

**Micro Text:**
- Title Small: Regular/Light 13px/15px (labels, captions)
- Title Micro: SemiBold/Regular/Light 10px/12px (tags, status indicators)
- Status: Roboto Mono Medium 11.5px/15px (technical data, BTU values)

### Component System
**Button Hierarchy:**
- Primary: Electric Purple background, white text (main actions like "Filter Equipment", "Calculate Load")
- Primary Outline: Electric Purple border, Electric Purple text (secondary actions)
- Secondary: Carbon background, white text (standard actions)
- Tertiary: Dust background, Carbon text (minimal actions)
- Destructive: Error Red background, white text (delete, clear actions)

**Button Sizes:**
- Large: Higher padding, 15px SemiBold text (primary page actions)
- Normal: Standard padding, 15px Medium text (common actions)
- Small: Compact padding, 13px Medium text (inline actions, tables)

**Input Components:**
- Form fields use Dust 3 backgrounds with Carbon text
- Labels use Description Regular styling
- Error states show Error Red borders and text
- Success states show Success Green borders
- Focus states use Electric Purple borders

**Card Components:**
- Background: White with subtle Dust 1 borders
- Headers use Headline 4-6 depending on importance
- Content uses Description Regular for body text
- Actions placed in bottom-right or header-right areas

**Navigation Elements:**
- Primary navigation uses Carbon text on White backgrounds
- Active states use Electric Purple accents
- Hover states use Dust 2 backgrounds
- Icons from the provided icon set (construction, HVAC-related symbols)

### Spacing System
**Base Unit:** 4px grid system

**Common Spacing:**
- 4px: Micro spacing (icon padding, tight elements)
- 8px: Small spacing (button padding, input padding)
- 16px: Medium spacing (card padding, section gaps)
- 24px: Large spacing (component separation)
- 32px: XL spacing (major section breaks)
- 48px: XXL spacing (page-level separation)

### Layout Guidelines
**Grid System:**
- 12-column grid for main content areas
- 16px gutters between columns
- Maximum content width: 1200px
- Responsive breakpoints: Mobile (320px+), Tablet (768px+), Desktop (1024px+)

**Content Organization:**
- Equipment filter controls in left sidebar or top panel
- Main equipment results in center content area
- Load calculation inputs in prominent top section
- Use cards for individual equipment items
- Implement clear visual hierarchy for BTU/tonnage values

**Interactive States:**
- Hover: Dust 2 backgrounds, Electric Purple accents
- Active: Electric Purple backgrounds for selections
- Disabled: Dust colors with reduced opacity
- Loading: Use skeleton screens with Dust 3 backgrounds

## Implementation Notes for Development

### Key Algorithms to Implement
1. **Equipment Size Matching Algorithm** - Core business logic for determining optimal/acceptable/oversized equipment
2. **Tonnage Calculation Engine** - Convert BTU loads to tonnage equivalents for equipment matching
3. **Real-time Filtering System** - Efficient client-side filtering with multiple criteria
4. **Validation Engine** - Comprehensive input validation with user-friendly error messages

### Priority Features for MVP
1. Load input form with real-time validation
2. Equipment database with mock data (50-100 realistic items)
3. Core sizing logic for furnaces, ACs, and heat pumps
4. Equipment results display with sorting by size match
5. Basic responsive design

### Development Considerations
- Use placeholder images for equipment (generic HVAC unit images)
- Implement client-side calculations for instant response
- Structure code to easily accommodate Phase 2 and 3 features
- Ensure robust error handling for production user testing
- Optimize for mobile-first usage patterns
