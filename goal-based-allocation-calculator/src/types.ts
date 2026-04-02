export type Horizon = 'H1' | 'H2' | 'H3';

export interface CashFlowItem {
  id: string;
  type: 'income' | 'expense' | 'goal';
  description: string;
  amount: number;
  frequency: number; // times per year
  startYear: number;
  endYear: number;
}

export interface AssetClass {
  id: string;
  name: string;
  horizon: Horizon;
}

export interface ProductMapping {
  productId: string;
  productName: string;
  allocations: {
    assetClassId: string;
    percentage: number;
  }[];
}

export interface IPSSecurity {
  code: string;
  name: string;
  h1: number; // percentage
  h2: number; // percentage
  h3: number; // percentage
}

export interface PortfolioHolding {
  id: string;
  securityCode: string; // Proposed security
  currentSecurityCode: string; // Current security
  currentValue: number;
  proposedValue: number;
}

export interface PortfolioItem {
  id: string;
  accountName: string;
  holdings: PortfolioHolding[];
}

export const DEFAULT_ASSET_CLASSES: AssetClass[] = [
  { id: 'cash', name: 'Cash', horizon: 'H1' },
  { id: 'fixed-income', name: 'Fixed Income', horizon: 'H2' },
  { id: 'equities', name: 'Equities', horizon: 'H3' },
  { id: 'property', name: 'Property', horizon: 'H3' },
  { id: 'alternatives', name: 'Alternatives', horizon: 'H2' },
];

export const HORIZON_LABELS: Record<Horizon, string> = {
  H1: '0-3 Years (Short Term)',
  H2: '3-6 Years (Medium Term)',
  H3: '6+ Years (Long Term)',
};
