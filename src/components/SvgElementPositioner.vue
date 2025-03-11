<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, watch } from 'vue';

// Props for the component
const props = defineProps({
  svgPath: {
    type: String,
    required: true
  },
  // Allow for custom staging area configuration
  stagingArea: {
    type: Object,
    default: () => ({
      x: 0,
      y: 0,
      width: 300,
      height: 430,
      rx: 10,
      ry: 10
    })
  },
  // Default expansion percentage for SVG viewBox
  expansionPercentage: {
    type: Number,
    default: 20
  }
});

// Emitted events
const emit = defineEmits(['element-placed', 'svg-loaded', 'element-selected']);

// Component state
const svgContent = ref('');
const svgContainer = ref<HTMLElement | null>(null);
const elementPositions = reactive(new Map());
const isDragging = ref(false);
const currentDraggingElement = ref<SVGElement | null>(null);
const selectedElement = ref<string | null>(null);
const svgWidth = ref(0);
const svgHeight = ref(0);
const configMode = ref(false);

// Load the SVG 
onMounted(async () => {
  try {
    const response = await fetch(props.svgPath);
    const svgData = await response.text();
    
    // Set the SVG content
    svgContent.value = svgData;
    
    // Wait for the DOM to update with the SVG content
    await nextTick();
    
    // Process the SVG
    if (svgContainer.value) {
      const svg = svgContainer.value.querySelector('svg');
      if (svg) {
        // Expand the SVG viewBox
        expandSvgViewBox(svg);
        
        // Add click handler for configuration mode
        addSvgClickListener(svg);
        
        // Initialize element handlers
        initializeElements(svg);
        
        // Create the staging area
        createStagingArea(svg);
        
        // Emit that SVG is loaded
        emit('svg-loaded', svg);
      }
    }
  } catch (error) {
    console.error('Failed to load SVG:', error);
  }
});

// Expand SVG viewBox to create more space
function expandSvgViewBox(svg: SVGSVGElement) {
  const originalViewBox = svg.getAttribute('viewBox') || '';
  const viewBoxValues = originalViewBox.split(' ').map(Number);
  
  // If we have a valid viewBox
  if (viewBoxValues.length === 4) {
    // Calculate expansion based on percentage
    const extraWidth = viewBoxValues[2] * (props.expansionPercentage / 100);
    const newWidth = viewBoxValues[2] + extraWidth;
    
    // Set the new viewBox
    svg.setAttribute('viewBox', `${viewBoxValues[0]} ${viewBoxValues[1]} ${newWidth} ${viewBoxValues[3]}`);
    
    // Store dimensions for reference
    svgWidth.value = newWidth;
    svgHeight.value = viewBoxValues[3];
    
    console.log('SVG viewBox expanded:', svg.getAttribute('viewBox'));
  }
}

// Add SVG click handler for configuration mode
function addSvgClickListener(svg: SVGSVGElement) {
  svg.addEventListener('click', (e) => {
    if (!configMode.value) return;
    
    // Get the SVG's client rect
    const svgRect = svg.getBoundingClientRect();
    
    // Calculate coordinates relative to SVG
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    // Get SVG viewBox
    const viewBox = svg.viewBox.baseVal;
    
    // Convert screen coordinates to SVG viewBox coordinates
    const svgX = (x / svgRect.width) * viewBox.width;
    const svgY = (y / svgRect.height) * viewBox.height;
    
    // If an element is selected, update its position
    if (selectedElement.value && configMode.value) {
      setElementPosition(selectedElement.value, svgX, svgY);
      console.log(`Position for ${selectedElement.value} set to:`, { x: svgX, y: svgY });
    }
    
    console.log('Click coordinates:', {
      screen: { x, y },
      svg: { x: svgX, y: svgY }
    });
  });
}

// Initialize element handlers for all elements in the SVG
function initializeElements(svg: SVGSVGElement) {
  // Find all potential draggable elements
  const allElements = Array.from(svg.querySelectorAll('[id]'));
  
  allElements.forEach(element => {
    const id = element.getAttribute('id') || '';
    
    // Skip elements without IDs or that don't match our pattern
    if (!id) return;
    
    // Add class for styling
    element.classList.add('svg-element');
    
    // Add click event for selection
    element.addEventListener('click', (e) => {
      if (isDragging.value) return; // Don't trigger click during drag
      
      e.stopPropagation();
      selectedElement.value = id;
      emit('element-selected', id);
      console.log('Element selected:', id);
    });
    
    // Add mousedown for drag start
    element.addEventListener('mousedown', (e: MouseEvent) => {
      if (configMode.value) return; // Don't drag in config mode
      
      // Prevent default to disable text selection 
      e.preventDefault();
      startDrag(e, element as SVGElement);
    });
    
    element.addEventListener('touchstart', (e: TouchEvent) => {
      if (configMode.value) return; // Don't drag in config mode
      
      e.preventDefault(); // Prevent scrolling when dragging
      startDrag(e, element as SVGElement);
    });
  });
}

