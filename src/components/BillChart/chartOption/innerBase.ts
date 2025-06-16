import { type BarSeriesOption, type EChartsOption } from 'echarts';
import type {
  AngleAxisOption,
  RadiusAxisOption,
} from 'echarts/types/dist/shared';
import { type InnerData } from './inner';

export interface InnerChartOptions {
  extend: [number, number];
  colorMap: Record<string, string>;
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
 * @returns
 */
function setSeriesData(
  data: number[],
  rawData: number[],
  stackIndex: number,
  stackEnd: number[],
  category: string[],
  colorMap: Record<string, string>
) {
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
        position: 'end',
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
  const startAngle = isIncome ? 90 : -90;
  const endAngle = isIncome ? -90 : -270;

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
        startAngle,
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
        inverse: true,
        axisTick: {
          show: false,
        },
        axisLine: {
          // show: false,
          lineStyle: {
            color: '#ddd',
            width: 3,
            type: 'dashed',
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
        stack: `${isIncome ? 'income' : 'expense'}`,
      },
      {
        name: `${isIncome ? 'income' : 'expense'}-increase`,
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex,
        stack: `${isIncome ? 'income' : 'expense'}`,
        itemStyle: {
          color: '#f5222d',
        },
      },
      {
        name: `${isIncome ? 'income' : 'expense'}-decrease`,
        type: 'bar',
        coordinateSystem: 'polar',
        polarIndex,
        stack: `${isIncome ? 'income' : 'expense'}`,
        itemStyle: {
          color: '#52c41a',
          opacity: 0.5,
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
  const { extend, colorMap } = options;
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
    setSeriesData(data, rawValue, index, stackEnd, category, colorMap)
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
