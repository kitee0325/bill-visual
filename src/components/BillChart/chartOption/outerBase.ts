import { type EChartsOption, type LineSeriesOption } from 'echarts';
import type { OuterData } from './outer';
import { getMonthRange } from './util';
import type { AngleAxisOption } from 'echarts/types/dist/shared';
import type { BillRecord } from '../handleData';

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
    legend: {},
    polar: [
      {
        center: ['50%', '50%'],
        radius: [startRadius, endRadius],
      },
    ],
    angleAxis: [
      {
        polarIndex,
        type: 'time',
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
        },
        axisTick: {
          show: false,
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
  timeRange: [Date, Date]
): Record<string, OuterData[]> {
  // 1. 生成 timeRange 内所有日期（每天 12:00）
  const [startDate, endDate] = timeRange;
  const days: Date[] = [];
  for (
    let cur = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      12,
      0,
      0,
      0
    );
    cur <= endDate;
    cur.setDate(cur.getDate() + 1)
  ) {
    days.push(new Date(cur));
  }

  // 2. 日期字符串映射，便于查找
  const dayStrMap = new Map<string, number>();
  days.forEach((d, idx) => {
    dayStrMap.set(d.toDateString(), idx);
  });

  // 3. 初始化 dataGroup
  const dataGroup: Record<string, OuterData[]> = categoryRank.reduce(
    (acc, category) => {
      acc[category] = days.map((d) => ({
        id: crypto.randomUUID(),
        amount: 0,
        tradeTime: new Date(d),
        tradeCategory: category,
      }));
      return acc;
    },
    {} as Record<string, OuterData[]>
  );

  // 4. 累加数据
  data.forEach((item) => {
    const category = item.tradeCategory;
    const idx = dayStrMap.get(item.tradeTime.toDateString());
    if (idx !== undefined && dataGroup[category]) {
      dataGroup[category][idx].amount += item.amount;
    }
  });

  // 5. 为每个 category 的数组头部和尾部添加数据对象，实现首尾相连
  Object.entries(dataGroup).forEach(([category, arr]) => {
    if (arr.length === 0) return;
    const first = arr[0];
    const last = arr[arr.length - 1];
    const avgAmount = Number(((first.amount + last.amount) / 2).toFixed(2));
    // 本月第一天 00:00:00
    const headTime = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    // 本月最后一天 23:59:59
    const lastDay = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0
    ); // 最后一天
    const tailTime = new Date(
      lastDay.getFullYear(),
      lastDay.getMonth(),
      lastDay.getDate(),
      23,
      59,
      59,
      0
    );
    arr.unshift({
      id: crypto.randomUUID(),
      amount: avgAmount,
      tradeTime: headTime,
      tradeCategory: category,
    });
    arr.push({
      id: crypto.randomUUID(),
      amount: avgAmount,
      tradeTime: tailTime,
      tradeCategory: category,
    });
  });

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

  // step1: 获取时间范围并设置时间轴，让时间轴总是以月为单位
  const timeRange = getMonthRange(data[0].tradeTime);
  (baseOption.angleAxis as AngleAxisOption[])[0] = {
    ...(baseOption.angleAxis as AngleAxisOption[])[0],
    min: timeRange[0],
    max: timeRange[1],
  };

  // step2: 数据预处理
  const dataGroup = buildCategoryDateGroup(data, categoryRank, timeRange);

  // step3: 设置series
  const series: LineSeriesOption[] = Object.entries(dataGroup)
    .filter(([key, value]) => value.length > 0)
    .map(([key, value]) => {
      return {
        name: `${isIncome ? 'income' : 'expense'}-${key}`,
        polarIndex: isIncome ? 2 : 3,
        coordinateSystem: 'polar',
        stack: `${isIncome ? 'income' : 'expense'}`,
        type: 'line',
        data: value.map((item) => [item.amount, item.tradeTime]),
        // showSymbol: false,
        smooth: 0.5,
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
