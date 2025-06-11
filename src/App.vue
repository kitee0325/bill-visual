<script setup lang="ts">
import { ref } from 'vue';
import UploadData from './components/UploadData/index.vue';
import BillChart from './components/BillChart/index.vue';

let billData: any[][] | null = null;
const showUpload = ref(true);

function handleUploadFinish(data: any[][]) {
  billData = data;
  showUpload.value = false;
}
</script>

<template>
  <div class="app">
    <UploadData v-if="showUpload" @finish="handleUploadFinish" />
    <BillChart v-else :billData="billData" />
  </div>
</template>

<style scoped lang="scss">
.app {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
