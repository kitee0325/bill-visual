// src/composables/useStickyScroll.ts
import { onMounted, onUnmounted, type Ref } from 'vue';

interface StickyScrollOptions {
  threshold?: number; // 滚动阈值，默认1/3屏
  getCurrentTop?: () => number; // 当前屏顶部
  getNextTop?: () => number; // 下一个屏顶部
  enabled?: boolean; // 是否启用
}

export function useStickyScroll(
  target: Ref<HTMLElement | null>,
  options: StickyScrollOptions = {}
) {
  const threshold = options.threshold ?? window.innerHeight / 3;
  let isScrolling = false;

  const handleWheel = (e: WheelEvent) => {
    if (!options.enabled && options.enabled !== undefined) return;
    if (isScrolling) return;

    const scrollTop = window.scrollY;
    const direction = e.deltaY > 0 ? 'down' : 'up';

    const currentScreenTop = options.getCurrentTop
      ? options.getCurrentTop()
      : 0;
    const nextScreenTop = options.getNextTop
      ? options.getNextTop()
      : window.innerHeight;

    if (direction === 'down') {
      if (scrollTop < threshold) {
        isScrolling = true;
        window.scrollTo({ top: currentScreenTop, behavior: 'smooth' });
        setTimeout(() => {
          isScrolling = false;
        }, 500);
        e.preventDefault();
      } else {
        isScrolling = true;
        window.scrollTo({ top: nextScreenTop, behavior: 'smooth' });
        setTimeout(() => {
          isScrolling = false;
        }, 500);
        e.preventDefault();
      }
    } else if (direction === 'up') {
      if (scrollTop > nextScreenTop - threshold) {
        isScrolling = true;
        window.scrollTo({ top: nextScreenTop, behavior: 'smooth' });
        setTimeout(() => {
          isScrolling = false;
        }, 500);
        e.preventDefault();
      } else {
        isScrolling = true;
        window.scrollTo({ top: currentScreenTop, behavior: 'smooth' });
        setTimeout(() => {
          isScrolling = false;
        }, 500);
        e.preventDefault();
      }
    }
  };

  onMounted(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
  });
  onUnmounted(() => {
    window.removeEventListener('wheel', handleWheel);
  });

  return {
    // 可暴露控制方法
    enable: () => (options.enabled = true),
    disable: () => (options.enabled = false),
  };
}
