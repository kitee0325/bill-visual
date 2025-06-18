import {
  type EChartsOption,
  type LineSeriesOption,
  type ScatterSeriesOption,
} from 'echarts';
import type { AngleAxisOption, LegendOption } from 'echarts/types/dist/shared';
import type { OuterData } from './outer';
import type { BillRecord, TradeMinMax } from '../handleData';
import { getMonthDaysArray, formatDate, getMonthRange } from './util';

export interface OuterScatterChartOptions {
  isIncome: boolean;
  idMap: Record<string, BillRecord>;

  colorMap: Record<string, string>;

  tradeMinMax: TradeMinMax;
}

export interface OuterStackLineChartOptions {
  isIncome: boolean;
  colorMap: Record<string, string>;

  categoryRank: string[];
}

export function createOuterBaseOption(
  isIncome: boolean,
  isLine: boolean
): EChartsOption {
  const BASE_POLAR_INDEX = isLine ? 2 : 4;
  const startRadius = isIncome ? '30%' : '60%';
  const endRadius = isIncome ? '60%' : '90%';
  const polarIndex = BASE_POLAR_INDEX + (isIncome ? 0 : 1);

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
        show: isLine,
        type: isLine ? 'category' : 'time',
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
        show: isLine,
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
    tooltip: {},
  };
}

const SCATTER_SYMBOL_SIZE = [10, 48];

/**
 * 以日为单位聚合数据
 * @param data
 * @param categoryRank
 * @param days
 * @returns
 */
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

function groupDataByCategory(data: OuterData[]): Record<string, OuterData[]> {
  return data.reduce((acc, item) => {
    acc[item.tradeCategory] = acc[item.tradeCategory] || [];
    acc[item.tradeCategory].push(item);
    return acc;
  }, {} as Record<string, OuterData[]>);
}

export function updateStackLineOption(
  baseOption: EChartsOption,
  data: OuterData[],
  options: {
    isIncome: boolean;
    colorMap: Record<string, string>;
    categoryRank: string[];
  }
): EChartsOption {
  if (!data.length) {
    return baseOption;
  }

  const { isIncome, colorMap, categoryRank } = options;

  // step1: 获取时间轴数组，格式为 Date
  const days = getMonthDaysArray(data[0].tradeTime);

  // step2: 数据预处理
  const dataGroup = buildCategoryDateGroup(data, categoryRank, days);

  // step3: 设置series
  const series: LineSeriesOption[] = Object.entries(dataGroup)
    .filter(([key, value]) => value.length > 0)
    .map(([key, value]) => {
      return {
        name: `${isIncome ? 'income' : 'expense'}-${key}`,
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

export function updateScatterOption(
  baseOption: EChartsOption,
  data: OuterData[],
  options: {
    isIncome: boolean;
    idMap: Record<string, BillRecord>;
    colorMap: Record<string, string>;
    tradeMinMax: TradeMinMax;
  }
): EChartsOption {
  if (!data.length) {
    return baseOption;
  }

  const { isIncome, colorMap, idMap, tradeMinMax } = options;
  const dataGroup = groupDataByCategory(data);
  const minMax = tradeMinMax[isIncome ? 'income' : 'expense'];

  // step1: 获取时间范围，手动设定时间轴/角度轴
  const [startDate, endDate] = getMonthRange(data[0].tradeTime);
  (baseOption.angleAxis as AngleAxisOption[])[0] = {
    ...(baseOption.angleAxis as AngleAxisOption[])[0],
    min: startDate,
    max: endDate,
  };

  // step2: 生成系列值
  const series: ScatterSeriesOption[] = Object.entries(dataGroup).map(
    ([key, value]) => {
      return {
        id: `${isIncome ? '收入' : '支出'}-${key}`,
        name: `${key}`,
        type: 'scatter',
        coordinateSystem: 'polar',
        polarIndex: isIncome ? 4 : 5,
        data: value.map((item) => {
          return {
            id: item.id,
            value: [item.amount, item.tradeTime],
          };
        }),
        itemStyle: {
          color: colorMap[key],
        },
        symbolSize: (value) => {
          const [amount] = value;
          const size = (amount - minMax.min) / (minMax.max - minMax.min);
          return (
            SCATTER_SYMBOL_SIZE[0] +
            (SCATTER_SYMBOL_SIZE[1] - SCATTER_SYMBOL_SIZE[0]) * size
          );
        },
        tooltip: {
          show: true,
          formatter: (params) => {
            const { data } = params;
            const { id } = data as any;
            const rawData = idMap[id];
            const {
              tradeTime,
              amount,
              tradeCategory,
              counterparty,
              description,
            } = rawData;
            return `
            <div style="
              background: #fff;
              border-radius: 8px;
              padding: 12px;
              box-shadow: 0 2px 12px rgba(0,0,0,0.1);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-width: 240px;
            ">
              <div style="
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 8px;
                margin-bottom: 8px;
                align-items: center;
              ">
                <div style="color: #666; white-space: nowrap;">${formatDate(
                  tradeTime
                )}</div>
                <div style="color: #333; font-weight: 600; text-align: right;">¥${amount}</div>
                <div style="
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  padding: 2px 8px;
                  background: ${colorMap[tradeCategory]}22;
                  color: ${colorMap[tradeCategory]};
                  border-radius: 12px;
                  font-size: 12px;
                  width: fit-content;
                ">${tradeCategory}</div>
                <div style="color: #666; text-align: right; overflow: hidden; text-overflow: ellipsis;">${
                  counterparty || '-'
                }</div>
              </div>
              <div style="
                color: #666;
                font-size: 13px;
                border-top: 1px solid #eee;
                padding-top: 8px;
              ">${description || '-'}</div>
            </div>
            `;
          },
        },
      };
    }
  );

  // step3: 设置legend
  (baseOption.legend as LegendOption) = {
    data: series.map((item) => item.name as string),
    top: `${isIncome ? '0px' : '20px'}`,
  };

  (baseOption.series as ScatterSeriesOption[]) = series;

  return baseOption;
}
