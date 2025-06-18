import {
  type BillRecord,
  type CategoryDiff,
  type TradeMinMax,
} from '../handleData';
import { getInnerOption } from './inner';
import { getOuterOption, getScatterOption } from './outer';
import { mergeObjectArrays } from './util';

export function getChartOption(
  records: BillRecord[],
  categoryDiff: {
    income: CategoryDiff;
    expense: CategoryDiff;
  },
  options: {
    colorMap: Record<string, string>;
    categoryRank: {
      income: string[];
      expense: string[];
    };
    tradeMinMax: TradeMinMax;
    monthlyTradeMinMax: TradeMinMax;
  }
) {
  const { colorMap, categoryRank, tradeMinMax, monthlyTradeMinMax } = options;
  const innerOption = getInnerOption(categoryDiff, {
    colorMap,
    tradeMinMax: monthlyTradeMinMax,
  });
  const outerOption = getOuterOption(records, { categoryRank, colorMap });
  const scatterOption = getScatterOption(records, { colorMap, tradeMinMax });
  const tempOption = mergeObjectArrays(innerOption, outerOption);

  // @ts-ignore
  return mergeObjectArrays(tempOption, scatterOption);
}
