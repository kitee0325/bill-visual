const fs = require('fs');
const path = require('path');

const headers = [
  '交易时间',
  '交易分类',
  '交易对方',
  '对方账号',
  '商品说明',
  '收/支',
  '金额',
  '收/付款方式',
  '交易状态',
  '交易订单号',
  '商家订单号',
  '备注',
];

const categories = ['餐饮', '购物', '交通', '娱乐', '医疗', '教育', '其他'];
const partners = [
  '张三',
  '李四',
  '王五',
  '淘宝',
  '京东',
  '美团',
  '饿了么',
  '滴滴',
  '医院',
  '学校',
];
const paymentMethods = ['支付宝', '微信', '银行卡', '信用卡', '现金'];
const status = ['交易成功', '交易失败', '交易处理中'];
const remarks = ['', '无', '优惠', '退款', '分期', '活动'];
const productDesc = [
  '商品A',
  '商品B',
  '服务C',
  '套餐D',
  '票务E',
  '课程F',
  '药品G',
];

function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function randomAmount() {
  return (Math.random() * 1000 + 1).toFixed(2);
}

function randomOrderNo() {
  return (
    Math.random().toString().slice(2, 14) + Math.floor(Math.random() * 1000)
  );
}

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 6);
const endDate = new Date();

const data = [headers];
const records = [];
for (let i = 0; i < 500; i++) {
  const date = randomDate(startDate, endDate);
  records.push({
    date,
    row: [
      formatDate(date),
      categories[Math.floor(Math.random() * categories.length)],
      partners[Math.floor(Math.random() * partners.length)],
      '6222' +
        Math.floor(Math.random() * 1e12)
          .toString()
          .padStart(12, '0'),
      productDesc[Math.floor(Math.random() * productDesc.length)],
      Math.random() > 0.5 ? '支出' : '收入',
      randomAmount(),
      paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      status[Math.floor(Math.random() * status.length)],
      randomOrderNo(),
      randomOrderNo(),
      remarks[Math.floor(Math.random() * remarks.length)],
    ],
  });
}

records.sort((a, b) => a.date - b.date);
for (const rec of records) {
  data.push(rec.row);
}

fs.writeFileSync(
  path.join(__dirname, '../src/assets/mockData.json'),
  JSON.stringify(data, null, 2),
  'utf-8'
);

console.log('Mock data generated!');
