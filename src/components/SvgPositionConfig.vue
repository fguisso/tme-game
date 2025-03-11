<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';

// Configuration state
const svgPath = ref('/src/assets/simple-threat-modeling.svg');
const svgContent = ref('');
const svgContainer = ref<HTMLElement | null>(null);
const selectedElement = ref<string | null>(null);
const elementPositions = reactive(new Map());
const stagingArea = reactive({
  x: 2200,
  y: 30,
  width: 300,
  height: 430,
  rx: 10,
  ry: 10
});
const configName = ref('default-config');
const configs = ref<{[key: string]: any}>({}); // Store multiple configurations
const svgWidth = ref(0);
const svgHeight = ref(0);
const expansionPercentage = ref(20);
const showStagingArea = ref(true);
const positionsJson = ref('');
const customSvgUrl = ref('');
const statusMessage = ref('');

// Emit events
const emit = defineEmits(['config-saved', 'go-to-game']);

// Load the SVG 
onMounted(async () => {
  // Try to load saved configurations from localStorage
  const savedConfigs = localStorage.getItem('threat-model-configs');
  if (savedConfigs) {
    configs.value = JSON.parse(savedConfigs);
  }
  
  await loadSvg(svgPath.value);
});

// Load an SVG from the specified path
async function loadSvg(path: string) {
  try {
    svgContent.value = ''; // Clear current SVG
    const response = await fetch(path);
    const svgData = await response.text();
    
    // Set the SVG content
    svgContent.value = svgData;
    
    // Wait for the DOM to update with the SVG content
    await nextTick();
    
    // Now extract element positions from the rendered SVG
    if (svgContainer.value) {
      const svg = svgContainer.value.querySelector('svg');
      if (svg) {
        expandSvgViewBox(svg);
        addSvgClickListener(svg);
        createStagingArea(svg);
        discoverElements(svg);
        statusMessage.value = 'SVG loaded successfully';
      }
    }
  } catch (error) {
    console.error('Failed to load SVG:', error);
    statusMessage.value = 'Failed to load SVG: ' + (error as Error).message;
  }
}

// Expand SVG viewBox to create more space
function expandSvgViewBox(svg: SVGSVGElement) {
  const originalViewBox = svg.getAttribute('viewBox') || '';
  const viewBoxValues = originalViewBox.split(' ').map(Number);
  
  // If we have a valid viewBox
  if (viewBoxValues.length === 4) {
    // Calculate expansion based on percentage
    const extraWidth = viewBoxValues[2] * (expansionPercentage.value / 100);
    const newWidth = viewBoxValues[2] + extraWidth;
    
    // Set the new viewBox
    svg.setAttribute('viewBox', `${viewBoxValues[0]} ${viewBoxValues[1]} ${newWidth} ${viewBoxValues[3]}`);
    
    // Store dimensions for reference
    svgWidth.value = newWidth;
    svgHeight.value = viewBoxValues[3];
  }
}

// Add SVG click handler for position selection
function addSvgClickListener(svg: SVGSVGElement) {
  svg.addEventListener('click', (e) => {
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
    if (selectedElement.value) {
      setElementPosition(selectedElement.value, svgX, svgY);
      statusMessage.value = `Position for ${selectedElement.value} set to x: ${Math.round(svgX)}, y: ${Math.round(svgY)}`;
    } else {
      // Update staging area position
      if (e.ctrlKey) {
        stagingArea.x = svgX;
        stagingArea.y = svgY;
        createStagingArea(svg);
        statusMessage.value = `Staging area position updated to x: ${Math.round(svgX)}, y: ${Math.round(svgY)}`;
      }
    }
  });
}

// Create or update the staging area visual
function createStagingArea(svg: SVGSVGElement) {
  if (!showStagingArea.value) return;
  
  // Remove existing staging area if any
  const existingArea = svg.querySelector('.element-staging-area');
  if (existingArea) {
    existingArea.remove();
  }
  
  // Create the staging area rectangle
  const stagingAreaElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stagingAreaElement.setAttribute('class', 'element-staging-area');
  stagingAreaElement.setAttribute('x', stagingArea.x.toString());
  stagingAreaElement.setAttribute('y', stagingArea.y.toString());
  stagingAreaElement.setAttribute('width', stagingArea.width.toString());
  stagingAreaElement.setAttribute('height', stagingArea.height.toString());
  stagingAreaElement.setAttribute('rx', stagingArea.rx.toString());
  stagingAreaElement.setAttribute('ry', stagingArea.ry.toString());
  
  // Insert at beginning of SVG so it's behind elements
  svg.insertBefore(stagingAreaElement, svg.firstChild);
}

