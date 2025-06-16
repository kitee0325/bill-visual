import { type CategoryDiff } from '../handleData';
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
  const data: CategoryDiff = Object.keys(categoryDiff)
    .sort((a, b) => categoryDiff[b].value - categoryDiff[a].value)
    .filter((key) => categoryDiff[key].value !== 0)
    .slice(0, n)
    .reduce((acc, key) => {
      acc[key] = categoryDiff[key];
      return acc;
    }, {} as CategoryDiff);

  const category = Object.keys(data);
  const increase = Object.values(data).map((d) => d.increase);
  const decrease = Object.values(data).map((d) => d.decrease);
  const value = Object.values(data).map((d) => d.value);
  const rawValue = value.map((d, i) => Number((d + increase[i]).toFixed(2)));

  if (category.length < n) {
    category.push(...Array.from({ length: n - category.length }, () => ''));
  }

  return { category, increase, decrease, value, rawValue };
}

/**
 * 手动计算极值，保证内环俩侧极值相等
 * @param data
 * @returns
 */
function getNiceMinMax(data: number[]): [number, number] {
  const splitNumber = 5;
  let min = Math.min(...data);
  let max = Math.max(...data);
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
  min = Math.floor(min / interval) * interval;
  max = Math.ceil(max / interval) * interval;
  return [min, max];
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

function getInnerPolarOption(
  data: InnerData,
  options: InnerChartOptions,
  isIncome: boolean
) {
  const cacheKey = isIncome ? 'income' : 'expense';
  if (!baseOptionCache[cacheKey]) {
    baseOptionCache[cacheKey] = createBasePolarOption(isIncome);
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
  colorMap: Record<string, string>
) {
  const { income, expense } = categoryDiff;
  const incomeData = getData(income);
  const expenseData = getData(expense);

  const extend = getNiceMinMax([
    ...incomeData.rawValue,
    ...expenseData.rawValue,
  ]);
  const incomeOption = getInnerPolarOption(
    incomeData,
    {
      extend,
      colorMap,
    },
    true
  );
  const expenseOption = getInnerPolarOption(
    expenseData,
    {
      extend,
      colorMap,
    },
    false
  );

  // @ts-ignore
  return mergeObjectArrays(incomeOption, expenseOption);
}
