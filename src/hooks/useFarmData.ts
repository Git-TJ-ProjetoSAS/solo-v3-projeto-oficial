import { useState, useEffect } from 'react';
import { Farm, SoilAnalysis, SeedCalculation, Input, FarmCost, Seed } from '@/types/farm';

const STORAGE_KEYS = {
  farms: 'agrotec_farms',
  soilAnalyses: 'agrotec_soil_analyses',
  seedCalculations: 'agrotec_seed_calculations',
  inputs: 'agrotec_inputs',
  farmCosts: 'agrotec_farm_costs',
  selectedFarmId: 'agrotec_selected_farm',
  seeds: 'agrotec_seeds',
  selectedSeedId: 'agrotec_selected_seed',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

export function useFarmData() {
  const [farms, setFarms] = useState<Farm[]>(() => loadFromStorage(STORAGE_KEYS.farms, []));
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(() => 
    loadFromStorage(STORAGE_KEYS.selectedFarmId, null)
  );
  const [soilAnalyses, setSoilAnalyses] = useState<SoilAnalysis[]>(() => 
    loadFromStorage(STORAGE_KEYS.soilAnalyses, [])
  );
  const [seedCalculations, setSeedCalculations] = useState<SeedCalculation[]>(() => 
    loadFromStorage(STORAGE_KEYS.seedCalculations, [])
  );
  const [inputs, setInputs] = useState<Input[]>(() => loadFromStorage(STORAGE_KEYS.inputs, []));
  const [farmCosts, setFarmCosts] = useState<FarmCost[]>(() => 
    loadFromStorage(STORAGE_KEYS.farmCosts, [])
  );
  const [seeds, setSeeds] = useState<Seed[]>(() => loadFromStorage(STORAGE_KEYS.seeds, []));
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(() => 
    loadFromStorage(STORAGE_KEYS.selectedSeedId, null)
  );

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.farms, farms);
  }, [farms]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.selectedFarmId, selectedFarmId);
  }, [selectedFarmId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.soilAnalyses, soilAnalyses);
  }, [soilAnalyses]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.seedCalculations, seedCalculations);
  }, [seedCalculations]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.inputs, inputs);
  }, [inputs]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.farmCosts, farmCosts);
  }, [farmCosts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.seeds, seeds);
  }, [seeds]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.selectedSeedId, selectedSeedId);
  }, [selectedSeedId]);

  const selectedFarm = farms.find(f => f.id === selectedFarmId) || null;
  const selectedSeed = seeds.find(s => s.id === selectedSeedId) || null;

  // Farm CRUD
  const addFarm = (name: string) => {
    const newFarm: Farm = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setFarms(prev => [...prev, newFarm]);
    if (!selectedFarmId) {
      setSelectedFarmId(newFarm.id);
    }
    return newFarm;
  };

  const deleteFarm = (id: string) => {
    setFarms(prev => prev.filter(f => f.id !== id));
    setSoilAnalyses(prev => prev.filter(s => s.farmId !== id));
    setSeedCalculations(prev => prev.filter(s => s.farmId !== id));
    setFarmCosts(prev => prev.filter(c => c.farmId !== id));
    if (selectedFarmId === id) {
      const remaining = farms.filter(f => f.id !== id);
      setSelectedFarmId(remaining[0]?.id || null);
    }
  };

  // Soil Analysis
  const addSoilAnalysis = (analysis: Omit<SoilAnalysis, 'id' | 'createdAt'>) => {
    const newAnalysis: SoilAnalysis = {
      ...analysis,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setSoilAnalyses(prev => [...prev, newAnalysis]);
    return newAnalysis;
  };

  const deleteSoilAnalysis = (id: string) => {
    setSoilAnalyses(prev => prev.filter(s => s.id !== id));
  };

  const updateSoilAnalysis = (id: string, data: Omit<SoilAnalysis, 'id' | 'createdAt'>) => {
    setSoilAnalyses(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  // Seed Calculation
  const addSeedCalculation = (calc: Omit<SeedCalculation, 'id' | 'createdAt'>) => {
    const newCalc: SeedCalculation = {
      ...calc,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setSeedCalculations(prev => [...prev, newCalc]);
    return newCalc;
  };

  const deleteSeedCalculation = (id: string) => {
    setSeedCalculations(prev => prev.filter(c => c.id !== id));
  };

  // Inputs
  const addInput = (input: Omit<Input, 'id'>) => {
    const newInput: Input = {
      ...input,
      id: crypto.randomUUID(),
    };
    setInputs(prev => [...prev, newInput]);
    return newInput;
  };

  const deleteInput = (id: string) => {
    setInputs(prev => prev.filter(i => i.id !== id));
    setFarmCosts(prev => prev.filter(c => c.inputId !== id));
  };

  // Farm Costs
  const addFarmCost = (cost: Omit<FarmCost, 'id'>) => {
    const newCost: FarmCost = {
      ...cost,
      id: crypto.randomUUID(),
    };
    setFarmCosts(prev => [...prev, newCost]);
    return newCost;
  };

  const deleteFarmCost = (id: string) => {
    setFarmCosts(prev => prev.filter(c => c.id !== id));
  };

  // Seeds CRUD
  const addSeed = (seed: Omit<Seed, 'id'>) => {
    const newSeed: Seed = {
      ...seed,
      id: crypto.randomUUID(),
    };
    setSeeds(prev => [...prev, newSeed]);
    return newSeed;
  };

  const deleteSeed = (id: string) => {
    setSeeds(prev => prev.filter(s => s.id !== id));
    if (selectedSeedId === id) setSelectedSeedId(null);
  };

  const updateSeed = (id: string, updates: Partial<Omit<Seed, 'id'>>) => {
    setSeeds(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Get data for selected farm
  const getSelectedFarmSoilAnalyses = () => 
    soilAnalyses.filter(s => s.farmId === selectedFarmId);

  const getSelectedFarmSeedCalculations = () => 
    seedCalculations.filter(s => s.farmId === selectedFarmId);

  const getSelectedFarmCosts = () => 
    farmCosts.filter(c => c.farmId === selectedFarmId);

  // Calculate total cost per hectare for a farm
  const getTotalCostPerHectare = (farmId: string) => {
    const costs = farmCosts.filter(c => c.farmId === farmId);
    if (costs.length === 0) return 0;
    return costs.reduce((sum, c) => sum + c.costPerHectare, 0);
  };

  return {
    farms,
    selectedFarm,
    selectedFarmId,
    setSelectedFarmId,
    addFarm,
    deleteFarm,
    soilAnalyses,
    addSoilAnalysis,
    deleteSoilAnalysis,
    updateSoilAnalysis,
    getSelectedFarmSoilAnalyses,
    seedCalculations,
    addSeedCalculation,
    deleteSeedCalculation,
    getSelectedFarmSeedCalculations,
    inputs,
    addInput,
    deleteInput,
    farmCosts,
    addFarmCost,
    deleteFarmCost,
    getSelectedFarmCosts,
    getTotalCostPerHectare,
    seeds,
    selectedSeed,
    selectedSeedId,
    setSelectedSeedId,
    addSeed,
    deleteSeed,
    updateSeed,
  };
}
