<script setup lang="ts">
import { ref } from 'vue';
// @ts-ignore
import * as XLSX from 'xlsx';
import mockData from '@/assets/mockData.json';

const isDragging = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits(['finish']);

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  handleFiles(files);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
}

function onClick() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  handleFiles(files);
}

function handleFiles(files: FileList | null | undefined) {
  if (!files || files.length === 0) return;
  const file = files[0];
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv')) {
    errorMsg.value = '仅支持上传 .csv 文件';
    successMsg.value = '';
    return;
  }
  errorMsg.value = '';
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const csvText = e.target?.result as string;
      // 解析csv内容，使用GBK编码
      const workbook = XLSX.read(csvText, { type: 'string', codepage: 936 });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });
      successMsg.value = `上传成功：${file.name}`;
      console.log(jsonData);
      emit('finish', jsonData);
    } catch (err: any) {
      errorMsg.value = err.message || '文件解析失败';
      successMsg.value = '';
    }
  };
  reader.onerror = () => {
    errorMsg.value = '文件读取失败';
    successMsg.value = '';
  };
  reader.readAsText(file, 'GBK');
}

function useMockData() {
  emit('finish', mockData);
}
</script>

<template>
  <div
    class="upload-data"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onClick"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".csv"
      style="display: none"
      @change="onFileChange"
    />
    <div class="upload-content">
      <svg class="upload-icon" viewBox="0 0 64 64" width="48" height="48">
        <g>
          <rect x="12" y="44" width="40" height="8" rx="4" fill="#e0e7ef" />
          <path
            d="M32 44V16"
            stroke="#4f8cff"
            stroke-width="4"
            stroke-linecap="round"
          />
          <polyline
            points="24,28 32,20 40,28"
            fill="none"
            stroke="#4f8cff"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
      </svg>
      <div class="upload-text">
        <span v-if="!successMsg">点击或拖拽上传 <b>.csv</b>文件</span>
        <span v-else>{{ successMsg }}</span>
      </div>
    </div>
    <transition name="fade">
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
    </transition>
    <transition name="pulse">
      <div v-if="isDragging" class="drag-overlay"></div>
    </transition>
  </div>
  <button class="mock-btn" type="button" @click.stop="useMockData">
    使用mock数据
  </button>
</template>

<style scoped lang="scss">
.upload-data {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  width: 340px;
  height: 180px;
  background: linear-gradient(135deg, #f5f8ff 0%, #e0e7ef 100%);
  border: 2.5px dashed #b3c6e6;
  border-radius: 22px;
  box-shadow: 0 8px 32px 0 rgba(80, 120, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.3s cubic-bezier(0.4, 2, 0.6, 1), box-shadow 0.3s;
  overflow: hidden;
  &:hover,
  &.dragging {
    border-color: #4f8cff;
    box-shadow: 0 12px 36px 0 rgba(80, 120, 255, 0.16);
  }
}
.upload-content {
  z-index: 2;
  text-align: center;
  pointer-events: none;
}
.upload-icon {
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 8px #4f8cff22);
  transition: transform 0.4s cubic-bezier(0.4, 2, 0.6, 1);
}
.upload-data.dragging .upload-icon {
  transform: scale(1.15) rotate(-8deg);
}
.upload-text {
  font-size: 1.1rem;
  color: #4f5b7c;
  b {
    color: #4f8cff;
    font-weight: 600;
  }
}
.drag-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, #e0e7efcc 0%, #4f8cff22 100%);
  border-radius: 22px;
  z-index: 1;
  animation: pulse 1.2s infinite alternate;
}
@keyframes pulse {
  0% {
    opacity: 0.5;
  }
  100% {
    opacity: 0.9;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 2, 0.6, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.error-msg {
  position: absolute;
  bottom: 18px;
  left: 0;
  width: 100%;
  text-align: center;
  color: #ff4f4f;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  padding: 6px 0 4px 0;
  box-shadow: 0 2px 8px #ff4f4f22;
  z-index: 3;
}
.mock-btn {
  display: block;
  margin: 24px auto 0 auto;
  padding: 6px 18px;
  font-size: 1rem;
  background: #4f8cff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px #4f8cff22;
  &:hover {
    background: #2563eb;
  }
}
</style>
