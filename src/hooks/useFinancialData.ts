import { useState, useEffect } from 'react';
import { TractorOperation, TarpaulinCost, IrrigationCost, LaborCost } from '@/types/financial';

const STORAGE_KEYS = {
  tractorOperations: 'agrotec_tractor_operations',
  tarpaulinCosts: 'agrotec_tarpaulin_costs',
  irrigationCosts: 'agrotec_irrigation_costs',
  laborCosts: 'agrotec_labor_costs',
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

export function useFinancialData(selectedFarmId: string | null) {
  const [tractorOperations, setTractorOperations] = useState<TractorOperation[]>(() => 
    loadFromStorage(STORAGE_KEYS.tractorOperations, [])
  );
  const [tarpaulinCosts, setTarpaulinCosts] = useState<TarpaulinCost[]>(() => 
    loadFromStorage(STORAGE_KEYS.tarpaulinCosts, [])
  );
  const [irrigationCosts, setIrrigationCosts] = useState<IrrigationCost[]>(() => 
    loadFromStorage(STORAGE_KEYS.irrigationCosts, [])
  );
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>(() => 
    loadFromStorage(STORAGE_KEYS.laborCosts, [])
  );

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.tractorOperations, tractorOperations);
  }, [tractorOperations]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.tarpaulinCosts, tarpaulinCosts);
  }, [tarpaulinCosts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.irrigationCosts, irrigationCosts);
  }, [irrigationCosts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.laborCosts, laborCosts);
  }, [laborCosts]);

  // Tractor Operations CRUD
  const addTractorOperation = (op: Omit<TractorOperation, 'id' | 'createdAt' | 'totalCost'>) => {
    const newOp: TractorOperation = {
      ...op,
      id: crypto.randomUUID(),
      totalCost: op.costPerHectare * op.hectares,
      createdAt: new Date(),
    };
    setTractorOperations(prev => [...prev, newOp]);
    return newOp;
  };

  const deleteTractorOperation = (id: string) => {
    setTractorOperations(prev => prev.filter(o => o.id !== id));
  };

  const getFarmTractorOperations = () => 
    tractorOperations.filter(o => o.farmId === selectedFarmId);

  // Tarpaulin Costs CRUD
  const addTarpaulinCost = (cost: Omit<TarpaulinCost, 'id' | 'createdAt' | 'totalCost'>) => {
    const newCost: TarpaulinCost = {
      ...cost,
      id: crypto.randomUUID(),
      totalCost: cost.squareMeters * cost.pricePerSquareMeter,
      createdAt: new Date(),
    };
    setTarpaulinCosts(prev => [...prev, newCost]);
    return newCost;
  };

  const deleteTarpaulinCost = (id: string) => {
    setTarpaulinCosts(prev => prev.filter(c => c.id !== id));
  };

  const getFarmTarpaulinCosts = () => 
    tarpaulinCosts.filter(c => c.farmId === selectedFarmId);

  // Irrigation Costs CRUD
  const addIrrigationCost = (cost: Omit<IrrigationCost, 'id' | 'createdAt' | 'totalCost'>) => {
    const newCost: IrrigationCost = {
      ...cost,
      id: crypto.randomUUID(),
      totalCost: cost.costPerHectare * cost.hectares,
      createdAt: new Date(),
    };
    setIrrigationCosts(prev => [...prev, newCost]);
    return newCost;
  };

  const deleteIrrigationCost = (id: string) => {
    setIrrigationCosts(prev => prev.filter(c => c.id !== id));
  };

  const getFarmIrrigationCosts = () => 
    irrigationCosts.filter(c => c.farmId === selectedFarmId);

  // Labor Costs CRUD
  const addLaborCost = (cost: Omit<LaborCost, 'id' | 'createdAt' | 'totalCost'>) => {
    const newCost: LaborCost = {
      ...cost,
      id: crypto.randomUUID(),
      totalCost: cost.quantity * cost.unitCost,
      createdAt: new Date(),
    };
    setLaborCosts(prev => [...prev, newCost]);
    return newCost;
  };

  const deleteLaborCost = (id: string) => {
    setLaborCosts(prev => prev.filter(c => c.id !== id));
  };

  const getFarmLaborCosts = () => 
    laborCosts.filter(c => c.farmId === selectedFarmId);

  // Totals
  const getTotalTractorCost = () => 
    getFarmTractorOperations().reduce((sum, o) => sum + o.totalCost, 0);

  const getTotalTarpaulinCost = () => 
    getFarmTarpaulinCosts().reduce((sum, c) => sum + c.totalCost, 0);

  const getTotalIrrigationCost = () => 
    getFarmIrrigationCosts().reduce((sum, c) => sum + c.totalCost, 0);

  const getTotalLaborCost = () => 
    getFarmLaborCosts().reduce((sum, c) => sum + c.totalCost, 0);

  const getGrandTotal = () => 
    getTotalTractorCost() + getTotalTarpaulinCost() + getTotalIrrigationCost() + getTotalLaborCost();

  return {
    // Tractor
    tractorOperations: getFarmTractorOperations(),
    addTractorOperation,
    deleteTractorOperation,
    getTotalTractorCost,
    // Tarpaulin
    tarpaulinCosts: getFarmTarpaulinCosts(),
    addTarpaulinCost,
    deleteTarpaulinCost,
    getTotalTarpaulinCost,
    // Irrigation
    irrigationCosts: getFarmIrrigationCosts(),
    addIrrigationCost,
    deleteIrrigationCost,
    getTotalIrrigationCost,
    // Labor
    laborCosts: getFarmLaborCosts(),
    addLaborCost,
    deleteLaborCost,
    getTotalLaborCost,
    // Grand total
    getGrandTotal,
  };
}
