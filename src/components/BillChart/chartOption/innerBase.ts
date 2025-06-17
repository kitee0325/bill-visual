import { type BarSeriesOption, type EChartsOption } from 'echarts';
import type {
  AngleAxisOption,
  RadiusAxisOption,
} from 'echarts/types/dist/shared';
import { type InnerData } from './inner';

export interface InnerChartOptions {
  isIncome: boolean;
  extend: [number, number];
  colorMap: Record<string, string>;
}

interface SetSeriesDataOptions {
  rawData: number[];
  stackIndex: number;
  stackEnd: number[];
  category: string[];
  colorMap: Record<string, string>;
  isIncome: boolean;
}
/**
 * 获取系列值的堆叠结束位置
 * @param data
 * @returns
 */
function getStackEnd(data: InnerData) {
  const { value, increase, decrease } = data;
  return value.map((_, i) => {
    if (increase[i] > 0) return 1;
    if (decrease[i] > 0) return 2;
    return 0;
  });
}

/**
 * 根据堆叠顺序设置样式
 * @param data 数据
 * @param stackIndex 堆叠索引
 * @param stackEnd 堆叠结束位置
 * @param category 类别
 * @param colorMap 颜色映射
 * @param isIncome 是否是收入
 * @returns
 */
function setSeriesData(data: number[], options: SetSeriesDataOptions) {
  const { rawData, stackIndex, stackEnd, category, colorMap, isIncome } =
    options;
  return data.map((val, i) => {
    const isStackEnd = stackEnd[i] === stackIndex;
    const color = colorMap[category[i]];

    const itemStyle: BarSeriesOption['itemStyle'] = {
      borderRadius: [
        stackIndex === 0 ? 5 : 0,
        isStackEnd ? 5 : 0,
        stackIndex === 0 ? 5 : 0,
        isStackEnd ? 5 : 0,
      ],
    };

    if (stackIndex === 0) {
      itemStyle.color = color;
    }

    let label: BarSeriesOption['label'] = {
      show: false,
    };

    if (isStackEnd) {
      label = {
        show: true,
        formatter: (params: any) => {
          if (rawData[i] === 0) {
            return '';
          }
          return `{category|${category[i]}}\n{value|${rawData[i]}}`;
        },
        rich: {
          category: {
            fontSize: 14,
            color,
            fontWeight: 'bold',
          },
          value: {
            fontSize: 14,
            color: '#888',
            fontWeight: 'bold',
          },
        },
        position: isIncome ? 'end' : 'insideEnd',
      };
    }

    return {
      value: val,
      itemStyle,
      label,
    };
  });
}

export function createBasePolarOption(isIncome: boolean): EChartsOption {
  const polarIndex = isIncome ? 0 : 1;
  const endAngle = isIncome ? -90 : 270;

  return {
    polar: [
      {
        center: ['50%', '50%'],
        radius: ['0%', '30%'],
      },
    ],
    angleAxis: [
      {
        polarIndex,
        endAngle,
        axisTick: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: '#ddd',
            width: 4,
          },
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
    ],
    radiusAxis: [
      {
        polarIndex,
        type: 'category',
        axisTick: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: '#999',
            width: 3,
          },
        },
        axisLabel: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: `${isIncome ? 'income' : 'expense'}-value`,
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex,
        stack: `inner-${isIncome ? 'income' : 'expense'}`,
      },
      {
        name: `${isIncome ? 'income' : 'expense'}-increase`,
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex,
        stack: `inner-${isIncome ? 'income' : 'expense'}`,
        itemStyle: {
          color: '#ff7875',
          borderWidth: 2,
          borderColor: '#000',
        },
      },
      {
        name: `${isIncome ? 'income' : 'expense'}-decrease`,
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex,
        stack: `inner-${isIncome ? 'income' : 'expense'}`,
        itemStyle: {
          color: '#d9f7be',
          borderWidth: 2,
          borderColor: '#000',
          borderType: 'dashed',
        },
      },
    ],
  };
}

export function updateChartOption(
  baseOption: EChartsOption,
  data: InnerData,
  options: InnerChartOptions
): EChartsOption {
  const { category, increase, decrease, value, rawValue } = data;
  const { extend, colorMap, isIncome } = options;
  const stackEnd = getStackEnd(data);

  // step1:设置半径轴
  (baseOption.radiusAxis as RadiusAxisOption[])[0] = {
    ...(baseOption.radiusAxis as RadiusAxisOption[])[0],

    data: category,
  };

  // step2:设置角度轴
  (baseOption.angleAxis as AngleAxisOption[])[0] = {
    ...(baseOption.angleAxis as AngleAxisOption[])[0],
    min: extend[0],
    max: extend[1],
  };

  // step3:设置系列值
  const [formattedVal, formattedInc, formattedDec] = [
    value,
    increase,
    decrease,
  ].map((data, index) =>
    setSeriesData(data, {
      rawData: rawValue,
      stackIndex: index,
      stackEnd,
      category,
      colorMap,
      isIncome,
    })
  );

  (baseOption.series as BarSeriesOption[])[0] = {
    ...(baseOption.series as BarSeriesOption[])[0],
    data: formattedVal,
  };
  (baseOption.series as BarSeriesOption[])[1] = {
    ...(baseOption.series as BarSeriesOption[])[1],
    data: formattedInc,
  };
  (baseOption.series as BarSeriesOption[])[2] = {
    ...(baseOption.series as BarSeriesOption[])[2],
    data: formattedDec,
  };

  return baseOption;
}