// Discover and list all elements in the SVG
function discoverElements(svg: SVGSVGElement) {
  // Find all elements with IDs
  const allElements = Array.from(svg.querySelectorAll('[id]'));
  
  allElements.forEach(element => {
    const id = element.getAttribute('id') || '';
    
    // Skip elements without IDs or SVG itself
    if (!id || id === 'svg' || id === 'svg-container') return;
    
    // Add class for styling
    element.classList.add('configurable-element');
    
    // Add click event for selection
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedElement.value = id;
      highlightSelectedElement(svg);
      statusMessage.value = `Selected element: ${id}`;
    });
  });
}

// Highlight the currently selected element
function highlightSelectedElement(svg: SVGSVGElement) {
  // Remove highlight from all elements
  svg.querySelectorAll('.selected-element').forEach(el => {
    el.classList.remove('selected-element');
  });
  
  // Add highlight to selected element
  if (selectedElement.value) {
    const element = svg.querySelector(`#${selectedElement.value}`);
    if (element) {
      element.classList.add('selected-element');
    }
  }
}

// Set position for an element
function setElementPosition(id: string, x: number, y: number) {
  elementPositions.set(id, { x, y });
  
  // Show position preview
  const svg = svgContainer.value?.querySelector('svg');
  if (svg) {
    const element = svg.querySelector(`#${id}`);
    if (element) {
      // Add a small circle to mark the position
      const existing = svg.querySelector(`.position-marker-${id}`);
      if (existing) existing.remove();
      
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', `position-marker position-marker-${id}`);
      marker.setAttribute('cx', x.toString());
      marker.setAttribute('cy', y.toString());
      marker.setAttribute('r', '5');
      marker.setAttribute('fill', 'rgba(255, 0, 0, 0.5)');
      
      svg.appendChild(marker);
    }
  }
}

// Save the current configuration
function saveConfig() {
  // Prepare the configuration object
  const config = {
    svgPath: svgPath.value,
    elementPositions: Object.fromEntries(elementPositions),
    stagingArea: { ...stagingArea },
    expansionPercentage: expansionPercentage.value
  };
  
  // Save to the configs object
  configs.value[configName.value] = config;
  
  // Save to localStorage
  localStorage.setItem('threat-model-configs', JSON.stringify(configs.value));
  
  // Update status
  statusMessage.value = `Configuration "${configName.value}" saved successfully`;
  
  // Update JSON view
  positionsJson.value = JSON.stringify(config, null, 2);
  
  // Emit event
  emit('config-saved', configName.value);
}

// Load a saved configuration
function loadConfig(name: string) {
  if (!configs.value[name]) {
    statusMessage.value = `Configuration "${name}" not found`;
    return;
  }
  
  const config = configs.value[name];
  
  // Update all state from the config
  svgPath.value = config.svgPath;
  stagingArea.x = config.stagingArea.x;
  stagingArea.y = config.stagingArea.y;
  stagingArea.width = config.stagingArea.width;
  stagingArea.height = config.stagingArea.height;
  stagingArea.rx = config.stagingArea.rx || 10;
  stagingArea.ry = config.stagingArea.ry || 10;
  expansionPercentage.value = config.expansionPercentage || 20;
  
  // Clear existing positions
  elementPositions.clear();
  
  // Load the positions
  Object.entries(config.elementPositions).forEach(([id, pos]) => {
    elementPositions.set(id, pos);
  });
  
  // Load the SVG
  loadSvg(svgPath.value).then(() => {
    // After loading, visualize all positions
    const svg = svgContainer.value?.querySelector('svg');
    if (svg) {
      Object.entries(config.elementPositions).forEach(([id, pos]) => {
        setElementPosition(id, (pos as any).x, (pos as any).y);
      });
    }
    
    // Update JSON view
    positionsJson.value = JSON.stringify(config, null, 2);
    
    statusMessage.value = `Configuration "${name}" loaded successfully`;
  });
  
  // Update the current config name
  configName.value = name;
}

// Delete a saved configuration
function deleteConfig(name: string) {
  if (configs.value[name]) {
    // Remove the configuration
    delete configs.value[name];
    
    // Save to localStorage
    localStorage.setItem('threat-model-configs', JSON.stringify(configs.value));
    
    statusMessage.value = `Configuration "${name}" deleted`;
  }
}

