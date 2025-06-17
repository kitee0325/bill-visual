import {
  type BillRecord,
  type CategoryDiff,
  type TradeMinMax,
} from '../handleData';
import { getInnerOption } from './inner';
import { getOuterOption } from './outer';
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
  }
) {
  const { colorMap, categoryRank, tradeMinMax } = options;
  const innerOption = getInnerOption(categoryDiff, { colorMap, tradeMinMax });
  const outerOption = getOuterOption(records, { categoryRank, colorMap });
  // @ts-ignore
  return mergeObjectArrays(innerOption, outerOption);
}
