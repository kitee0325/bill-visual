import { type BillRecord, type CategoryDiff } from '../handleData';
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
  }
) {
  const { colorMap, categoryRank } = options;
  const innerOption = getInnerOption(categoryDiff, colorMap);
  const outerOption = getOuterOption(records, { categoryRank, colorMap });

  console.log(outerOption);

  // @ts-ignore
  return mergeObjectArrays(innerOption, outerOption);
}