// Start dragging an element
function startDrag(e: MouseEvent | TouchEvent, element: SVGElement) {
  const id = element.getAttribute('id') || '';
  console.log('startDrag:', id);
  
  // Check if we have a position for this element
  if (!elementPositions.has(id)) {
    console.log('No target position defined for this element. Enable config mode to set positions.');
    return;
  }
  
  // Determine if it's a touch or mouse event
  const isTouch = e.type === 'touchstart';
  if (!isTouch && (e as MouseEvent).button !== 0) return; // Only left mouse button
  
  const events = isTouch ? {
    move: 'touchmove',
    stop: 'touchend'
  } : {
    move: 'mousemove',
    stop: 'mouseup'
  };
  
  // Mark as selected
  selectedElement.value = id;
  emit('element-selected', id);
  
  // Start dragging
  isDragging.value = true;
  currentDraggingElement.value = element;
  
  // Get the SVG
  const svg = element.ownerSVGElement;
  if (!svg) return;
  
  // Create SVG point for coordinate transformation
  const point = svg.createSVGPoint();
  const transform = svg.getScreenCTM()?.inverse();
  if (!transform) return;
  
  // Add visual indication
  element.classList.add('dragging');
  
  // Define position getters based on event type
  const getPos = isTouch ? 
    (evt: MouseEvent | TouchEvent, pt: DOMPoint) => {
      pt.x = (evt as TouchEvent).touches[0].clientX;
      pt.y = (evt as TouchEvent).touches[0].clientY;
    } : 
    (evt: MouseEvent | TouchEvent, pt: DOMPoint) => {
      pt.x = (evt as MouseEvent).clientX;
      pt.y = (evt as MouseEvent).clientY;
    };
  
  let moving = true;
  let newPt: DOMPoint;
  
  // Update function using requestAnimationFrame for smooth animation
  const updateFn = () => {
    if (moving) requestAnimationFrame(updateFn);
    if (!currentDraggingElement.value) return;
    
    // Map screen pixels to SVG coordinates
    newPt = point.matrixTransform(transform);
    
    // Apply transformation using SVG's transform attribute
    element.setAttribute('transform', `translate(${newPt.x - element.getBBox().x} ${newPt.y - element.getBBox().y})`);
  };
  
  // Set initial position
  getPos(e, point);
  requestAnimationFrame(updateFn);
  
  // Move function
  const moveFn = (evt: MouseEvent | TouchEvent) => {
    evt.preventDefault();
    getPos(evt, point);
  };
  
  // Stop function
  const stopFn = (evt: MouseEvent | TouchEvent) => {
    evt.preventDefault();
    
    moving = false;
    document.removeEventListener(events.move, moveFn);
    document.removeEventListener(events.stop, stopFn);
    
    // Remove dragging class
    element.classList.remove('dragging');
    
    // Handle the drop
    let clientX, clientY;
    if (isTouch) {
      clientX = (evt as TouchEvent).changedTouches[0].clientX;
      clientY = (evt as TouchEvent).changedTouches[0].clientY;
    } else {
      clientX = (evt as MouseEvent).clientX;
      clientY = (evt as MouseEvent).clientY;
    }
    
    handleElementDropped(id, clientX, clientY);
    
    // Reset dragging state
    isDragging.value = false;
    currentDraggingElement.value = null;
  };
  
  // Add event listeners
  document.addEventListener(events.move, moveFn, { passive: false });
  document.addEventListener(events.stop, stopFn);
}

// Handle when an element is dropped
function handleElementDropped(id: string, clientX: number, clientY: number) {
  if (!svgContainer.value) return;
  
  const svg = svgContainer.value.querySelector('svg');
  if (!svg) return;
  
  const svgRect = svg.getBoundingClientRect();
  const targetPos = elementPositions.get(id);
  
  if (!targetPos) {
    console.log('No target position defined for this element. Enable config mode to set positions.');
    return;
  }
  
  console.log('Element dropped:', id, 'at screen position:', { clientX, clientY });
  
  // Convert client coordinates to SVG coordinates
  const viewBox = svg.viewBox.baseVal;
  const svgX = ((clientX - svgRect.left) / svgRect.width) * viewBox.width;
  const svgY = ((clientY - svgRect.top) / svgRect.height) * viewBox.height;
  
  // Check if the element is close to its target position
  const distance = Math.sqrt(
    Math.pow(targetPos.x - svgX, 2) + 
    Math.pow(targetPos.y - svgY, 2)
  );
  
  console.log(`Distance to target for ${id}:`, distance.toFixed(2), 'units');
  
  const svgElement = svg.querySelector(`#${id}`) as SVGElement;
  
  if (distance < 50) { // Within 50 units is considered correct
    // Element placed correctly
    if (svgElement) {
      // Move to exact target position
      svgElement.setAttribute('transform', `translate(${targetPos.x - svgElement.getBBox().x} ${targetPos.y - svgElement.getBBox().y})`);
      svgElement.classList.add('placed-correctly');
    }
    
    emit('element-placed', { id, correct: true });
  } else {
    // Element not placed correctly
    if (svgElement) {
      // Reset position
      svgElement.setAttribute('transform', '');
    }
    
    emit('element-placed', { id, correct: false });
  }
}

