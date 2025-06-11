<script setup lang="ts">
import {
  parseBillData,
  getCategoriesStatistics,
  groupDataByMonth,
  getCategories,
} from './handleData';
import { getChartOption } from './chartOption';
import * as echarts from 'echarts';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ billData: any[][] }>();

// 全周期的数据处理
const records = parseBillData(props.billData);
const { incomeCategories, expenseCategories } = getCategories(records);
const monthStatistics = groupDataByMonth(records);
const { incomeStatisticsDiff, expenseStatisticsDiff } = getCategoriesStatistics(
  monthStatistics,
  {
    incomeCategories,
    expenseCategories,
  }
);

const month = ref(monthStatistics[0][0].tradeTime.getMonth() + 5);

const chartRef = ref<HTMLDivElement | null>(null);
const chartOption = getChartOption(monthStatistics[month.value - 1], {
  income: incomeStatisticsDiff[month.value - 1],
  expense: expenseStatisticsDiff[month.value - 1],
});
let chartInstance: echarts.ECharts | null = null;

function initChart() {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  chartInstance.setOption(chartOption);
}

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<template>
  <div class="bill-chart" ref="chartRef"></div>
</template>

<style scoped lang="scss">
.bill-chart {
  width: 100%;
  height: 100vh;
}
</style>
