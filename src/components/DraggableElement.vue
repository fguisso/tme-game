<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  id: string;
  initialX: number;
  initialY: number;
  width: number;
  height: number;
  elementTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'dropped', id: string, x: number, y: number): void;
}>();

const elementRef = ref<HTMLElement | null>(null);
let isDragging = false;
let startX = 0;
let startY = 0;
let elementX = 0;
let elementY = 0;

onMounted(() => {
  if (elementRef.value) {
    elementX = props.initialX;
    elementY = props.initialY;
    updateElementPosition();
  }
});

function updateElementPosition() {
  if (elementRef.value) {
    elementRef.value.style.transform = `translate(${elementX}px, ${elementY}px)`;
  }
}

function handleMouseDown(event: MouseEvent) {
  isDragging = true;
  startX = event.clientX - elementX;
  startY = event.clientY - elementY;
  
  // Add event listeners to window to handle dragging
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return;
  
  elementX = event.clientX - startX;
  elementY = event.clientY - startY;
  updateElementPosition();
}

function handleMouseUp() {
  if (isDragging) {
    isDragging = false;
    
    // Remove window event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    // Emit the drop event with the final position
    emit('dropped', props.id, elementX, elementY);
  }
}

// Additional touch support for mobile devices
function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 1) {
    isDragging = true;
    const touch = event.touches[0];
    startX = touch.clientX - elementX;
    startY = touch.clientY - elementY;
    
    // Add event listeners for touch events
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }
}

function handleTouchMove(event: TouchEvent) {
  if (!isDragging || event.touches.length !== 1) return;
  
  // Prevent scrolling while dragging
  event.preventDefault();
  
  const touch = event.touches[0];
  elementX = touch.clientX - startX;
  elementY = touch.clientY - startY;
  updateElementPosition();
}

function handleTouchEnd() {
  if (isDragging) {
    isDragging = false;
    
    // Remove touch event listeners
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    
    // Emit the drop event with the final position
    emit('dropped', props.id, elementX, elementY);
  }
}
</script>

<template>
  <div 
    ref="elementRef"
    class="draggable-element"
    :class="{ 'dragging': isDragging }"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <div class="element-label">{{ elementTitle || id }}</div>
    <div class="element-grab-hint">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      <span>Drag me</span>
    </div>
  </div>
</template>

<style scoped>
.draggable-element {
  position: relative;
  user-select: none;
  cursor: grab;
  background-color: #f0f0f0;
  border: 2px solid #666;
  border-radius: 6px;
  padding: 0.75rem;
  min-width: 70px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: transform 0.05s ease, box-shadow 0.1s ease;
}

.element-label {
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 0.5rem;
}

.element-grab-hint {
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  opacity: 0.7;
}

.element-grab-hint svg {
  width: 12px;
  height: 12px;
  margin-right: 4px;
}

.draggable-element.dragging {
  cursor: grabbing;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  opacity: 0.8;
}

/* Color-coding based on element type */
.draggable-element[id^="asset-"] {
  background-color: #f59e0b; /* amber-500 */
  color: white;
  border-color: #d97706; /* amber-600 */
}

.draggable-element[id^="threat-"] {
  background-color: #ef4444; /* red-500 */
  color: white;
  border-color: #dc2626; /* red-600 */
}

.draggable-element[id^="control-"] {
  background-color: #3b82f6; /* blue-500 */
  color: white;
  border-color: #2563eb; /* blue-600 */
}
</style> 