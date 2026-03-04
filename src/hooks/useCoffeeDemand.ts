import { useMemo } from 'react';
import { findDoseK2O } from '@/data/coffeePlantingReference';
import { EXTRACTION_FACTORS, calcAdultNDemand, calcAdultK2ODemand, getAdultP2O5, getYear1P2O5, calcStandFactor } from '@/lib/coffeeRecommendationEngine';

export interface CoffeeDemand {
  /** kg/ha values */
  n: number;
  p: number;
  k: number;
  s: number;
}

export interface CoffeeDemandOverrides {
  n: { min: number; max: number };
  p: { min: number; max: number };
  k: { min: number; max: number };
  s: { min: number; max: number };
}

interface UseCoffeeDemandParams {
  isFirstYear: boolean;
  sacasPerHa: number;
  plantsPerHa: number;
  coffeeType: string;
  soilP: number;
  soilK: number;
}

/**
 * Single source of truth for coffee nutrient demand (kg/ha).
 * Used by both the fertigation step (NutrientComparisonTable) and the report (nutrientBalance).
 */
export function useCoffeeDemand({ isFirstYear, sacasPerHa, plantsPerHa, coffeeType, soilP, soilK }: UseCoffeeDemandParams) {
  const demand = useMemo((): CoffeeDemand => {
    if (isFirstYear && plantsPerHa > 0) {
      const metaN = coffeeType === 'conilon' ? 60 : 40;
      return {
        n: (metaN * plantsPerHa) / 1000,
        p: (getYear1P2O5(soilP) * plantsPerHa) / 1000,
        k: (findDoseK2O(soilK) * plantsPerHa) / 1000,
        s: (10 * plantsPerHa) / 1000,
      };
    }
    const sf = calcStandFactor(plantsPerHa, coffeeType);
    return {
      n: calcAdultNDemand(sacasPerHa) * sf,
      p: getAdultP2O5(soilP) * sf,
      k: calcAdultK2ODemand(sacasPerHa, soilK) * sf,
      s: sacasPerHa * EXTRACTION_FACTORS.s * sf,
    };
  }, [isFirstYear, sacasPerHa, plantsPerHa, coffeeType, soilP, soilK]);

  const demandOverrides = useMemo((): CoffeeDemandOverrides => ({
    n: { min: demand.n * 0.8, max: demand.n },
    p: { min: demand.p * 0.8, max: demand.p },
    k: { min: demand.k * 0.8, max: demand.k },
    s: { min: demand.s * 0.8, max: demand.s },
  }), [demand]);

  return { demand, demandOverrides };
}