// Set the position for an element (used in configuration mode)
function setElementPosition(id: string, x: number, y: number) {
  elementPositions.set(id, { x, y });
  console.log('Updated element positions:', Object.fromEntries(elementPositions));
}

// Create staging area in the SVG
function createStagingArea(svg: SVGSVGElement) {
  // Remove existing staging area if any
  const existingArea = svg.querySelector('.element-staging-area');
  if (existingArea) {
    existingArea.remove();
  }
  
  // Create the staging area rectangle
  const stagingAreaElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stagingAreaElement.setAttribute('class', 'element-staging-area');
  stagingAreaElement.setAttribute('x', props.stagingArea.x.toString());
  stagingAreaElement.setAttribute('y', props.stagingArea.y.toString());
  stagingAreaElement.setAttribute('width', props.stagingArea.width.toString());
  stagingAreaElement.setAttribute('height', props.stagingArea.height.toString());
  stagingAreaElement.setAttribute('rx', props.stagingArea.rx.toString());
  stagingAreaElement.setAttribute('ry', props.stagingArea.ry.toString());
  
  // Insert at beginning of SVG so it's behind elements
  svg.insertBefore(stagingAreaElement, svg.firstChild);
}

// Toggle configuration mode on/off
function toggleConfigMode() {
  configMode.value = !configMode.value;
  console.log(`Configuration mode ${configMode.value ? 'enabled' : 'disabled'}`);
}

// Import element positions from JSON
function importPositions(positionsJson: string) {
  try {
    const positions = JSON.parse(positionsJson);
    Object.entries(positions).forEach(([id, pos]) => {
      elementPositions.set(id, pos);
    });
    console.log('Imported positions:', Object.fromEntries(elementPositions));
  } catch (error) {
    console.error('Failed to import positions:', error);
  }
}

// Export element positions to JSON
function exportPositions() {
  return JSON.stringify(Object.fromEntries(elementPositions));
}

// Reset all element positions
function resetElements() {
  if (!svgContainer.value) return;
  
  const svg = svgContainer.value.querySelector('svg');
  if (!svg) return;
  
  svg.querySelectorAll('.svg-element').forEach(el => {
    (el as SVGElement).setAttribute('transform', '');
    (el as SVGElement).classList.remove('placed-correctly');
  });
}

// Expose methods to parent component
defineExpose({
  toggleConfigMode,
  setElementPosition,
  importPositions,
  exportPositions,
  resetElements
});
</script>

<template>
  <div class="svg-positioner">
    <!-- Configuration Mode Controls -->
    <div v-if="configMode" class="config-controls">
      <div class="bg-yellow-100 p-2 rounded border border-yellow-300 text-sm text-yellow-800">
        <strong>Configuration Mode:</strong> Select an element, then click in the SVG to set its target position.
      </div>
      <div v-if="selectedElement" class="mt-2 text-sm">
        Selected: {{ selectedElement }}
      </div>
    </div>
    
    <!-- SVG Container -->
    <div class="svg-container" ref="svgContainer" v-html="svgContent"></div>
    
    <!-- Position Data (for debugging/configuration) -->
    <div v-if="configMode" class="position-data mt-3">
      <h3 class="text-md font-bold">Element Positions</h3>
      <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">{{ JSON.stringify(Object.fromEntries(elementPositions), null, 2) }}</pre>
      <button 
        @click="toggleConfigMode" 
        class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Exit Config Mode
      </button>
    </div>
    
    <!-- Toggle Config Mode Button (only shown when not in config mode) -->
    <button 
      v-if="!configMode" 
      @click="toggleConfigMode" 
      class="absolute top-2 right-2 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
    >
      Configure Positions
    </button>
    
    <!-- Slot for additional controls -->
    <slot name="controls"></slot>
  </div>
</template>

<style scoped>
.svg-positioner {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.config-controls {
  margin-bottom: 1rem;
}

.svg-container {
  width: 100%;
  overflow: auto;
  background-color: #f8fafc;
  flex: 1;
}

.svg-container :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}

.svg-container :deep(.element-staging-area) {
  fill: rgba(49, 49, 51, 0.1);
  stroke: #e5e7eb;
  stroke-width: 1;
}

.svg-container :deep(.svg-element) {
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.3s ease;
  user-select: none; /* Prevent text selection */
}

.svg-container :deep(.dragging) {
  transition: none !important;
  cursor: grabbing;
}

.svg-container :deep(.placed-correctly) {
  opacity: 1 !important;
}

.position-data {
  margin-top: 1rem;
}
</style> 