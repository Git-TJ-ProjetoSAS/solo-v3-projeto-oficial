export interface TractorOperation {
  id: string;
  farmId: string;
  name: string;
  costPerHectare: number;
  hectares: number;
  totalCost: number;
  createdAt: Date;
}

export interface TarpaulinCost {
  id: string;
  farmId: string;
  description: string;
  squareMeters: number;
  pricePerSquareMeter: number;
  totalCost: number;
  createdAt: Date;
}

export interface IrrigationCost {
  id: string;
  farmId: string;
  description: string;
  costPerHectare: number;
  hectares: number;
  totalCost: number;
  createdAt: Date;
}

export interface LaborCost {
  id: string;
  farmId: string;
  description: string;
  type: 'fixed' | 'daily';
  quantity: number; // dias ou meses
  unitCost: number; // valor da diária ou salário
  totalCost: number;
  createdAt: Date;
}
