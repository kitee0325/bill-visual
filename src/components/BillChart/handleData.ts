import {
  excelDateToJSDate,
  formatNumber,
  getMonthKey,
} from './chartOption/util';

export interface BillRecord {
  // 交易时间
  tradeTime: Date;
  // 交易分类
  tradeCategory: string;
  // 交易对方
  counterparty: string;
  // 对方账号
  counterpartyAccount: string;
  // 商品说明
  description: string;
  // 收/支
  incomeOrExpense: string;
  // 金额
  amount: number;
  // 支付/付款方式
  paymentMethod: string;
  // 交易状态
  tradeStatus: string;
  // 交易订单号
  tradeOrderId: string;
  // 商家订单号
  merchantOrderId: number;
  // 备注
  remark: string;
  [key: string]: any;
}

export type CategoryDiff = Record<
  string,
  Record<'increase' | 'decrease' | 'value', number>
>;

export type TradeMinMax = Record<
  'income' | 'expense',
  { min: number; max: number }
>;

/**
 * 按收入支出分类统计
 */
function groupByIncomeExpense<
  T extends { incomeOrExpense: string; amount: number }
>(
  records: T[],
  callback: (type: 'income' | 'expense', amount: number) => void
) {
  records.forEach((record) => {
    if (record.incomeOrExpense === '收入') {
      callback('income', record.amount);
    } else if (record.incomeOrExpense === '支出') {
      callback('expense', record.amount);
    }
  });
}

/**
 * 读取并解析表格数据
 * @param data PapaParse 解析出来的二维数组
 * @returns BillRecord[]
 */
export function parseBillData(data: any[][]): BillRecord[] {
  const startRow = data.findIndex((d) => d.includes('交易时间'));
  const records: BillRecord[] = [];
  for (let i = startRow + 1; i < data.length; i++) {
    const row = data[i];

    // 处理制表符
    row.forEach((cell, index) => {
      if (typeof cell === 'string' && cell.includes('\t')) {
        row[index] = cell.replace(/\t/g, '');
      }
    });

    // 解构
    const [
      tradeTime,
      tradeCategory,
      counterparty,
      counterpartyAccount,
      description,
      incomeOrExpense,
      amount,
      paymentMethod,
      tradeStatus,
      tradeOrderId,
      merchantOrderId,
      remark,
    ] = row;

    // 过滤无效数据：
    // 1.金额小于0.1
    // 2.非收入或支出
    // 3.交易状态不为交易成功
    if (
      amount < 0.1 ||
      !['收入', '支出'].includes(incomeOrExpense) ||
      tradeStatus !== '交易成功'
    ) {
      continue;
    }

    const record: BillRecord = {
      id: crypto.randomUUID(),
      tradeTime: excelDateToJSDate(tradeTime),
      tradeCategory,
      counterparty,
      counterpartyAccount,
      description,
      incomeOrExpense,
      amount: formatNumber(Number(amount)),
      paymentMethod,
      tradeStatus,
      tradeOrderId: tradeOrderId || -1,
      merchantOrderId: merchantOrderId || -1,
      remark: remark || '',
    };

    records.push(record);
  }

  // 按照时间排序，避免用户手动操作表格带来的顺序不一致问题
  records.sort((a, b) => a.tradeTime.getTime() - b.tradeTime.getTime());

  return records;
}

/** 计算全周期中，单笔交易支出和收入的极值
 *
 */
export function getTradeMinMax(records: BillRecord[]): TradeMinMax {
  const result: TradeMinMax = {
    income: { min: Infinity, max: -Infinity },
    expense: { min: Infinity, max: -Infinity },
  };

  groupByIncomeExpense(records, (type, amount) => {
    result[type].min = Math.min(result[type].min, amount);
    result[type].max = Math.max(result[type].max, amount);
  });

  return result;
}

/** 计算全周期中，按类型，每月累计收支的极值
 *
 */
export function getMonthlyTradeMinMax(
  incomeStatistics: Record<string, number>[],
  expenseStatistics: Record<string, number>[]
) {
  const result: TradeMinMax = {
    income: { min: Infinity, max: -Infinity },
    expense: { min: Infinity, max: -Infinity },
  };

  incomeStatistics.forEach((income) => {
    Object.values(income).forEach((value) => {
      result.income.min = Math.min(result.income.min, value);
      result.income.max = Math.max(result.income.max, value);
    });
  });

  expenseStatistics.forEach((expense) => {
    Object.values(expense).forEach((value) => {
      result.expense.min = Math.min(result.expense.min, value);
      result.expense.max = Math.max(result.expense.max, value);
    });
  });

  return result;
}

/** 按月份分组
 *
 */
export function groupDataByMonth(records: BillRecord[], monthList: string[]) {
  const result: Record<string, BillRecord[]> = {};

  records.forEach((record) => {
    const monthKey = getMonthKey(record.tradeTime);
    if (monthList.includes(monthKey)) {
      if (!result[monthKey]) {
        result[monthKey] = [];
      }
      result[monthKey].push(record);
    }
  });

  return result;
}