// Apply custom SVG URL
function applyCustomSvg() {
  if (!customSvgUrl.value) {
    statusMessage.value = "Please enter a valid SVG URL";
    return;
  }
  
  svgPath.value = customSvgUrl.value;
  loadSvg(customSvgUrl.value);
}

// Go to the game page with the current configuration
function goToGame() {
  // Save the current config first
  saveConfig();
  
  // Emit event to go to game with current config
  emit('go-to-game', configName.value);
}

// Import configuration from JSON
function importConfig() {
  try {
    const config = JSON.parse(positionsJson.value);
    
    // Create a new config name if same one exists
    let newName = configName.value;
    if (configs.value[newName]) {
      newName = `${newName}-imported-${Date.now()}`;
    }
    
    // Save with the new name
    configs.value[newName] = config;
    localStorage.setItem('threat-model-configs', JSON.stringify(configs.value));
    
    // Load the imported config
    loadConfig(newName);
    
    statusMessage.value = `Configuration imported as "${newName}"`;
  } catch (error) {
    statusMessage.value = `Error importing configuration: ${(error as Error).message}`;
  }
}

// Clear all configurations for this element
function clearElementPositions() {
  if (selectedElement.value) {
    elementPositions.delete(selectedElement.value);
    
    // Remove position marker
    const svg = svgContainer.value?.querySelector('svg');
    if (svg) {
      const marker = svg.querySelector(`.position-marker-${selectedElement.value}`);
      if (marker) marker.remove();
    }
    
    statusMessage.value = `Cleared position for ${selectedElement.value}`;
  }
}

// Clear all element positions
function clearAllPositions() {
  elementPositions.clear();
  
  // Remove all position markers
  const svg = svgContainer.value?.querySelector('svg');
  if (svg) {
    svg.querySelectorAll('.position-marker').forEach(marker => marker.remove());
  }
  
  statusMessage.value = "Cleared all element positions";
}

// Export methods for parent component
defineExpose({
  loadConfig,
  saveConfig,
  clearAllPositions
});
</script>

