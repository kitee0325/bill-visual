import type { EChartsOption } from 'echarts';
import { type BillRecord, type TradeMinMax } from '../handleData';
import {
  createOuterBaseOption,
  updateStackLineOption,
  updateScatterOption,
  type OuterScatterChartOptions,
  type OuterStackLineChartOptions,
} from './outerBase';
import { mergeObjectArrays } from './util';

export type OuterData = {
  id: string;
  amount: number;
  tradeTime: Date;
  tradeCategory: string;
};

/**
 * 根据ID创建映射，便于在tooltip等场景中使用
 * @param records
 * @returns
 */
function createIdMap(records: BillRecord[]) {
  return records.reduce((acc, record) => {
    acc[record.id] = record;
    return acc;
  }, {} as Record<string, BillRecord>);
}

/**
 * 过滤无关属性，仅保留绘图数据
 */
function cleanData(records: BillRecord[]): OuterData[] {
  return records.map((record) => {
    return {
      id: record.id,
      amount: record.amount,
      tradeTime: record.tradeTime,
      tradeCategory: record.tradeCategory,
    };
  });
}

// 缓存 baseOption，避免重复创建
const baseOptionCache: {
  'income-line'?: EChartsOption;
  'expense-line'?: EChartsOption;
  'income-scatter'?: EChartsOption;
  'expense-scatter'?: EChartsOption;
} = {};

function getLinePolarOption(
  data: OuterData[],
  options: OuterStackLineChartOptions
) {
  const { isIncome } = options;
  const cacheKey = isIncome ? 'income-line' : 'expense-line';
  if (!baseOptionCache[cacheKey]) {
    baseOptionCache[cacheKey] = createOuterBaseOption(isIncome, true);
  }
  return updateStackLineOption({ ...baseOptionCache[cacheKey] }, data, options);
}

function getScatterPolarOption(
  data: OuterData[],
  options: OuterScatterChartOptions
) {
  const { isIncome } = options;
  const cacheKey = isIncome ? 'income-scatter' : 'expense-scatter';
  if (!baseOptionCache[cacheKey]) {
    baseOptionCache[cacheKey] = createOuterBaseOption(isIncome, false);
  }
  return updateScatterOption({ ...baseOptionCache[cacheKey] }, data, options);
}

export function getOuterOption(
  records: BillRecord[],
  options: {
    categoryRank: {
      income: string[];
      expense: string[];
    };
    colorMap: Record<string, string>;
  }
) {
  const { categoryRank, colorMap } = options;
  const incomeRecords = records.filter(
    (record) => record.incomeOrExpense === '收入'
  );
  const expenseRecords = records.filter(
    (record) => record.incomeOrExpense === '支出'
  );

  const incomeData = cleanData(incomeRecords);
  const incomeOption = getLinePolarOption(incomeData, {
    isIncome: true,
    colorMap,
    categoryRank: categoryRank.income,
  });

  const expenseData = cleanData(expenseRecords);
  const expenseOption = getLinePolarOption(expenseData, {
    isIncome: false,
    colorMap,
    categoryRank: categoryRank.expense,
  });

  // @ts-ignore
  return mergeObjectArrays(incomeOption, expenseOption);
}

export function getScatterOption(
  records: BillRecord[],
  options: {
    colorMap: Record<string, string>;
    tradeMinMax: TradeMinMax;
  }
) {
  const { colorMap, tradeMinMax } = options;
  const incomeRecords = records.filter(
    (record) => record.incomeOrExpense === '收入'
  );
  const expenseRecords = records.filter(
    (record) => record.incomeOrExpense === '支出'
  );

  const incomeData = cleanData(incomeRecords);
  const incomeIDMap = createIdMap(incomeRecords);
  const incomeOption = getScatterPolarOption(incomeData, {
    isIncome: true,
    idMap: incomeIDMap,
    colorMap,
    tradeMinMax,
  });

  const expenseData = cleanData(expenseRecords);
  const expenseIDMap = createIdMap(expenseRecords);
  const expenseOption = getScatterPolarOption(expenseData, {
    isIncome: false,
    idMap: expenseIDMap,
    colorMap,
    tradeMinMax,
  });

  // @ts-ignore
  return mergeObjectArrays(incomeOption, expenseOption);
}
