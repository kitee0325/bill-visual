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
 * Excel序列号转JS日期
 * @param serial
 * @returns
 */
function excelDateToJSDate(serial: number | string) {
  // 异常值处理，部分日期不是严格的excel数字，而是'2025-01-01 00:00:00'这种格式
  if (typeof serial === 'string') {
    return new Date(serial);
  }
  // Excel序列号转JS日期
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; // 86400秒/天
  const date_info = new Date(utc_value * 1000);

  // 处理小数部分（时间）
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  date_info.setHours(hours);
  date_info.setMinutes(minutes);
  date_info.setSeconds(seconds);

  return date_info;
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
      tradeCategory: tradeCategory,
      counterparty: counterparty,
      counterpartyAccount: counterpartyAccount,
      description: description,
      incomeOrExpense: incomeOrExpense,
      amount,
      paymentMethod: paymentMethod,
      tradeStatus: tradeStatus,
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

/** 计算全周期中，支出和收入的极值
 *
 */
export function getTradeMinMax(records: BillRecord[]): TradeMinMax {
  const income = records
    .filter((r) => r.incomeOrExpense === '收入')
    .map((r) => r.amount);
  const expense = records
    .filter((r) => r.incomeOrExpense === '支出')
    .map((r) => r.amount);
  return {
    income: {
      min: Math.min(...income),
      max: Math.max(...income),
    },
    expense: {
      min: Math.min(...expense),
      max: Math.max(...expense),
    },
  };
}

export function groupDataByMonth(records: BillRecord[]) {
  const monthStatistics: Record<string, BillRecord[]> = {};
  records.forEach((record) => {
    const month = record.tradeTime.getMonth() + 1;
    if (!monthStatistics[month]) {
      monthStatistics[month] = [];
    }
    monthStatistics[month].push(record);
  });

  return monthStatistics;
}

// 统计收入和支出类别的总金额，并按金额从大到小排序，返回类别名称数组
export function getSortedCategoriesByAmount(records: BillRecord[]) {
  const incomeMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};

  records.forEach((record) => {
    const category = record.tradeCategory;
    if (record.incomeOrExpense === '收入') {
      incomeMap[category] = (incomeMap[category] || 0) + record.amount;
    } else if (record.incomeOrExpense === '支出') {
      expenseMap[category] = (expenseMap[category] || 0) + record.amount;
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
  const incomeStatistics: Record<string, number>[] = [];
  const expenseStatistics: Record<string, number>[] = [];
  const { income, expense } = categories;

  Object.values(records).forEach((monthRecords) => {
    const monthIncomeStatistics: Record<string, number> = income.reduce(
      (acc, d) => {
        acc[d] = 0;
        return acc;
      },
      {} as Record<string, number>
    );
    const monthExpenseStatistics: Record<string, number> = expense.reduce(
      (acc, d) => {
        acc[d] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    monthRecords.forEach((record) => {
      const category = record.tradeCategory;
      if (record.incomeOrExpense === '收入') {
        monthIncomeStatistics[category] += record.amount;
      } else {
        monthExpenseStatistics[category] += record.amount;
      }
    });

    incomeStatistics.push(monthIncomeStatistics);
    expenseStatistics.push(monthExpenseStatistics);
  });

  // 计算环差
  function calculateDiff(statistics: Record<string, number>[]): CategoryDiff[] {
    return statistics.map((monthData, i) => {
      return Object.keys(monthData).reduce((acc, d) => {
        const lastValue = statistics[i - 1] ? statistics[i - 1][d] : 0;
        let diff =
          lastValue === 0 ? 0 : Number((monthData[d] - lastValue).toFixed(2));

        // 如果差值小于10元或差值占值的比例小于5%，则认为差值为0
        if (Math.abs(diff) < 10 || Math.abs(diff) / monthData[d] < 0.05) {
          diff = 0;
        }

        acc[d] = {
          increase: diff > 0 ? diff : 0,
          decrease: diff < 0 ? -diff : 0,
          value:
            diff > 0 ? Number((monthData[d] - diff).toFixed(2)) : monthData[d],
        };
        return acc;
      }, {} as CategoryDiff);
    });
  }

  const incomeDiff = calculateDiff(incomeStatistics);
  const expenseDiff = calculateDiff(expenseStatistics);

  const result = [];
  for (let i = 0; i < incomeDiff.length; i++) {
    result.push({
      income: incomeDiff[i],
      expense: expenseDiff[i],
    });
  }

  return result;
}

export function processBillData(billData: any[][]) {
  // 全周期数据处理
  const records = parseBillData(billData);
  // 计算全周期中，支出和收入的极值
  const tradeMinMax = getTradeMinMax(records);
  // 类别统计
  const categoryRank = getSortedCategoriesByAmount(records);
  // 类别颜色映射
  const colorMap = getCategoryColorMap(categoryRank);
  // 数据分期
  const monthStatistics = groupDataByMonth(records);
  // 计算环差
  const categoryDiff = getCategoriesDiff(monthStatistics, categoryRank);

  return {
    records,
    monthStatistics,
    categoryRank,
    colorMap,
    categoryDiff,
    tradeMinMax,
  };
}