<template>
  <div class="config-page">
    <h1 class="text-2xl font-bold mb-4">SVG Configuration Tool</h1>
    
    <!-- Status Message -->
    <div v-if="statusMessage" class="status-message mb-4" :class="{
      'bg-green-100 text-green-800': statusMessage.includes('success'),
      'bg-red-100 text-red-800': statusMessage.includes('Error') || statusMessage.includes('Failed'),
      'bg-blue-100 text-blue-800': !statusMessage.includes('success') && !statusMessage.includes('Error') && !statusMessage.includes('Failed')
    }">
      {{ statusMessage }}
    </div>
    
    <div class="flex flex-wrap gap-4">
      <!-- Configuration Controls -->
      <div class="config-controls w-full lg:w-1/4">
        <div class="bg-gray-50 p-4 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-3">Configuration Settings</h2>
          
          <!-- SVG Source -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">SVG Source</h3>
            <input 
              v-model="customSvgUrl" 
              type="text" 
              placeholder="Enter SVG URL" 
              class="w-full p-2 border rounded mb-2"
            />
            <button 
              @click="applyCustomSvg" 
              class="bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 text-sm"
            >
              Load SVG
            </button>
          </div>
          
          <!-- Configuration Name -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">Configuration Name</h3>
            <input 
              v-model="configName" 
              type="text" 
              placeholder="Configuration name" 
              class="w-full p-2 border rounded"
            />
          </div>
          
          <!-- Expansion Settings -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">SVG Expansion</h3>
            <div class="flex items-center">
              <input 
                v-model="expansionPercentage" 
                type="range" 
                min="0" 
                max="100" 
                class="w-full"
              />
              <span class="ml-2">{{ expansionPercentage }}%</span>
            </div>
          </div>
          
          <!-- Staging Area Settings -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">Staging Area</h3>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-sm">X:</label>
                <input v-model.number="stagingArea.x" type="number" class="w-full p-1 border rounded" />
              </div>
              <div>
                <label class="text-sm">Y:</label>
                <input v-model.number="stagingArea.y" type="number" class="w-full p-1 border rounded" />
              </div>
              <div>
                <label class="text-sm">Width:</label>
                <input v-model.number="stagingArea.width" type="number" class="w-full p-1 border rounded" />
              </div>
              <div>
                <label class="text-sm">Height:</label>
                <input v-model.number="stagingArea.height" type="number" class="w-full p-1 border rounded" />
              </div>
              <div>
                <label class="text-sm">Border Radius:</label>
                <input v-model.number="stagingArea.rx" type="number" class="w-full p-1 border rounded" />
              </div>
            </div>
            <div class="flex items-center mt-2">
              <input type="checkbox" v-model="showStagingArea" id="show-staging" class="mr-2" />
              <label for="show-staging" class="text-sm">Show staging area</label>
            </div>
            <button 
              @click="createStagingArea(svgContainer.querySelector('svg'))" 
              class="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 text-sm"
            >
              Update Staging Area
            </button>
            <p class="text-xs text-gray-500 mt-1">Tip: Hold Ctrl and click in the SVG to set staging area position</p>
          </div>
          
          <!-- Selected Element -->
          <div class="mb-4" v-if="selectedElement">
            <h3 class="text-md font-medium mb-2">Selected Element: {{ selectedElement }}</h3>
            <p class="text-sm text-gray-600 mb-2">Click in the SVG to set the position for this element</p>
            <button 
              @click="clearElementPositions" 
              class="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 text-sm"
            >
              Clear Position
            </button>
            <button 
              @click="selectedElement = null" 
              class="ml-2 bg-gray-300 text-gray-800 py-1 px-3 rounded hover:bg-gray-400 text-sm"
            >
              Deselect
            </button>
          </div>
          
          <!-- Save & Load Controls -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">Configuration Management</h3>
            <div class="flex flex-wrap gap-2">
              <button 
                @click="saveConfig" 
                class="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 text-sm"
              >
                Save Config
              </button>
              <button 
                @click="clearAllPositions" 
                class="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 text-sm"
              >
                Clear All
              </button>
              <button 
                @click="goToGame" 
                class="bg-purple-500 text-white py-1 px-3 rounded hover:bg-purple-600 text-sm"
              >
                Go to Game
              </button>
            </div>
          </div>
          
          <!-- Saved Configurations -->
          <div class="mb-4">
            <h3 class="text-md font-medium mb-2">Saved Configurations</h3>
            <div v-if="Object.keys(configs).length === 0" class="text-sm text-gray-500">
              No saved configurations
            </div>
            <div v-else class="max-h-40 overflow-y-auto">
              <div 
                v-for="(_, name) in configs" 
                :key="name" 
                class="flex justify-between items-center p-2 hover:bg-gray-100 rounded"
              >
                <span class="text-sm truncate mr-2">{{ name }}</span>
                <div>
                  <button 
                    @click="loadConfig(name)" 
                    class="text-blue-500 hover:text-blue-700 text-xs mr-2"
                  >
                    Load
                  </button>
                  <button 
                    @click="deleteConfig(name)" 
                    class="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- SVG Preview -->
      <div class="svg-preview w-full lg:w-7/12">
        <div class="bg-white p-4 rounded-lg shadow h-full">
          <h2 class="text-lg font-semibold mb-3">SVG Preview</h2>
          <div class="border border-gray-300 rounded bg-gray-50 h-full overflow-auto">
            <div class="svg-container" ref="svgContainer" v-html="svgContent"></div>
          </div>
        </div>
      </div>
      
      <!-- JSON Configuration -->
      <div class="json-config w-full lg:w-1/4">
        <div class="bg-gray-50 p-4 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-3">JSON Configuration</h2>
          <textarea 
            v-model="positionsJson" 
            class="w-full h-60 p-2 font-mono text-xs border rounded"
            placeholder="Edit or paste JSON configuration here"
          ></textarea>
          <div class="mt-2 flex gap-2">
            <button 
              @click="importConfig" 
              class="bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 text-sm"
            >
              Import
            </button>
            <button 
              @click="positionsJson = JSON.stringify(Object.fromEntries(elementPositions), null, 2)" 
              class="bg-gray-300 text-gray-800 py-1 px-3 rounded hover:bg-gray-400 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-page {
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
}

.status-message {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}

.svg-container {
  min-height: 400px;
  padding: 1rem;
}

.svg-container :deep(svg) {
  width: 100%;
  height: auto;
  max-height: 70vh;
}

.svg-container :deep(.element-staging-area) {
  fill: rgba(49, 49, 51, 0.1);
  stroke: #e5e7eb;
  stroke-width: 1;
}

.svg-container :deep(.configurable-element) {
  cursor: pointer;
}

.svg-container :deep(.configurable-element:hover) {
  opacity: 0.8;
  outline: 1px dashed #3b82f6;
}

.svg-container :deep(.selected-element) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.svg-container :deep(.position-marker) {
  cursor: pointer;
}
</style> 