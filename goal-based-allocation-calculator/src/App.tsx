/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  PieChart, 
  ArrowRightLeft, 
  ArrowDown,
  User, 
  TrendingUp,
  ChevronRight,
  Save,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { 
  CashFlowItem, 
  PortfolioItem, 
  Horizon,
  HORIZON_LABELS, 
  IPSSecurity,
  PortfolioHolding
} from './types';
import { IPS_MAPPING } from './data/ipsMapping';

// --- Components ---

const Card = ({ children, className, title, ...props }: { children: React.ReactNode; className?: string; title?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm", className)}>
    {title && (
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const Input = ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-medium text-slate-500 uppercase">{label}</label>}
    <input 
      {...props} 
      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
    />
  </div>
);

const Button = ({ children, variant = 'primary', className, ...props }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    ghost: "text-slate-500 hover:bg-slate-100"
  };
  return (
    <button 
      {...props} 
      className={cn("px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50", variants[variant], className)}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'portfolio' | 'roa' | 'summary'>('cashflow');
  const [clientName, setClientName] = useState('John Doe');
  
  // Cash Flow State
  const [cashFlows, setCashFlows] = useState<CashFlowItem[]>([
    { id: '1', type: 'income', description: 'Salary (Net)', amount: 50000, frequency: 1, startYear: 1, endYear: 30 },
    { id: '2', type: 'expense', description: 'Living Expenses', amount: 80000, frequency: 1, startYear: 1, endYear: 30 },
    { id: '3', type: 'goal', description: 'New Car', amount: 40000, frequency: 1, startYear: 3, endYear: 3 },
  ]);

  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    { 
      id: 'p1', 
      accountName: 'Superannuation', 
      holdings: [
        { id: 'h1', securityCode: 'NML0588AU', currentSecurityCode: 'NML0588AU', currentValue: 150000, proposedValue: 150000 }
      ]
    },
    { 
      id: 'p2', 
      accountName: 'Joint Savings', 
      holdings: [
        { id: 'h2', securityCode: 'CASHACCT', currentSecurityCode: 'CASHACCT', currentValue: 50000, proposedValue: 50000 }
      ]
    },
  ]);

  const totalFUM = useMemo(() => 
    portfolio.reduce((sum, item) => 
      sum + item.holdings.reduce((hSum, h) => hSum + h.currentValue, 0)
    , 0)
  , [portfolio]);

  // --- Calculations ---

  const bucketNeeds = useMemo(() => {
    const deficits: Record<Horizon, number> = { H1: 0, H2: 0, H3: 0 };
    
    // Calculate net cash flow for each year
    for (let year = 1; year <= 30; year++) {
      let annualNet = 0;
      cashFlows.forEach(item => {
        if (year >= item.startYear && year <= item.endYear) {
          const value = item.amount * item.frequency;
          if (item.type === 'income') annualNet += value;
          else annualNet -= value;
        }
      });

      // We only care about the deficit (negative net) for H1 and H2
      if (annualNet < 0) {
        const amount = Math.abs(annualNet);
        if (year <= 3) deficits.H1 += amount;
        else if (year <= 6) deficits.H2 += amount;
        else deficits.H3 += amount;
      }
    }

    // The user's goal is to fund H1 and H2 first, then the rest goes to H3
    const h1Need = deficits.H1;
    const h2Need = deficits.H2;
    const h3Need = Math.max(0, totalFUM - h1Need - h2Need);

    return { H1: h1Need, H2: h2Need, H3: h3Need };
  }, [cashFlows, totalFUM]);

  const currentAllocation = useMemo(() => {
    const allocation: Record<Horizon, number> = { H1: 0, H2: 0, H3: 0 };
    
    portfolio.forEach(item => {
      item.holdings.forEach(holding => {
        const security = IPS_MAPPING.find(s => s.code === holding.securityCode);
        if (security) {
          allocation.H1 += (holding.currentValue * security.h1) / 100;
          allocation.H2 += (holding.currentValue * security.h2) / 100;
          allocation.H3 += (holding.currentValue * security.h3) / 100;
        }
      });
    });

    return allocation;
  }, [portfolio]);

  const proposedAllocation = useMemo(() => {
    const allocation: Record<Horizon, number> = { H1: 0, H2: 0, H3: 0 };
    
    portfolio.forEach(item => {
      item.holdings.forEach(holding => {
        const security = IPS_MAPPING.find(s => s.code === holding.securityCode);
        if (security) {
          allocation.H1 += (holding.proposedValue * security.h1) / 100;
          allocation.H2 += (holding.proposedValue * security.h2) / 100;
          allocation.H3 += (holding.proposedValue * security.h3) / 100;
        }
      });
    });

    return allocation;
  }, [portfolio]);

  // --- Handlers ---

  const addCashFlow = (type: CashFlowItem['type']) => {
    const newItem: CashFlowItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description: `New ${type}`,
      amount: 0,
      frequency: 1,
      startYear: 1,
      endYear: 1
    };
    setCashFlows([...cashFlows, newItem]);
  };

  const updateCashFlow = (id: string, field: keyof CashFlowItem, value: any) => {
    setCashFlows(cashFlows.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeCashFlow = (id: string) => {
    setCashFlows(cashFlows.filter(item => item.id !== id));
  };

  const addPortfolioItem = () => {
    const newItem: PortfolioItem = {
      id: Math.random().toString(36).substr(2, 9),
      accountName: 'New Account',
      holdings: [
        { 
          id: Math.random().toString(36).substr(2, 9), 
          securityCode: IPS_MAPPING[0].code, 
          currentSecurityCode: IPS_MAPPING[0].code,
          currentValue: 0, 
          proposedValue: 0 
        }
      ]
    };
    setPortfolio([...portfolio, newItem]);
  };

  const updatePortfolioItem = (id: string, field: keyof PortfolioItem, value: any) => {
    setPortfolio(portfolio.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addHolding = (accountId: string) => {
    setPortfolio(portfolio.map(item => {
      if (item.id === accountId) {
        return {
          ...item,
          holdings: [
            ...item.holdings,
            { 
              id: Math.random().toString(36).substr(2, 9), 
              securityCode: IPS_MAPPING[0].code, 
              currentSecurityCode: IPS_MAPPING[0].code,
              currentValue: 0, 
              proposedValue: 0 
            }
          ]
        };
      }
      return item;
    }));
  };

  const updateHolding = (accountId: string, holdingId: string, field: keyof PortfolioHolding, value: any) => {
    setPortfolio(portfolio.map(item => {
      if (item.id === accountId) {
        return {
          ...item,
          holdings: item.holdings.map(h => {
            if (h.id === holdingId) {
              const updated = { ...h, [field]: value };
              // If we are updating current security, we also update proposed security to match
              if (field === 'currentSecurityCode') {
                updated.securityCode = value;
              }
              // If we are updating current value, we also update proposed value to match
              if (field === 'currentValue') {
                updated.proposedValue = value;
              }
              return updated;
            }
            return h;
          })
        };
      }
      return item;
    }));
  };

  const removeHolding = (accountId: string, holdingId: string) => {
    setPortfolio(portfolio.map(item => {
      if (item.id === accountId) {
        return {
          ...item,
          holdings: item.holdings.filter(h => h.id !== holdingId)
        };
      }
      return item;
    }));
  };

  const removePortfolioItem = (id: string) => {
    setPortfolio(portfolio.filter(item => item.id !== id));
  };

  const [rebalanceStatus, setRebalanceStatus] = useState<string | null>(null);

  const applySmartRebalance = () => {
    const totalH1Need = bucketNeeds.H1;
    const totalH2Need = bucketNeeds.H2;
    
    let totalChanges = 0;

    const updatedPortfolio = portfolio.map(account => {
      const accountTotalValue = account.holdings.reduce((sum, h) => sum + h.currentValue, 0);
      
      // Pro-rata: each account takes a slice of the total need
      const accountH1Target = (accountTotalValue / totalFUM) * totalH1Need;
      const accountH2Target = (accountTotalValue / totalFUM) * totalH2Need;

      let accountRemaining = accountTotalValue;
      
      // Prepare holdings
      const sortedHoldings = account.holdings.map(h => ({ 
        ...h, 
        proposedValue: 0,
        security: IPS_MAPPING.find(s => s.code === h.securityCode)
      }));

      const pureH1 = sortedHoldings.filter(h => h.security?.h1 === 100);
      const pureH2 = sortedHoldings.filter(h => h.security?.h2 === 100);
      const others = sortedHoldings.filter(h => h.security?.h1 !== 100 && h.security?.h2 !== 100);

      // Allocate H1 target to Pure H1 holdings
      if (pureH1.length > 0) {
        const perH1 = accountH1Target / pureH1.length;
        pureH1.forEach(h => {
          h.proposedValue = perH1;
          accountRemaining -= perH1;
        });
      } else if (accountH1Target > 0) {
        // If no pure H1, add a default cash holding if possible or use first available
        const firstH = sortedHoldings[0];
        if (firstH) {
          firstH.proposedValue += accountH1Target;
          accountRemaining -= accountH1Target;
        }
      }

      // Allocate H2 target to Pure H2 holdings
      if (pureH2.length > 0) {
        const perH2 = accountH2Target / pureH2.length;
        pureH2.forEach(h => {
          h.proposedValue = perH2;
          accountRemaining -= perH2;
        });
      } else if (accountH2Target > 0) {
        const firstH = sortedHoldings[0];
        if (firstH) {
          firstH.proposedValue += accountH2Target;
          accountRemaining -= accountH2Target;
        }
      }

      // Distribute remaining value to "others" (H3)
      const totalOthersCurrentValue = others.reduce((sum, h) => sum + h.currentValue, 0);
      if (totalOthersCurrentValue > 0) {
        others.forEach(h => {
          h.proposedValue = (h.currentValue / totalOthersCurrentValue) * accountRemaining;
        });
        accountRemaining = 0;
      } else if (accountRemaining > 0) {
        const lastH = sortedHoldings[sortedHoldings.length - 1];
        if (lastH) {
          lastH.proposedValue += accountRemaining;
          accountRemaining = 0;
        }
      }

      // Check for changes
      account.holdings.forEach((h, i) => {
        const newH = sortedHoldings.find(sh => sh.id === h.id);
        if (newH && Math.abs(h.currentValue - newH.proposedValue) > 1) {
          totalChanges++;
        }
      });

      return { 
        ...account, 
        holdings: sortedHoldings.map(({ security, ...h }) => h) 
      };
    });

    setPortfolio(updatedPortfolio);
    
    if (totalChanges > 0) {
      setRebalanceStatus(`Successfully suggested ${totalChanges} adjustments.`);
    } else {
      setRebalanceStatus("No adjustments suggested. Ensure accounts have appropriate securities to allow rebalancing.");
    }
    
    setTimeout(() => setRebalanceStatus(null), 5000);
  };

  const resetProposed = () => {
    setPortfolio(portfolio.map(acc => ({
      ...acc,
      holdings: acc.holdings
        .filter(h => h.currentValue > 0) // Remove holdings that were only added in ROA
        .map(h => ({ 
          ...h, 
          securityCode: h.currentSecurityCode, // Revert security to current
          proposedValue: h.currentValue // Revert value to current
        }))
    })));
    setRebalanceStatus("Proposed values and securities reset to match current portfolio.");
    setTimeout(() => setRebalanceStatus(null), 3000);
  };

  // --- Render Helpers ---

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Calculator size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Goal Based Allocation</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Financial Planning Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total FUM</span>
              <span className="text-sm font-mono font-bold text-blue-600">{formatCurrency(totalFUM)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <User size={14} className="text-slate-500" />
              <input 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm font-medium w-32"
              />
            </div>
            <Button variant="secondary" className="hidden sm:flex"><Download size={16} /> Export Report</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-200/50 p-1 rounded-lg w-fit">
          {[
            { id: 'cashflow', label: 'Cash Flow & Goals', icon: TrendingUp },
            { id: 'portfolio', label: 'Current Portfolio', icon: PieChart },
            { id: 'roa', label: 'Record of Advice', icon: ArrowRightLeft },
            { id: 'summary', label: 'Allocation Summary', icon: Calculator },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {activeTab === 'cashflow' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* FUM Summary Card */}
                <Card className="bg-blue-600 text-white border-none">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1">Total Funds Under Management (FUM)</h3>
                      <p className="text-3xl font-bold">{formatCurrency(totalFUM)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-100 uppercase font-bold mb-1">Portfolio Status</p>
                      <span className="bg-blue-500 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>
                    </div>
                  </div>
                </Card>

                {/* Income Section */}
                <Card title="Income Sources">
                  <div className="space-y-4">
                    {cashFlows.filter(i => i.type === 'income').map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-end border-b border-slate-100 pb-4 last:border-0">
                        <div className="col-span-4">
                          <Input label="Description" value={item.description} onChange={(e) => updateCashFlow(item.id, 'description', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Input label="Annual Amount" type="number" value={item.amount} onChange={(e) => updateCashFlow(item.id, 'amount', Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input label="Start Yr" type="number" value={item.startYear} onChange={(e) => updateCashFlow(item.id, 'startYear', Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input label="End Yr" type="number" value={item.endYear} onChange={(e) => updateCashFlow(item.id, 'endYear', Number(e.target.value))} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button variant="ghost" onClick={() => removeCashFlow(item.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="secondary" onClick={() => addCashFlow('income')} className="w-full border-dashed"><Plus size={16} /> Add Income</Button>
                  </div>
                </Card>

                {/* Expenses Section */}
                <Card title="Expenses & Goals">
                  <div className="space-y-4">
                    {cashFlows.filter(i => i.type !== 'income').map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-end border-b border-slate-100 pb-4 last:border-0">
                        <div className="col-span-4">
                          <Input label="Description" value={item.description} onChange={(e) => updateCashFlow(item.id, 'description', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Input label="Annual Amount" type="number" value={item.amount} onChange={(e) => updateCashFlow(item.id, 'amount', Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input label="Start Yr" type="number" value={item.startYear} onChange={(e) => updateCashFlow(item.id, 'startYear', Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input label="End Yr" type="number" value={item.endYear} onChange={(e) => updateCashFlow(item.id, 'endYear', Number(e.target.value))} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button variant="ghost" onClick={() => removeCashFlow(item.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => addCashFlow('expense')} className="flex-1 border-dashed"><Plus size={16} /> Add Expense</Button>
                      <Button variant="secondary" onClick={() => addCashFlow('goal')} className="flex-1 border-dashed"><Plus size={16} /> Add Goal</Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Bucket Summary Sidebar */}
              <div className="space-y-6">
                <Card title="Calculated Bucket Needs" className="bg-slate-900 text-white border-none">
                  <div className="space-y-6">
                    {(Object.entries(bucketNeeds) as [Horizon, number][]).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{HORIZON_LABELS[key]}</span>
                          <span className="text-lg font-mono font-semibold">{formatCurrency(value)}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (value / Math.max(...(Object.values(bucketNeeds) as number[]))) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-400">Total Funding Required</span>
                        <span className="text-xl font-bold text-blue-400">{formatCurrency((Object.values(bucketNeeds) as number[]).reduce((a, b) => a + b, 0))}</span>
                      </div>
                    </div>
                  </div>
                </Card>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
                    <TrendingUp size={16} /> Strategy Note
                  </h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Based on the cash flow analysis, H1 and H2 requirements are calculated as the net deficit over the first 6 years. H3 captures long-term goals and residual surplus.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Account Breakdown</h2>
                <Button variant="primary" onClick={addPortfolioItem}><Plus size={16} /> Add Account</Button>
              </div>

              {portfolio.map(account => (
                <Card key={account.id} className="relative group">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-4 flex-1">
                      <input 
                        value={account.accountName} 
                        onChange={(e) => updatePortfolioItem(account.id, 'accountName', e.target.value)}
                        className="text-lg font-bold bg-transparent border-none focus:ring-0 w-full"
                      />
                    </div>
                    <Button variant="ghost" onClick={() => removePortfolioItem(account.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="pb-2">Security</th>
                          <th className="pb-2">Current Value</th>
                          <th className="pb-2">H1/H2/H3 %</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {account.holdings.map(holding => {
                          const security = IPS_MAPPING.find(s => s.code === holding.currentSecurityCode);
                          return (
                            <tr key={holding.id} className="group/row">
                              <td className="py-3 pr-4 min-w-[200px]">
                                <select 
                                  value={holding.currentSecurityCode} 
                                  onChange={(e) => updateHolding(account.id, holding.id, 'currentSecurityCode', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {IPS_MAPPING.map(s => (
                                    <option key={s.code} value={s.code}>
                                      {s.name} (H1:{s.h1}% H2:{s.h2}% H3:{s.h3}%)
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 pr-4">
                                <input 
                                  type="number"
                                  value={holding.currentValue} 
                                  onChange={(e) => updateHolding(account.id, holding.id, 'currentValue', Number(e.target.value))}
                                  className="w-32 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex gap-1 h-2 w-32 rounded-full overflow-hidden bg-slate-200">
                                  <div className="bg-blue-400" style={{ width: `${security?.h1}%` }} title={`H1: ${security?.h1}%`} />
                                  <div className="bg-indigo-400" style={{ width: `${security?.h2}%` }} title={`H2: ${security?.h2}%`} />
                                  <div className="bg-slate-700" style={{ width: `${security?.h3}%` }} title={`H3: ${security?.h3}%`} />
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <Button variant="ghost" onClick={() => removeHolding(account.id, holding.id)} className="p-1 opacity-0 group-row/row:opacity-100 text-slate-400 hover:text-red-500"><Trash2 size={14} /></Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="secondary" onClick={() => addHolding(account.id)} className="mt-3 text-xs py-1 border-dashed w-full"><Plus size={12} /> Add Security to {account.accountName}</Button>
                </Card>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.entries(currentAllocation) as [Horizon, number][]).map(([key, value]) => (
                  <Card key={key} className="text-center py-8">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{HORIZON_LABELS[key]}</span>
                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(value)}</span>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded",
                        value >= bucketNeeds[key] ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {value >= bucketNeeds[key] ? 'FULLY FUNDED' : 'UNDERFUNDED'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'roa' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold flex items-center gap-2"><ArrowRightLeft className="text-blue-500" /> Proposed Adjustments</h2>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={resetProposed} className="text-slate-400 hover:text-slate-600">
                      Reset
                    </Button>
                    <Button variant="secondary" onClick={applySmartRebalance} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <TrendingUp size={16} /> Suggest Allocation
                    </Button>
                    <Button variant="primary"><Save size={16} /> Save Recommendation</Button>
                  </div>
                </div>

                {rebalanceStatus && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300",
                    rebalanceStatus.includes("Successfully") ? "bg-green-50 text-green-700 border border-green-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                  )}>
                    {rebalanceStatus}
                  </div>
                )}
                
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Account / Security</th>
                          <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Current Value</th>
                          <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Proposed Value</th>
                          <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Action</th>
                          <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right">Net Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {portfolio.map(account => (
                          <React.Fragment key={account.id}>
                            <tr className="bg-slate-50/50">
                              <td colSpan={4} className="py-2 px-4 font-bold text-slate-600 text-xs uppercase tracking-widest">{account.accountName}</td>
                              <td className="py-2 px-4 text-right">
                                <Button variant="ghost" onClick={() => addHolding(account.id)} className="text-[10px] py-0.5 h-6 text-blue-600 hover:bg-blue-50">
                                  <Plus size={12} /> Add Security
                                </Button>
                              </td>
                            </tr>
                            {account.holdings.map(holding => {
                              const diff = holding.proposedValue - holding.currentValue;
                              const currentSecurity = IPS_MAPPING.find(s => s.code === holding.currentSecurityCode);
                              return (
                                <tr key={holding.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="py-4 pl-8">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current: {currentSecurity?.name}</div>
                                    <select
                                      value={holding.securityCode}
                                      onChange={(e) => updateHolding(account.id, holding.id, 'securityCode', e.target.value)}
                                      className="bg-transparent border-none font-medium text-slate-900 focus:ring-0 cursor-pointer hover:text-blue-600 transition-colors p-0 block w-full"
                                    >
                                      {IPS_MAPPING.map(s => (
                                        <option key={s.code} value={s.code}>
                                          {s.name} (H1:{s.h1}% H2:{s.h2}% H3:{s.h3}%)
                                        </option>
                                      ))}
                                    </select>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1">{holding.securityCode}</div>
                                  </td>
                                  <td className="py-4 font-mono">{formatCurrency(holding.currentValue)}</td>
                                  <td className="py-4">
                                    <input 
                                      type="number"
                                      value={holding.proposedValue} 
                                      onChange={(e) => updateHolding(account.id, holding.id, 'proposedValue', Number(e.target.value))}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 w-32 focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </td>
                                  <td className="py-4">
                                    <div className="flex items-center gap-3">
                                      {diff === 0 ? (
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hold</span>
                                      ) : diff > 0 ? (
                                        <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><Plus size={10} /> Buy</span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><ArrowDown size={10} /> Sell</span>
                                      )}
                                      
                                      <button 
                                        onClick={() => removeHolding(account.id, holding.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove holding"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className={cn(
                                    "py-4 text-right font-mono font-bold pr-4",
                                    diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-slate-400"
                                  )}>
                                    {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-100 bg-slate-50/50">
                          <td className="py-4 font-bold pl-4">Total Portfolio</td>
                          <td className="py-4 font-mono font-bold">{formatCurrency(totalFUM)}</td>
                          <td className="py-4 font-mono font-bold">
                            {formatCurrency(portfolio.reduce((a, b) => a + b.holdings.reduce((hSum, h) => hSum + h.proposedValue, 0), 0))}
                          </td>
                          <td></td>
                          <td className="py-4 text-right font-mono font-bold pr-4">
                            {formatCurrency(portfolio.reduce((a, b) => a + b.holdings.reduce((hSum, h) => hSum + (h.proposedValue - h.currentValue), 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>

                <div className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative">
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-lg font-bold mb-2">Rebalancing Impact</h3>
                      <p className="text-slate-400 text-sm mb-6">Visualizing how your proposed changes align the portfolio with the calculated bucket needs.</p>
                      <div className="space-y-4">
                        {Object.keys(HORIZON_LABELS).map(h => {
                          const horizon = h as Horizon;
                          const current = currentAllocation[horizon];
                          const proposed = proposedAllocation[horizon];
                          const need = bucketNeeds[horizon];
                          return (
                            <div key={h} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span>{horizon} Alignment</span>
                                <span className={cn(proposed >= need ? "text-green-400" : "text-red-400")}>
                                  {Math.round((proposed / need) * 100)}% Funded
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full flex">
                                <div className="h-full bg-blue-500/30 rounded-l-full" style={{ width: `${Math.min(100, (current / need) * 100)}%` }} />
                                <div className="h-full bg-blue-500 rounded-r-full" style={{ width: `${Math.max(0, (proposed - current) / need * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(Object.keys(HORIZON_LABELS) as Horizon[]).map(h => ({
                          name: h,
                          Need: bucketNeeds[h],
                          Current: currentAllocation[h],
                          Proposed: proposedAllocation[h]
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="Need" fill="#334155" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Proposed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                </div>
              </div>

              {/* Rebalancing Guide Sidebar */}
              <div className="space-y-6">
                <Card title="Rebalancing Guide" className="sticky top-24">
                  <div className="space-y-6">
                    {(Object.keys(HORIZON_LABELS) as Horizon[]).map(h => {
                      const horizon = h;
                      const need = bucketNeeds[horizon];
                      const proposed = proposedAllocation[horizon];
                      const diff = proposed - need;
                      
                      return (
                        <div key={h} className="pb-4 border-b border-slate-100 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">{HORIZON_LABELS[horizon].split(' ')[0]}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              diff >= -100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {diff >= -100 ? 'OK' : 'GAP'}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-slate-400">Target:</span>
                            <span className="text-sm font-mono font-medium">{formatCurrency(need)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-slate-400">Proposed:</span>
                            <span className="text-sm font-mono font-medium">{formatCurrency(proposed)}</span>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-xs font-bold text-slate-500">Variance:</span>
                            <span className={cn(
                              "text-xs font-mono font-bold",
                              diff >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded text-[11px] text-amber-800 leading-relaxed">
                      <p className="font-bold mb-1 flex items-center gap-1">
                        <TrendingUp size={12} /> Pro Tip:
                      </p>
                      Use the "Suggest Allocation" button to automatically fill H1 and H2 buckets using your current cash and defensive holdings.
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="Allocation Comparison">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(Object.keys(HORIZON_LABELS) as Horizon[]).map(h => ({
                      name: HORIZON_LABELS[h].split(' ')[0],
                      Need: bucketNeeds[h],
                      Allocation: proposedAllocation[h]
                    }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="Need" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Allocation" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Portfolio Composition (Proposed)">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={(Object.entries(proposedAllocation) as [Horizon, number][]).map(([key, value]) => ({ name: key, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#6366f1" />
                        <Cell fill="#0f172a" />
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="lg:col-span-2">
                <Card title="Final Analysis & Recommendations">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(Object.keys(HORIZON_LABELS) as Horizon[]).map(h => {
                      const horizon = h;
                      const diff = proposedAllocation[horizon] - bucketNeeds[horizon];
                      return (
                        <div key={h} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">{HORIZON_LABELS[horizon]}</h4>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold">{formatCurrency(proposedAllocation[horizon])}</span>
                            <span className="text-xs text-slate-400">allocated</span>
                          </div>
                          <div className={cn(
                            "text-sm font-semibold flex items-center gap-1",
                            diff >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {diff >= 0 ? <Plus size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                            {formatCurrency(Math.abs(diff))} {diff >= 0 ? 'Surplus' : 'Deficit'}
                          </div>
                          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                            {diff >= 0 
                              ? `The ${horizon} bucket is fully funded. Any surplus can be reallocated to H3 for long-term growth.`
                              : `There is a funding gap in ${horizon}. Consider reducing H3 exposure or increasing contributions.`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Calculator size={18} />
            <span className="text-sm font-medium">Goal Based Allocation v1.0</span>
          </div>
          <div className="flex gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
