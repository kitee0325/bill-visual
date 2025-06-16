import type { EChartsOption } from 'echarts';
import { type BillRecord } from '../handleData';
import {
  createOuterBaseOption,
  updateChartOption,
  type OuterChartOptions,
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
const baseOptionCache: { income?: any; expense?: any } = {};

function getOuterPolarOption(data: OuterData[], options: OuterChartOptions) {
  const { isIncome } = options;
  const cacheKey = isIncome ? 'income' : 'expense';
  if (!baseOptionCache[cacheKey]) {
    baseOptionCache[cacheKey] = createOuterBaseOption(isIncome);
  }
  return updateChartOption({ ...baseOptionCache[cacheKey] }, data, options);
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

  if (incomeRecords.length === 0 && expenseRecords.length === 0) {
    return {};
  }

  let incomeOption: EChartsOption | null = {};
  let expenseOption: EChartsOption | null = {};

  if (incomeRecords.length > 0) {
    const incomeMap = createIdMap(incomeRecords);
    const incomeData = cleanData(incomeRecords);
    incomeOption = getOuterPolarOption(incomeData, {
      isIncome: true,
      colorMap,
      idMap: incomeMap,
      categoryRank: categoryRank.income,
    });
  }

  if (expenseRecords.length > 0) {
    const expenseMap = createIdMap(expenseRecords);
    const expenseData = cleanData(expenseRecords);

    expenseOption = getOuterPolarOption(expenseData, {
      isIncome: false,
      colorMap,
      idMap: expenseMap,
      categoryRank: categoryRank.expense,
    });
  }

  // @ts-ignore
  return mergeObjectArrays(incomeOption, expenseOption);
}
