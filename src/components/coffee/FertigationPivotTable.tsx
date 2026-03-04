/**
 * FertigationPivotTable — Tabela pivotada unificada de aplicação
 * Formato: meses nas linhas, produtos nas colunas.
 * Fertirrigação agrupada por compatibilidade (A-E).
 * Foliares em grupo separado "APLICAÇÃO FOLIAR".
 * Doses em kg total (área do talhão) e g/planta.
 * Compacto: fonte 8-9px, padding mínimo — cabe em 794px (A4 96dpi).
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HybridPlan } from '@/lib/coffeeHybridPlan';
import {
  classifyInsumo,
  GROUP_INFO,
  type CompatGroup,
  type InsumoForClassification,
} from '@/lib/compatibilityEngine';

interface FertigationPivotTableProps {
  hybridPlan: HybridPlan;
  hectares: number;
  totalPlants: number;
}

const GROUP_HEADER_BG: Record<CompatGroup, string> = {
  C: 'bg-emerald-50 text-emerald-800',
  A: 'bg-amber-50 text-amber-800',
  B: 'bg-yellow-50 text-yellow-800',
  D: 'bg-purple-50 text-purple-800',
  E: 'bg-gray-100 text-gray-700',
};

const GROUP_ORDER: CompatGroup[] = ['C', 'A', 'B', 'D', 'E'];

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Shorten long product names to fit columns */
function shortName(name: string): string {
  return name
    .replace(/Sulfato de /i, 'Sulf. ')
    .replace(/Ácido /i, 'Ác. ')
    .replace(/Cloreto de /i, 'Clo. ')
    .replace(/Nitrato de /i, 'Nit. ')
    .replace(/Fosfato /i, 'Fosf. ')
    .replace(/ de Potássio/i, ' K')
    .replace(/ de Magnésio/i, ' Mg')
    .replace(/ de Zinco/i, ' Zn')
    .replace(/ de Manganês/i, ' Mn')
    .replace(/ de Cobre/i, ' Cu')
    .replace(/ de Amônia/i, ' NH₄')
    .replace(/ de Amônio/i, ' NH₄');
}

