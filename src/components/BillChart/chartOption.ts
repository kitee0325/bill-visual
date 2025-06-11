import type { EChartsOption, SeriesOption } from 'echarts';
import { type BillRecord, type CategoryStatisticsDiff } from './handleData';
import type {
  AngleAxisOption,
  RadiusAxisOption,
} from 'echarts/types/dist/shared';

function getInnerCycleData(
  CategoriesStatisticsDiff: CategoryStatisticsDiff,
  n = 5
) {
  // 取value前N且不为零的键值对
  const data: CategoryStatisticsDiff = Object.keys(CategoriesStatisticsDiff)
    .sort(
      (a, b) =>
        CategoriesStatisticsDiff[b].value - CategoriesStatisticsDiff[a].value
    )
    .filter((key) => CategoriesStatisticsDiff[key].value !== 0)
    .slice(0, n)
    .reduce((acc, key) => {
      acc[key] = CategoriesStatisticsDiff[key];
      return acc;
    }, {} as CategoryStatisticsDiff);

  // 转为四个数组：category, increase, decrease, value
  const category = Object.keys(data);
  const increase = Object.values(data).map((d) => d.increase);
  const decrease = Object.values(data).map((d) => d.decrease);
  const value = Object.values(data).map((d) => d.value);

  // 将category的长度补齐为N
  if (category.length < n) {
    category.push(...Array.from({ length: n - category.length }, () => ''));
  }

  return { category, increase, decrease, value };
}

function getNiceMinMax(data: number[]) {
  const splitNumber = 5; // 内部固定分割段数
  let min = Math.min(...data);
  let max = Math.max(...data);
  // 避免出现半圆，视觉效果不好
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
}
export function getChartOption(
  records: BillRecord[],
  categoryStatisticDiff: {
    income: CategoryStatisticsDiff;
    expense: CategoryStatisticsDiff;
  }
) {
  const defaultChartOption: EChartsOption = {
    polar: [
      {
        center: ['50%', '50%'],
        radius: ['0%', '30%'],
      },
      {
        center: ['50%', '50%'],
        radius: ['0%', '30%'],
      },
      //   {
      //     center: ['50%', '50%'],
      //     radius: ['35%', '65%'],
      //   },
      //   {
      //     center: ['50%', '50%'],
      //     radius: ['65%', '95%'],
      //   },
    ],
    angleAxis: [
      {
        polarIndex: 0,
        startAngle: 90,
        endAngle: -90,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      {
        polarIndex: 1,
        startAngle: 90,
        endAngle: 270,
        clockwise: false,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      //   {
      //     polarIndex: 2,
      //     startAngle: 90,
      //   },
      //   {
      //     polarIndex: 3,
      //     startAngle: 90,
      //   },
    ],
    radiusAxis: [
      {
        polarIndex: 0,
        type: 'category',
        inverse: true,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      {
        polarIndex: 1,
        type: 'category',
        inverse: true,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
    ],
    series: [
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 0,
        stack: 'income',
      },
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 0,
        stack: 'income',
        label: {
          show: true,
          position: 'end',
          formatter: (params) => {
            return `{label|${params.name}}\n{value|${params.value}}`;
          },
          rich: {
            label: {
              color: 'inherit',
            },
            value: {
              color: '#888',
              fontWeight: 'bold',
              fontSize: 14,
              lineHeight: 20,
            },
          },
        },
      },
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 0,
        stack: 'income',
      },
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 1,
        stack: 'expense',
      },
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 1,
        stack: 'expense',
        label: {
          show: true,
          position: 'insideEnd',
          formatter: (params) => {
            return `{label|${params.name}}\n{value|${params.value}}`;
          },
          rich: {
            label: {
              color: 'inherit',
            },
            value: {
              color: '#888',
              fontWeight: 'bold',
              fontSize: 14,
              lineHeight: 20,
            },
          },
        },
      },
      {
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex: 1,
        stack: 'expense',
      },
    ],
  };

  // 获取内环数据
  const { income, expense } = categoryStatisticDiff;
  const {
    category: incomeCategory,
    increase: incomeIncrease,
    decrease: incomeDecrease,
    value: incomeValue,
  } = getInnerCycleData(income);
  const {
    category: expenseCategory,
    increase: expenseIncrease,
    decrease: expenseDecrease,
    value: expenseValue,
  } = getInnerCycleData(expense);

  const [min, max] = getNiceMinMax([...incomeValue, ...expenseValue]);

  // @ts-ignore
  (defaultChartOption.radiusAxis as RadiusAxisOption[])[0].data =
    incomeCategory;
  // @ts-ignore
  (defaultChartOption.radiusAxis as RadiusAxisOption[])[1].data =
    expenseCategory;
  (defaultChartOption.angleAxis as AngleAxisOption[])[0].min = min;
  (defaultChartOption.angleAxis as AngleAxisOption[])[0].max = max;
  (defaultChartOption.angleAxis as AngleAxisOption[])[1].min = min;
  (defaultChartOption.angleAxis as AngleAxisOption[])[1].max = max;

  (defaultChartOption.series as SeriesOption[])[0].data = incomeIncrease;
  (defaultChartOption.series as SeriesOption[])[1].data = incomeValue;
  (defaultChartOption.series as SeriesOption[])[2].data = incomeDecrease;
  (defaultChartOption.series as SeriesOption[])[3].data = expenseIncrease;
  (defaultChartOption.series as SeriesOption[])[4].data = expenseValue;
  (defaultChartOption.series as SeriesOption[])[5].data = expenseDecrease;

  return defaultChartOption;
}
