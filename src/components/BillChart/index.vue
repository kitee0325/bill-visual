<script setup lang="ts">
import * as echarts from 'echarts';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

import { processBillData } from './handleData';
import { getChartOption } from './chartOption';

const props = defineProps<{ billData: any[][] }>();
const { monthStatistics, colorMap, categoryRank, categoryDiff, tradeMinMax } =
  processBillData(props.billData);

const monthList = Object.keys(monthStatistics).sort(
  (a, b) => Number(a) - Number(b)
);

const monthIndex = ref(0);
const month = computed(() => monthList[monthIndex.value]);

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

function updateChart() {
  if (!chartInstance && chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    (window as any).chart = chartInstance;
  }
  if (!chartInstance) return;

  const chartOption = getChartOption(
    monthStatistics[month.value],
    categoryDiff[monthIndex.value],
    { colorMap, categoryRank, tradeMinMax }
  );
  chartInstance.setOption(chartOption, {
    notMerge: true,
  });
  chartInstance.resize();
}

onMounted(() => {
  updateChart();
});
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

// month变化时自动更新图表
watch(month, () => {
  updateChart();
});

const goPrevMonth = () => {
  if (monthIndex.value > 0) monthIndex.value--;
};
const goNextMonth = () => {
  if (monthIndex.value < monthList.length - 1) monthIndex.value++;
};
</script>

<template>
  <div class="bill-chart-container">
    <div class="bill-chart-header">
      <div class="chart-title">{{ month }}月份收支详情</div>
      <div class="button-group">
        <button
          class="nav-btn"
          :disabled="monthIndex === 0"
          @click="goPrevMonth"
        >
          上一月
        </button>
        <button
          class="nav-btn"
          :disabled="monthIndex === monthList.length - 1"
          @click="goNextMonth"
        >
          下一月
        </button>
      </div>
    </div>
    <div class="bill-chart" ref="chartRef"></div>
  </div>
</template>

<style scoped lang="scss">
$primary-color: #1976d2;
$primary-hover: #1565c0;
$disabled-bg: #e4e6eb;
$disabled-color: #aaa;

.bill-chart-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.bill-chart-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 16px 24px;
  background: #fff;
}
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.nav-btn {
  background: $primary-color;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  font-weight: 500;
}
.nav-btn:disabled {
  background: $disabled-bg;
  color: $disabled-color;
  cursor: not-allowed;
  border: 1px solid #d0d0d0;
  opacity: 1;
}
.nav-btn:not(:disabled):hover {
  background: $primary-hover;
  color: #fff;
}
.chart-title {
  font-size: 22px;
  font-weight: 600;
  color: #222;
  letter-spacing: 1px;
  text-align: center;
}
.bill-chart {
  flex: 1;
  width: 100%;
  height: 0;
}
</style>