export function FertigationPivotTable({ hybridPlan, hectares, totalPlants }: FertigationPivotTableProps) {
  const ha = hectares > 0 ? hectares : 1;
  const plantsPerHa = totalPlants > 0 && ha > 0 ? totalPlants / ha : 0;

  const fertiProducts = hybridPlan.productsByMethod['fertirrigacao'] || [];
  const foliarProducts = hybridPlan.productsByMethod['foliar'] || [];

  // Classify fertigation products into compatibility groups
  const classifiedFertiProducts = useMemo(() => {
    return fertiProducts.map(p => {
      const group = classifyInsumo({
        nome: p.name, tipo_produto: p.tipoProduto,
        macro_n: p.macro_n, macro_p2o5: p.macro_p2o5, macro_k2o: p.macro_k2o,
        macro_s: p.macro_s, micro_b: p.micro_b, micro_zn: p.micro_zn,
        micro_mn: 0, micro_cu: 0, micro_fe: 0,
      } as InsumoForClassification);
      return { ...p, group };
    });
  }, [fertiProducts]);

  const sortedFertiProducts = useMemo(() =>
    [...classifiedFertiProducts].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)),
    [classifiedFertiProducts],
  );

  // Active compatibility groups (fertigation only)
  const activeGroups = useMemo(() => {
    const gm = new Map<CompatGroup, typeof sortedFertiProducts>();
    sortedFertiProducts.forEach(p => {
      if (!gm.has(p.group)) gm.set(p.group, []);
      gm.get(p.group)!.push(p);
    });
    return GROUP_ORDER.filter(g => gm.has(g)).map(g => ({ group: g, products: gm.get(g)!, info: GROUP_INFO[g] }));
  }, [sortedFertiProducts]);

  // All columns: fertigation sorted + foliar
  const allColumns = useMemo(() => {
    const fertiCols = sortedFertiProducts.map(p => ({ name: p.name, source: 'ferti' as const }));
    const foliarCols = foliarProducts.map(p => ({ name: p.name, source: 'foliar' as const }));
    return [...fertiCols, ...foliarCols];
  }, [sortedFertiProducts, foliarProducts]);

  // Monthly rows — collect doses from BOTH fertirrigacao and foliar actions
  const monthlyRows = useMemo(() => {
    const fm = hybridPlan.months.filter(m =>
      m.actions.some(a => a.product.method === 'fertirrigacao' || a.product.method === 'foliar')
    );
    const rows = fm.map(m => {
      const dm = new Map<string, number>();
      m.actions
        .filter(a => a.product.method === 'fertirrigacao' || a.product.method === 'foliar')
        .forEach(a => {
          dm.set(a.product.name, (dm.get(a.product.name) || 0) + a.doseMonthKgHa);
        });
      return { label: '', calendarMonth: m.calendarMonth, pct: m.weightPct != null ? m.weightPct * 100 : null, doseMap: dm };
    });

    // Rotate so the current month comes first
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const startIdx = rows.findIndex(r => r.calendarMonth === currentMonth);
    const rotated = startIdx > 0 ? [...rows.slice(startIdx), ...rows.slice(0, startIdx)] : rows;

    // Regenerate labels with always-increasing year
    let labelMonth = currentMonth;
    let labelYear = now.getFullYear() % 100;
    rotated.forEach(r => {
      r.label = `${SHORT_MONTHS[labelMonth - 1]}/${String(labelYear).padStart(2, '0')}`;
      labelMonth++;
      if (labelMonth > 12) {
        labelMonth = 1;
        labelYear++;
      }
    });

    return rotated;
  }, [hybridPlan]);

  const colTotals = useMemo(() => {
    const t = new Map<string, number>();
    monthlyRows.forEach(r => r.doseMap.forEach((d, n) => t.set(n, (t.get(n) || 0) + d)));
    return t;
  }, [monthlyRows]);

  const totalPct = monthlyRows.reduce((s, r) => s + (r.pct ?? 0), 0);

  if (allColumns.length === 0 || monthlyRows.length === 0) return null;

  const toKgTotal = (kgHa: number) => kgHa * ha;
  const toGPlanta = (kgHa: number) => plantsPerHa > 0 ? (kgHa * 1000) / plantsPerHa : 0;

  const fmtKg = (v: number) => v < 0.01 ? '—' : v.toFixed(2).replace('.', ',');
  const fmtG = (v: number) => v < 0.01 ? '—' : v.toFixed(1).replace('.', ',');

  const hasFoliar = foliarProducts.length > 0;
  const hasFerti = sortedFertiProducts.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto w-full">
      {/* Area/plants info bar */}
      <div className="bg-emerald-50 px-3 py-1 border-b border-emerald-200 flex items-center gap-3" style={{ fontSize: '8px' }}>
        <span className="text-emerald-700 font-semibold">Área: {ha.toFixed(2)} ha</span>
        <span className="text-emerald-600">|</span>
        <span className="text-emerald-700 font-semibold">Plantas: {totalPlants.toLocaleString('pt-BR')}</span>
        <span className="text-emerald-600">|</span>
        <span className="text-emerald-600">Doses em <strong>kg total</strong> para o talhão e <strong>g/planta</strong></span>
      </div>
      <table className="w-full border-collapse min-w-[600px]" style={{ fontSize: '8.5px' }}>
        <thead>
          {/* Group header row */}
          <tr className="border-b border-gray-200">
            <th className="bg-white" style={{ padding: '2px 4px' }} colSpan={2} />
            {activeGroups.map(({ group, products, info }) => (
              <th
                key={group}
                colSpan={products.length}
                className={cn('text-center font-bold uppercase tracking-wide border-l border-gray-200', GROUP_HEADER_BG[group])}
                style={{ padding: '3px 2px', fontSize: '7.5px' }}
              >
                Grupo {group} — {info.desc}
              </th>
            ))}
            {hasFoliar && (
              <th
                colSpan={foliarProducts.length}
                className="text-center font-bold uppercase tracking-wide border-l border-gray-200 bg-blue-50 text-blue-800"
                style={{ padding: '3px 2px', fontSize: '7.5px' }}
              >
                Aplicação Foliar
              </th>
            )}
          </tr>
          {/* Product name row */}
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left font-semibold text-gray-600 uppercase" style={{ padding: '3px 4px', width: '90px' }} />
            <th className="text-center font-semibold text-gray-500 uppercase" style={{ padding: '3px 2px', width: '32px' }}>%</th>
            {sortedFertiProducts.map((p, i) => (
              <th
                key={`f-${i}`}
                className="text-center font-semibold text-gray-700 border-l border-gray-200 leading-tight whitespace-nowrap"
                style={{ padding: '3px 2px', maxWidth: '80px' }}
              >
                <span className="block truncate">{shortName(p.name)}</span>
                <span className="font-normal text-gray-400" style={{ fontSize: '7px' }}>kg · g/pl</span>
              </th>
            ))}
            {foliarProducts.map((p, i) => (
              <th
                key={`fol-${i}`}
                className="text-center font-semibold text-blue-700 border-l border-blue-200 leading-tight whitespace-nowrap"
                style={{ padding: '3px 2px', maxWidth: '80px' }}
              >
                <span className="block truncate">{shortName(p.name)}</span>
                <span className="font-normal text-blue-400" style={{ fontSize: '7px' }}>kg · g/pl</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthlyRows.map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="font-bold text-gray-700 whitespace-nowrap" style={{ padding: '2px 4px' }}>{row.label}</td>
              <td className="text-center text-gray-500 font-medium" style={{ padding: '2px 2px' }}>
                {row.pct != null ? `${row.pct.toFixed(1)}%` : '—'}
              </td>
              {/* Fertigation columns */}
              {sortedFertiProducts.map((p, pIdx) => {
                const doseKgHa = row.doseMap.get(p.name) || 0;
                const kgTotal = toKgTotal(doseKgHa);
                const gPlanta = toGPlanta(doseKgHa);
                return (
                  <td key={`f-${pIdx}`} className="text-center text-gray-800 border-l border-gray-100 tabular-nums leading-tight" style={{ padding: '2px 2px' }}>
                    {kgTotal > 0 ? (
                      <>
                        <span className="font-semibold">{fmtKg(kgTotal)}</span>
                        {plantsPerHa > 0 && (
                          <span className="block text-gray-400" style={{ fontSize: '7px' }}>{fmtG(gPlanta)}g</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                );
              })}
              {/* Foliar columns */}
              {foliarProducts.map((p, pIdx) => {
                const doseKgHa = row.doseMap.get(p.name) || 0;
                const kgTotal = toKgTotal(doseKgHa);
                const gPlanta = toGPlanta(doseKgHa);
                return (
                  <td key={`fol-${pIdx}`} className="text-center text-blue-800 border-l border-blue-100 tabular-nums leading-tight" style={{ padding: '2px 2px' }}>
                    {kgTotal > 0 ? (
                      <>
                        <span className="font-semibold">{fmtKg(kgTotal)}</span>
                        {plantsPerHa > 0 && (
                          <span className="block text-blue-400" style={{ fontSize: '7px' }}>{fmtG(gPlanta)}g</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-emerald-50 border-t-2 border-emerald-300 font-bold">
            <td className="text-emerald-800 uppercase" style={{ padding: '3px 4px' }}>Total</td>
            <td className="text-center text-emerald-700" style={{ padding: '3px 2px' }}>
              {totalPct > 0 ? `${Math.round(totalPct)}%` : '—'}
            </td>
            {sortedFertiProducts.map((p, pIdx) => {
              const totalKgHa = colTotals.get(p.name) || 0;
              const kgTotal = toKgTotal(totalKgHa);
              const gPlanta = toGPlanta(totalKgHa);
              return (
                <td key={`f-${pIdx}`} className="text-center text-emerald-800 border-l border-emerald-200 tabular-nums leading-tight" style={{ padding: '3px 2px' }}>
                  {kgTotal > 0 ? (
                    <>
                      <span>{fmtKg(kgTotal)}</span>
                      {plantsPerHa > 0 && (
                        <span className="block text-emerald-600" style={{ fontSize: '7px' }}>{fmtG(gPlanta)}g</span>
                      )}
                    </>
                  ) : '—'}
                </td>
              );
            })}
            {foliarProducts.map((p, pIdx) => {
              const totalKgHa = colTotals.get(p.name) || 0;
              const kgTotal = toKgTotal(totalKgHa);
              const gPlanta = toGPlanta(totalKgHa);
              return (
                <td key={`fol-${pIdx}`} className="text-center text-blue-800 border-l border-blue-200 tabular-nums leading-tight" style={{ padding: '3px 2px' }}>
                  {kgTotal > 0 ? (
                    <>
                      <span>{fmtKg(kgTotal)}</span>
                      {plantsPerHa > 0 && (
                        <span className="block text-blue-600" style={{ fontSize: '7px' }}>{fmtG(gPlanta)}g</span>
                      )}
                    </>
                  ) : '—'}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
