<script setup lang="ts">
import * as echarts from 'echarts';
import { ref, onMounted, onUnmounted } from 'vue';

import { processBillData } from './handleData';
import { getChartOption } from './chartOption';

const props = defineProps<{ billData: any[][] }>();
const { monthStatistics, colorMap, categoryRank, categoryDiff } =
  processBillData(props.billData);

let isInit = false;
const monthList = Object.keys(monthStatistics);
const month = ref(monthList[0]);

const chartRef = ref<HTMLDivElement | null>(null);

let chartInstance: echarts.ECharts | null = null;

function updateChart() {
  if (!isInit) {
    if (!chartRef.value) return;
    chartInstance = echarts.init(chartRef.value);
    isInit = true;
  }
  const chartOption = getChartOption(
    monthStatistics[month.value],
    categoryDiff[Number(month.value)],
    {
      colorMap,
      categoryRank,
    }
  );
  chartInstance!.setOption(chartOption);
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
