<script setup lang="ts">
import * as echarts from 'echarts';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElButton, ElSlider } from 'element-plus';

import { getChartOption } from './chartOption';
import { getNiceInterval } from './chartOption/inner';
import { getFilteredBillData, processBillData } from './handleData';

const props = defineProps<{ billData: any[][] }>();
const {
  records,
  tradeMinMax: globalTradeMinMax,
  monthList,
  colorMap,
} = processBillData(props.billData);

const monthIndex = ref(0);
const niceIncRange = getNiceInterval(globalTradeMinMax.income);
const niceExpRange = getNiceInterval(globalTradeMinMax.expense);

// 收入和支出的范围
const incomeRange = ref([
  niceIncRange[0],
  niceIncRange[niceIncRange.length - 1],
]);
const expenseRange = ref([
  niceExpRange[0],
  niceExpRange[niceExpRange.length - 1],
]);

// 生成marks
const incomeMarks = computed(() => {
  return niceIncRange.reduce((acc, val) => {
    acc[val] = `${val}元`;
    return acc;
  }, {} as Record<number, string>);
});

const expenseMarks = computed(() => {
  return niceExpRange.reduce((acc, val) => {
    acc[val] = `${val}元`;
    return acc;
  }, {} as Record<number, string>);
});

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

function updateChart() {
  if (!chartInstance && chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    (window as any).chart = chartInstance;
  }
  if (!chartInstance) return;

  // 获取数据
  const {
    monthStatistic,
    categoryRank,
    categoryDiff,
    tradeMinMax,
    monthlyTradeMinMax,
  } = getFilteredBillData(
    records,
    {
      income: { min: incomeRange.value[0], max: incomeRange.value[1] },
      expense: { min: expenseRange.value[0], max: expenseRange.value[1] },
    },
    monthList,
    monthIndex.value
  );

  const chartOption = getChartOption(monthStatistic, categoryDiff, {
    colorMap,
    categoryRank,
    tradeMinMax,
    monthlyTradeMinMax,
  });
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

// 监听月份变化
watch(monthIndex, () => {
  updateChart();
});

function handleRangeChange() {
  updateChart();
}

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
      <div class="chart-title">{{ monthList[monthIndex] }}收支详情</div>
      <div class="filter-group">
        <div class="filter-item">
          <div class="filter-label">收入范围</div>
          <el-slider
            v-model="incomeRange"
            range
            :min="niceIncRange[0]"
            :max="niceIncRange[niceIncRange.length - 1]"
            :step="100"
            :marks="incomeMarks"
            @change="handleRangeChange"
          />
        </div>
        <div class="filter-item">
          <div class="filter-label">支出范围</div>
          <el-slider
            v-model="expenseRange"
            range
            :min="niceExpRange[0]"
            :max="niceExpRange[niceExpRange.length - 1]"
            :step="100"
            :marks="expenseMarks"
            @change="handleRangeChange"
          />
        </div>
      </div>
      <div class="button-group">
        <el-button
          :disabled="monthIndex === 0"
          @click="goPrevMonth"
          type="primary"
        >
          上一月
        </el-button>
        <el-button
          :disabled="monthIndex === monthList.length - 1"
          @click="goNextMonth"
          type="primary"
        >
          下一月
        </el-button>
      </div>
    </div>
    <div class="bill-chart" ref="chartRef"></div>
  </div>
</template>

<style scoped lang="scss">
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
.filter-group {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 24px 0;
}
.filter-item {
  width: 100%;
}
.filter-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 12px;
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
