/**
 * 合并两个对象中的数组
 * @param obj1
 * @param obj2
 * @returns
 */
export function mergeObjectArrays<T = any>(
  obj1: Record<string, T[]>,
  obj2: Record<string, T[]>
): Record<string, T[]> {
  const result: Record<string, T[]> = { ...obj1 };
  for (const key in obj2) {
    if (Array.isArray(obj2[key]) && Array.isArray(obj1[key])) {
      result[key] = obj1[key].concat(obj2[key]);
    }
  }
  return result;
}

/**
 * 获取指定日期所在月份的起始和结束时间
 * @param date 日期对象
 * @returns [月初时间, 月末时间]
 */
export function getMonthRange(date: Date): [Date, Date] {
  const year = date.getFullYear();
  const month = date.getMonth();

  // 月初时间：当月1号 00:00:00
  const startDate = new Date(year, month, 1, 0, 0, 0);

  // 月末时间：下月1号 00:00:00 减去1毫秒
  const endDate = new Date(year, month + 1, 1, 0, 0, 0);
  endDate.setMilliseconds(-1);

  return [startDate, endDate];
}