// 统计收入和支出类别的总金额，并按金额从大到小排序，返回类别名称数组
export function getSortedCategoriesByAmount(records: BillRecord[]) {
  const incomeMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};

  records.forEach((record) => {
    const { tradeCategory, amount, incomeOrExpense } = record;
    if (incomeOrExpense === '收入') {
      incomeMap[tradeCategory] = formatNumber(
        (incomeMap[tradeCategory] || 0) + amount
      );
    } else if (incomeOrExpense === '支出') {
      expenseMap[tradeCategory] = formatNumber(
        (expenseMap[tradeCategory] || 0) + amount
      );
    }
  });

  const income = Object.entries(incomeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
  const expense = Object.entries(expenseMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return { income, expense };
}

// 类别颜色映射
export function getCategoryColorMap(categories: {
  income: string[];
  expense: string[];
}) {
  const palette = [
    '#72adff',
    '#bf98ff',
    '#ff80c8',
    '#ff8b69',
    '#629f00',
    '#94b81f',
    '#00c292',
    '#00bcd7',
  ];

  const { income, expense } = categories;
  const categoryColorMap: Record<string, string> = {};
  income.forEach((category, index) => {
    categoryColorMap[category] = palette[index % palette.length];
  });
  expense.forEach((category, index) => {
    categoryColorMap[category] = palette[index % palette.length];
  });
  return categoryColorMap;
}

/**
 * 按类别统计每月的收支并计算环差
 * @param records
 * @returns
 */
export function getCategoriesDiff(
  records: Record<string, BillRecord[]>,
  categories: { income: string[]; expense: string[] }
) {
  const { income, expense } = categories;
  const incomeStatistics: Record<string, number>[] = [];
  const expenseStatistics: Record<string, number>[] = [];

  Object.values(records).forEach((monthRecords) => {
    const monthIncomeStatistics = Object.fromEntries(income.map((d) => [d, 0]));
    const monthExpenseStatistics = Object.fromEntries(
      expense.map((d) => [d, 0])
    );

    monthRecords.forEach((record) => {
      const { tradeCategory, amount, incomeOrExpense } = record;
      if (
        incomeOrExpense === '收入' &&
        monthIncomeStatistics[tradeCategory] !== undefined
      ) {
        monthIncomeStatistics[tradeCategory] = formatNumber(
          monthIncomeStatistics[tradeCategory] + amount
        );
      } else if (
        incomeOrExpense === '支出' &&
        monthExpenseStatistics[tradeCategory] !== undefined
      ) {
        monthExpenseStatistics[tradeCategory] = formatNumber(
          monthExpenseStatistics[tradeCategory] + amount
        );
      }
    });

    incomeStatistics.push(monthIncomeStatistics);
    expenseStatistics.push(monthExpenseStatistics);
  });

  // 计算环差
  function calculateDiff(statistics: Record<string, number>[]): CategoryDiff[] {
    return statistics.map((monthData, i) => {
      return Object.keys(monthData).reduce((acc, category) => {
        const lastValue = statistics[i - 1]
          ? formatNumber(statistics[i - 1][category])
          : 0;
        const currentValue = formatNumber(monthData[category]);
        let diff = lastValue === 0 ? 0 : formatNumber(currentValue - lastValue);

        // 如果差值小于10元或差值占值的比例小于5%，则认为差值为0
        if (
          Math.abs(diff) < 10 ||
          (currentValue !== 0 && Math.abs(diff) / currentValue < 0.05)
        ) {
          diff = 0;
        }

        acc[category] = {
          increase: diff > 0 ? formatNumber(diff) : 0,
          decrease: diff < 0 ? formatNumber(-diff) : 0,
          value:
            diff > 0
              ? formatNumber(currentValue - diff)
              : formatNumber(currentValue),
        };
        return acc;
      }, {} as CategoryDiff);
    });
  }

  const incomeDiff = calculateDiff(incomeStatistics);
  const expenseDiff = calculateDiff(expenseStatistics);

  const categoryDiff = incomeDiff.map((income, i) => ({
    income,
    expense: expenseDiff[i],
  }));

  return {
    incomeStatistics,
    expenseStatistics,
    categoryDiff,
  };
}

export function getMonthList(records: BillRecord[]) {
  const monthSet = new Set(records.map((r) => getMonthKey(r.tradeTime)));
  return Array.from(monthSet).sort((a, b) => a.localeCompare(b));
}

export function processBillData(billData: any[][]) {
  // 全周期数据处理
  const records = parseBillData(billData);
  // 计算全周期中，单笔支出和收入的极值
  const tradeMinMax = getTradeMinMax(records);
  // 获取月份统计
  const monthList = getMonthList(records);
  // 类别统计
  const categoryRank = getSortedCategoriesByAmount(records);
  // 类别颜色映射
  const colorMap = getCategoryColorMap(categoryRank);

  return {
    records,
    tradeMinMax,
    monthList,
    colorMap,
  };
}

export function getFilteredBillData(
  records: BillRecord[],
  range: TradeMinMax,
  monthList: string[],
  monthIndex = 0
) {
  const { income, expense } = range;
  const filteredRecords = records.filter((r) => {
    const { min, max } = r.incomeOrExpense === '收入' ? income : expense;
    return r.amount >= min && r.amount <= max;
  });

  // 计算全周期中，单笔支出和收入的极值
  const tradeMinMax = getTradeMinMax(filteredRecords);
  // 类别统计
  const categoryRank = getSortedCategoriesByAmount(filteredRecords);
  // 数据分期
  const statisticGroupByMonth = groupDataByMonth(filteredRecords, monthList);
  // 计算环差
  const {
    incomeStatistics,
    expenseStatistics,
    categoryDiff: categoryDiffArr,
  } = getCategoriesDiff(statisticGroupByMonth, categoryRank);
  // 根据statistic计算全周期，各类型按月累计的最值
  const monthlyTradeMinMax = getMonthlyTradeMinMax(
    incomeStatistics,
    expenseStatistics
  );

  // 获取当前月份的数据
  const categoryDiff = categoryDiffArr[monthIndex];
  const monthStatistic = statisticGroupByMonth[monthList[monthIndex]];

  return {
    monthStatistic,
    categoryRank,
    categoryDiff,
    tradeMinMax,
    monthlyTradeMinMax,
  };
}
