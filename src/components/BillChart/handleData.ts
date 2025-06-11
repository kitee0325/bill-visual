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
}

export type CategoryStatisticsDiff = Record<
  string,
  Record<'increase' | 'decrease' | 'value', number>
>;

/**
 * Excel序列号转JS日期
 * @param serial
 * @returns
 */
function excelDateToJSDate(serial: number | string) {
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

export function groupDataByMonth(records: BillRecord[]) {
  let monthStatistics: BillRecord[][] = [];
  records.forEach((record) => {
    const month = record.tradeTime.getMonth() + 1;
    if (!monthStatistics[month]) {
      monthStatistics[month] = [];
    }
    monthStatistics[month].push(record);
  });
  // 过滤没有数据的月份
  monthStatistics = monthStatistics.filter((month) => month.length > 0);

  return monthStatistics;
}

// 统计收入和支出的类别
export function getCategories(records: BillRecord[]) {
  let incomeCategories: string[] = [];
  let expenseCategories: string[] = [];

  records.forEach((record) => {
    if (record.incomeOrExpense === '收入') {
      incomeCategories.push(record.tradeCategory);
    } else {
      expenseCategories.push(record.tradeCategory);
    }
  });

  // 去重
  incomeCategories = [...new Set(incomeCategories)];
  expenseCategories = [...new Set(expenseCategories)];

  return {
    incomeCategories,
    expenseCategories,
  };
}

/**
 * 按类别统计每月的收支并计算环差
 * @param records
 * @returns
 */
export function getCategoriesStatistics(
  records: BillRecord[][],
  categories: { incomeCategories: string[]; expenseCategories: string[] }
) {
  const incomeStatistics: Record<string, number>[] = [];
  const expenseStatistics: Record<string, number>[] = [];
  const { incomeCategories, expenseCategories } = categories;

  records.forEach((monthRecords) => {
    const monthIncomeStatistics: Record<string, number> =
      incomeCategories.reduce((acc, d) => {
        acc[d] = 0;
        return acc;
      }, {} as Record<string, number>);
    const monthExpenseStatistics: Record<string, number> =
      expenseCategories.reduce((acc, d) => {
        acc[d] = 0;
        return acc;
      }, {} as Record<string, number>);

    monthRecords.forEach((record) => {
      if (record.incomeOrExpense === '收入') {
        monthIncomeStatistics[record.tradeCategory] = record.amount;
      } else {
        monthExpenseStatistics[record.tradeCategory] = record.amount;
      }
    });

    incomeStatistics.push(monthIncomeStatistics);
    expenseStatistics.push(monthExpenseStatistics);
  });

  // 计算环差
  function calculateDiff(
    statistics: Record<string, number>[]
  ): CategoryStatisticsDiff[] {
    return statistics.map((monthData, i) => {
      return Object.keys(monthData).reduce((acc, d) => {
        const diff = statistics[i - 1]
          ? Number((monthData[d] - statistics[i - 1][d]).toFixed(2))
          : 0;
        acc[d] = {
          increase: diff > 0 ? diff : 0,
          decrease: diff < 0 ? -diff : 0,
          value: monthData[d] - diff,
        };
        return acc;
      }, {} as CategoryStatisticsDiff);
    });
  }

  const incomeStatisticsDiff = calculateDiff(incomeStatistics);
  const expenseStatisticsDiff = calculateDiff(expenseStatistics);

  return {
    incomeStatisticsDiff,
    expenseStatisticsDiff,
  };
}
