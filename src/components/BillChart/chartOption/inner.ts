import type { EChartsOption } from 'echarts';
import { type CategoryDiff, type TradeMinMax } from '../handleData';
import {
  createBasePolarOption,
  updateChartOption,
  type InnerChartOptions,
} from './innerBase';
import { mergeObjectArrays } from './util';

export type InnerData = {
  category: string[];
  increase: number[];
  decrease: number[];
  value: number[];
  rawValue: number[];
};

/**
 * 获取交易类别里排名前N的数据
 * @param categoryDiff
 * @param n
 * @returns
 */
function getData(categoryDiff: CategoryDiff, n = 5): InnerData {
  // step1: 将categoryDiff转为数组
  const categoryDiffArray = Object.keys(categoryDiff).map((key) => ({
    category: key,
    ...categoryDiff[key],
  }));

  // step2: 过滤掉value为0的，并按value从大到小排序，并取前N
  const data = categoryDiffArray
    .filter((d) => d.value !== 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);

  // step3: 将数据反转
  const category = data.map((d) => d.category).reverse();
  const increase = data.map((d) => d.increase).reverse();
  const decrease = data.map((d) => d.decrease).reverse();
  const value = data.map((d) => d.value).reverse();
  const rawValue = value.map((d, i) => Number((d + increase[i]).toFixed(2)));

  // step4: 如果数据长度小于N，则补全空数据
  if (category.length < n) {
    category.unshift(...Array.from({ length: n - category.length }, () => ''));
    increase.unshift(...Array.from({ length: n - increase.length }, () => 0));
    decrease.unshift(...Array.from({ length: n - decrease.length }, () => 0));
    value.unshift(...Array.from({ length: n - value.length }, () => 0));
    rawValue.unshift(...Array.from({ length: n - rawValue.length }, () => 0));
  }

  return { category, increase, decrease, value, rawValue };
}

/**
 * 手动计算极值，保证内环俩侧极值相等
 * @param data
 * @returns
 */
export function getNiceInterval(data: { min: number; max: number }): number[] {
  const splitNumber = 5;
  let min = data.min;
  let max = data.max;
  // 避免极值与数据最大值相等，形成视觉效果不好的半圆
  max *= 1.1;
  if (min === max) {
    if (min !== 0) {
      min -= Math.abs(min) / 2;
      max += Math.abs(max) / 2;
    } else {
      max = 1;
    }
  }
  const span = max - min;
  const interval = nice(span / splitNumber);

  const fixMin = Math.floor(min / interval) * interval;
  const fixMax = Math.ceil(max / interval) * interval;

  let intervalList = [];
  for (let i = fixMin; i <= fixMax; i += interval) {
    intervalList.push(i);
  }

  return intervalList;
}

/**
 * 按粒度取整
 * @param data
 * @returns
 */
function nice(num: number) {
  const exp = Math.floor(Math.log10(num));
  const f = num / Math.pow(10, exp);
  let nf;
  if (f < 1.5) {
    nf = 1;
  } else if (f < 3) {
    nf = 2;
  } else if (f < 7) {
    nf = 5;
  } else {
    nf = 10;
  }
  return nf * Math.pow(10, exp);
}

// 缓存 baseOption，避免重复创建
const baseOptionCache: { income?: any; expense?: any } = {};

function getInnerPolarOption(data: InnerData, options: InnerChartOptions) {
  const cacheKey = options.isIncome ? 'income' : 'expense';
  if (!baseOptionCache[cacheKey]) {
    baseOptionCache[cacheKey] = createBasePolarOption(options.isIncome);
  }
  // 注意：updateChartOption 可能会修改 baseOption，
  // 如果 updateChartOption 有副作用，需深拷贝 baseOption
  return updateChartOption({ ...baseOptionCache[cacheKey] }, data, options);
}

export function getInnerOption(
  categoryDiff: {
    income: CategoryDiff;
    expense: CategoryDiff;
  },
  options: {
    colorMap: Record<string, string>;
    tradeMinMax: TradeMinMax;
  }
) {
  const { colorMap, tradeMinMax } = options;
  const { income, expense } = categoryDiff;
  const incomeData = getData(income);
  const expenseData = getData(expense);

  if (incomeData.category.length === 0 && expenseData.category.length === 0) {
    return {};
  }

  const incomeSplit = getNiceInterval(tradeMinMax.income);
  const expenseSplit = getNiceInterval(tradeMinMax.expense);
  const incomeExtend: [number, number] = [
    incomeSplit[0],
    incomeSplit[incomeSplit.length - 1],
  ];
  const expenseExtend: [number, number] = [
    expenseSplit[0],
    expenseSplit[expenseSplit.length - 1],
  ];

  let incomeOption: EChartsOption | null = null;
  if (incomeData.category.length > 0) {
    incomeOption = getInnerPolarOption(incomeData, {
      isIncome: true,
      extend: incomeExtend,
      colorMap,
    });
  }

  let expenseOption: EChartsOption | null = null;
  if (expenseData.category.length > 0) {
    expenseOption = getInnerPolarOption(expenseData, {
      isIncome: false,
      extend: expenseExtend,
      colorMap,
    });
  }

  // @ts-ignore
  return mergeObjectArrays(incomeOption, expenseOption);
}
