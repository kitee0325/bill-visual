import { type EChartsOption, type LineSeriesOption } from 'echarts';
import type { OuterData } from './outer';
import type { BillRecord } from '../handleData';
import { getMonthDaysArray, formatDate } from './util';

export interface OuterChartOptions {
  isIncome: boolean;
  idMap: Record<string, BillRecord>;
  colorMap: Record<string, string>;
  categoryRank: string[];
}

export function createOuterBaseOption(isIncome: boolean): EChartsOption {
  const startRadius = isIncome ? '30%' : '60%';
  const endRadius = isIncome ? '60%' : '90%';
  const polarIndex = isIncome ? 2 : 3;

  return {
    polar: [
      {
        center: ['50%', '50%'],
        radius: [startRadius, endRadius],
      },
    ],
    angleAxis: [
      {
        polarIndex,
        type: 'category',
        axisLine: {
          show: isIncome,
          lineStyle: {
            color: '#ddd',
            width: 3,
          },
        },
        axisLabel: {
          show: isIncome,
          color: '#999',
          fontSize: 14,
          fontWeight: 'bold',
          formatter: (value: string, index: number) => {
            const [year, month, day] = value.split('-');
            if (index === 0) {
              return `${year}-${month}-${day}`;
            }
            return `${month}-${day}`;
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#ddd',
          },
        },
      },
    ],
    radiusAxis: [
      {
        polarIndex,
        inverse: isIncome,
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#999',
            width: 2,
          },
        },
        axisLabel: {
          show: true,
          color: '#999',
          fontSize: 14,
          fontWeight: 'bold',
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: '#ddd',
          },
        },
      },
    ],
  };
}

function buildCategoryDateGroup(
  data: OuterData[],
  categoryRank: string[],
  days: Date[]
): Record<string, OuterData[]> {
  // 1. 日期字符串映射，便于查找
  const dayStrMap = new Map<string, number>();
  days.forEach((d, idx) => {
    dayStrMap.set(d.toDateString(), idx);
  });

  // 2. 初始化 dataGroup
  const dataGroup: Record<string, OuterData[]> = {};
  for (const category of categoryRank) {
    dataGroup[category] = days.map((d) => ({
      id: crypto.randomUUID(),
      amount: 0,
      tradeTime: d,
      tradeCategory: category,
    }));
  }

  // 3. 累加数据
  for (const item of data) {
    const category = item.tradeCategory;
    const idx = dayStrMap.get(item.tradeTime.toDateString());
    if (idx !== undefined && dataGroup[category]) {
      dataGroup[category][idx].amount += item.amount;
    }
  }

  // 4. 在数组尾部添加头部的拷贝，使得在极坐标下，曲线闭合
  for (const category of categoryRank) {
    const arr = dataGroup[category];
    if (arr && arr.length > 0) {
      // 拷贝第一个元素，生成新的 id
      const first = { ...arr[0], id: crypto.randomUUID() };
      arr.push(first);
    }
  }

  return dataGroup;
}

export function updateChartOption(
  baseOption: EChartsOption,
  data: OuterData[],
  options: {
    isIncome: boolean;
    colorMap: Record<string, string>;
    idMap: Record<string, BillRecord>;
    categoryRank: string[];
  }
): EChartsOption {
  const { isIncome, colorMap, categoryRank, idMap } = options;

  // step1: 获取时间轴数组，格式为 Date
  const days = getMonthDaysArray(data[0].tradeTime);

  // step2: 数据预处理
  const dataGroup = buildCategoryDateGroup(data, categoryRank, days);

  // step3: 设置series
  const series: LineSeriesOption[] = Object.entries(dataGroup)
    .filter(([key, value]) => value.length > 0)
    .map(([key, value]) => {
      return {
        name: `${isIncome ? '收入' : '支出'}:${key}`,
        type: 'line',
        coordinateSystem: 'polar',
        polarIndex: isIncome ? 2 : 3,
        stack: `outer-${isIncome ? 'income' : 'expense'}`,
        data: value.map((item) => [item.amount, formatDate(item.tradeTime)]),
        showSymbol: false,
        smooth: 0.4,
        silent: true,
        itemStyle: {
          color: colorMap[key],
        },
        lineStyle: {
          color: colorMap[key],
        },
        areaStyle: {
          color: colorMap[key],
        },
      };
    });

  (baseOption.series as LineSeriesOption[]) = series;

  return baseOption;
}
