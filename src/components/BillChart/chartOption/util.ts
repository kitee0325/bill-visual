import type { ZRColor } from 'echarts/types/dist/shared';

/**
 * 合并两个对象，根据值的类型进行不同的合并策略
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @returns 合并后的对象
 *
 * 合并规则：
 * 1. 如果两个值都是数组，则合并数组
 * 2. 如果一个是数组，一个是其他类型，则将非数组值添加到数组中
 * 3. 如果两个都不是数组，则创建一个包含两个值的新数组
 * 4. 如果一个对象有某个键而另一个没有，则保留该键的值
 */
export function mergeObjectArrays<T = any>(
  obj1: Record<string, any>,
  obj2: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = { ...obj1 };

  // 合并所有的键
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  allKeys.forEach((key) => {
    const val1 = obj1[key];
    const val2 = obj2[key];

    // 如果其中一个对象没有这个键，保留另一个的值
    if (!(key in obj1)) {
      result[key] = val2;
      return;
    }
    if (!(key in obj2)) {
      result[key] = val1;
      return;
    }

    // 根据值的类型进行合并
    if (Array.isArray(val1) && Array.isArray(val2)) {
      // 两个都是数组，合并数组
      result[key] = [...val1, ...val2];
    } else if (Array.isArray(val1)) {
      // val1 是数组，val2 不是数组
      result[key] = [...val1, val2];
    } else if (Array.isArray(val2)) {
      // val2 是数组，val1 不是数组
      result[key] = [val1, ...val2];
    } else {
      // 都不是数组，创建新数组
      result[key] = [val1, val2];
    }
  });

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

/**
 * 给定一个 Date 对象，返回该月份每天的日期字符串数组，格式为 yyyy-MM-dd
 * @param date Date 对象
 * @returns 日期字符串数组
 */
export function getMonthDaysArray(date: Date): Date[] {
  const [startDate, endDate] = getMonthRange(date);
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

  return days;
}

/**
 * 将Date转为YYYY-MM-DD字符串
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 将HEX颜色值转换为RGBA数组
 * @param hex - 十六进制颜色值，格式为 "#RRGGBB" 或 "RRGGBB"
 * @param opacity - 不透明度，范围 0-1
 * @returns RGBA颜色值数组 [r, g, b, a]，r/g/b 范围 0-255，a 范围 0-1
 * @throws {Error} 当输入的hex格式不正确时抛出错误
 */
export function hexToRgba(hex: string, opacity: number): ZRColor {
  // 参数验证
  if (!hex) {
    throw new Error('HEX color value is required');
  }

  // 移除可能存在的 # 前缀
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // 验证hex格式
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error(
      'Invalid HEX color format. Expected format: #RRGGBB or RRGGBB'
    );
  }

  // 验证不透明度范围
  const validOpacity = Math.max(0, Math.min(1, opacity));

  // 将hex转换为rgb
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${validOpacity})` as ZRColor;
}
