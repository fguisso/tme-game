<script lang="ts">
export default {
  name: 'ThreatModelingGame'
}
</script>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, computed } from 'vue';

// Path to the SVG file
const svgPath = '/src/assets/simple-threat-modeling.svg';

// Initialize state
const svgContent = ref('');
const svgContainer = ref<HTMLElement | null>(null);
const originalPositions = reactive(new Map());
const targetPositions = reactive(new Map()); // Store positions where elements should be placed
const currentStatus = ref('');
const gameMode = ref('asset'); // 'asset', 'threat', 'control'
const score = ref(0);
const gameCompleted = ref(false);
const selectedElement = ref<string | null>(null);
const isDragging = ref(false);
const currentDraggingElement = ref<SVGElement | null>(null);
const svgWidth = ref(0);
const svgHeight = ref(0);

// Game phases
const phases = ['asset', 'threat', 'control'];
const phaseStatus = reactive({
  asset: { completed: false, available: true },
  threat: { completed: false, available: false },
  control: { completed: false, available: false }
});

// Elements to drag and their types
const elements = reactive({
  asset: [] as { id: string, x: number, y: number, width: number, height: number, placed: boolean }[],
  threat: [] as { id: string, x: number, y: number, width: number, height: number, placed: boolean }[],
  control: [] as { id: string, x: number, y: number, width: number, height: number, placed: boolean }[]
});

// Current set of elements being used based on game mode
const currentElements = computed(() => {
  switch (gameMode.value) {
    case 'asset': return elements.asset;
    case 'threat': return elements.threat;
    case 'control': return elements.control;
    default: return elements.asset;
  }
});

// Currently selected element's information
const selectedElementInfo = computed(() => {
  if (!selectedElement.value) return null;
  return elementInfo[selectedElement.value] || null;
});

// Element information data
interface ElementInfo {
  id: string;
  title: string;
  description: string;
}

const elementInfo: Record<string, ElementInfo> = {
  'asset-1': {
    id: 'asset-1',
    title: 'A1 User Session Token',
    description: "While analyzing the application, we saw that the session token is the main mechanism for user authentication and authorization. If an attacker obtains this token, they could perform actions on behalf of the user without restriction. This is critical as it directly involves the user’s identity and could lead to unauthorized access to sensitive information. Note that the A1 is present in multiple locations. If time permits, it’s beneficial to mark all points where an asset is either at rest or in transit."
  },
  'asset-1-db': {
    id: 'asset-1-db',
    title: 'A1 User Session Token (DB)',
    description: 'While analyzing the application, we saw that the session token is the main mechanism for user authentication and authorization. If an attacker obtains this token, they could perform actions on behalf of the user without restriction. This is critical as it directly involves the user\'s identity and could lead to unauthorized access to sensitive information. Note that the A1 is present in multiple locations. If time permits, it\'s beneficial to mark all points where an asset is either at rest or in transit.'
  },
  'asset-2': {
    id: 'asset-2',
    title: 'A2 User Personal Data',
    description: "We identified that the application stores personal data, such as names, social security numbers, and possibly other sensitive information. These data not only need to be protected to comply with privacy laws but are also a common target for attacks. Ensuring the protection of this data is fundamental to preventing leaks that could compromise user privacy and trust."
  },
  'asset-3': {
    id: 'asset-3',
    title: 'A3 Database Credentials',
    description: "Database credentials are essential for the application to connect to the database and perform operations. If an attacker gains access to these credentials, they could directly access the database, with the potential to read, alter, or even delete data. This is a high-priority asset, as exposure of these credentials would fully compromise the integrity and confidentiality of the stored data."
  },
  'threat-1': {
    id: 'threat-1',
    title: 'T1 Sensitive Data Interception',
    description: "This threat was identified when analyzing the data flow between the client and the server. When credentials and personal data are transmitted, there is a risk of interception, particularly if the communication is unencrypted. Interception could allow an attacker to obtain sensitive information in transit, compromising user privacy and data integrity."
  },
  'threat-2': {
    id: 'threat-2',
    title: 'T2 Session Token Exposure',
    description: "The session token is essential for authentication, so any vulnerability allowing unauthorized access to it could result in session hijacking. If the token is exposed, an attacker could perform actions on the system in the user’s name. This was identified by considering the possibilities of insecure storage or improper transmission of the token through vulnerable channels."
  },
  'threat-3': {
    id: 'threat-3',
    title: 'T3 Service Unavailability',
    description: "Availability is a crucial pillar of security. This threat was considered when thinking about denial of service (DoS) attacks or resource overloads that could render the system inaccessible to users. Unavailability, whether due to an intentional attack or a technical failure, directly impacts user experience and system reliability."
  },
  'threat-4': {
    id: 'threat-4',
    title: 'T4 Credentials Exposure',
    description: "Access credentials for databases and other critical services are highly sensitive. During analysis, we noted that poor configuration or insufficient protection of these credentials could expose them, allowing an attacker to access data directly. This threat aims to compromise system security directly by enabling further attacks."
  },
  'threat-5': {
    id: 'threat-5',
    title: 'T5 Unauthorized Access to Personal Information',
    description: "This threat arose from analyzing who could access personal information without permission. Unauthorized access or exposure to personal data could occur due to access control failures or vulnerabilities that allow direct system exploitation. This represents a privacy breach and could lead to legal consequences and loss of user trust."
  },
  'control-1': {
    id: 'control-1',
    title: 'C1 TLS Pinning',
    description: "To prevent man-in-the-middle (MitM) attacks, where an attacker can intercept or alter data in transit, TLS Pinning is implemented. This control ensures that the application only accepts specific and valid certificates, safeguarding the authenticity of the connection to the server."},
  'control-2': {
    id: 'control-2',
    title: 'C2 Encryption of Sensitive Data in Transit',
    description: "Sensitive data, such as personal information or session tokens, is at risk of interception. Encrypting data in transit ensures that any data captured through interception remains unreadable and, therefore, useless to the attacker."},
  'control-3': {
    id: 'control-3',
    title: 'C3 Secure Token Storage',
    description: "To protect session tokens, it is essential to avoid storing them in vulnerable areas. For mobile devices, we use Keychain (iOS) and Keystore (Android), which provide secure, encrypted storage areas, making unauthorized access to tokens more difficult."},
  'control-4': {
    id: 'control-4',
    title: 'C4 Rate Limiting and Request Control',
    description: "Denial of service (DoS) attacks and resource overloads are mitigated by limiting the number of requests allowed per IP or source. This control helps maintain system availability and detect anomalous access patterns."},
  'control-5': {
    id: 'control-5',
    title: 'C5 Encrypted Credential Storage in Secret Management Systems',
    description: "Database credentials are high-priority targets for attackers. Using a secret management system, like AWS Secrets Manager or HashiCorp Vault, allows for encrypted and secure storage, protecting the credentials while facilitating rotation and access monitoring."},
  'control-6': {
    id: 'control-6',
    title: 'C6 Granular Access Controls',
    description: "To reduce the risk of unauthorized access, we implement access controls based on the principle of least privilege, ensuring that each user or process has access only to the data and operations strictly necessary. This limits the impact in case of account or function compromise."},
};

// Progress indicators
const progress = computed(() => {
  const total = Object.values(elements).reduce((acc, arr) => acc + arr.length, 0);
  const placed = Object.values(elements).reduce((acc, arr) => acc + arr.filter(el => el.placed).length, 0);
  return Math.round((placed / total) * 100);
});

// Expand SVG viewBox to create space for element staging
function expandSvgViewBox(svg: SVGSVGElement) {
  const originalViewBox = svg.getAttribute('viewBox') || '';
  const viewBoxValues = originalViewBox.split(' ').map(Number);
  
  // If we have a valid viewBox
  if (viewBoxValues.length === 4) {
    // Add extra width for the element column (20% more)
    const extraWidth = viewBoxValues[2] * 0.2;
    const newWidth = viewBoxValues[2] + extraWidth;
    
    // Set the new viewBox
    svg.setAttribute('viewBox', `${viewBoxValues[0]} ${viewBoxValues[1]} ${newWidth} ${viewBoxValues[3]}`);
    
    // Store dimensions for reference
    svgWidth.value = newWidth;
    svgHeight.value = viewBoxValues[3];
    
    console.log('SVG viewBox expanded:', svg.getAttribute('viewBox'));
  }
}

// Add SVG click handler to log coordinates
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
    
    console.log('Click coordinates:', {
      screen: { x, y },
      svg: { x: svgX, y: svgY }
    });
  });
}

// Load the SVG 
onMounted(async () => {
  try {
    const response = await fetch(svgPath);
    const svgData = await response.text();
    
    // Set the SVG content
    svgContent.value = svgData;
    
    // Wait for the DOM to update with the SVG content
    await nextTick();
    
    // Now extract element positions from the rendered SVG
    if (svgContainer.value) {
      const svg = svgContainer.value.querySelector('svg');
      if (svg) {
        // Expand the SVG viewBox to create more space
        expandSvgViewBox(svg);
        
        // Add click handler to log coordinates
        addSvgClickListener(svg);
        
        // Store original positions before any modifications
        storeElementOriginalPositions(svg);
        
        // Extract asset elements positions
        extractElementPositions(svg, 'asset-', elements.asset);
        
        // Extract threat elements positions
        extractElementPositions(svg, 'threat-', elements.threat);
        
        // Extract control elements positions
        extractElementPositions(svg, 'control-', elements.control);
        
        // Apply Tailwind-like colors to SVG elements
        applyTailwindColors(svg);
        
        // Add element interaction handlers (click and drag)
        addElementEventHandlers(svg);
        
        // Show elements based on game mode, initially all are visible for selection
        showDraggableElements(svg);
        
        // Position elements in a column for initial display
        positionElementsInColumn(svg);
      }
    }
  } catch (error) {
    console.error('Failed to load SVG:', error);
  }
});

// Store the original positions of all elements before any transformations
function storeElementOriginalPositions(svg: SVGSVGElement) {
  const allElements = svg.querySelectorAll('[id^="asset-"], [id^="threat-"], [id^="control-"]');
  const svgRect = svg.getBoundingClientRect();
  
  allElements.forEach(element => {
    const id = element.getAttribute('id') || '';
    const rect = element.getBoundingClientRect();
    
    // Calculate position relative to the SVG
    const x = rect.left - svgRect.left;
    const y = rect.top - svgRect.top;
    
    // Store target position (where the element should be placed)
    targetPositions.set(id, {
      x,
      y,
      width: rect.width,
      height: rect.height
    });
    
    console.log(`Original position of ${id}:`, { x, y });
  });
}

// Apply Tailwind-like colors to SVG elements
function applyTailwindColors(svg: SVGSVGElement) {
  // Assets - use amber-500 (#f59e0b)
  svg.querySelectorAll('[id^="asset-"] [fill="#f08c00"]').forEach(el => {
    (el as SVGElement).setAttribute('fill', '#f59e0b');
  });
  
  // Threats - use red-500 (#ef4444)
  svg.querySelectorAll('[id^="threat-"] [fill="#e03131"]').forEach(el => {
    (el as SVGElement).setAttribute('fill', '#ef4444');
  });
  
  // Controls - use blue-500 (#3b82f6)
  svg.querySelectorAll('[id^="control-"] [fill="#1971c2"]').forEach(el => {
    (el as SVGElement).setAttribute('fill', '#3b82f6');
  });
  
  // Trust boundary - use green-500 (#22c55e)
  svg.querySelectorAll('[stroke="#2f9e44"]').forEach(el => {
    (el as SVGElement).setAttribute('stroke', '#22c55e');
  });
  svg.querySelectorAll('[fill="#2f9e44"]').forEach(el => {
    (el as SVGElement).setAttribute('fill', '#22c55e');
  });
  
  // Make arrows more visible
  svg.querySelectorAll('[id^="arrow-"] path').forEach(el => {
    (el as SVGElement).setAttribute('stroke', '#334155'); // Tailwind slate-700
    (el as SVGElement).setAttribute('stroke-width', '2');
  });
}

// Handler for when an element is clicked (to show info)
function handleElementClick(element: SVGElement) {
  const id = element.getAttribute('id');
  if (!id || !elementInfo[id]) return;
  
  // Update selected element
  selectedElement.value = id;
  console.log('Selected element updated:', id, 'Info:', elementInfo[id].title);
}

// Add element interaction handlers (click and drag)
function addElementEventHandlers(svg: SVGSVGElement) {
  // Target the SVG elements we need to interact with
  const allElements = Array.from(svg.querySelectorAll('[id^="asset-"], [id^="threat-"], [id^="control-"]'));
  
  allElements.forEach(element => {
    const id = element.getAttribute('id');
    if (!id) return;
    
    // Add class for styling
    element.classList.add('svg-element');
    
    // Add click event for info display
    element.addEventListener('click', (e) => {
      if (isDragging.value) return; // Don't trigger click during drag
      
      e.stopPropagation();
      console.log('Element clicked:', id, 'Type:', id.split('-')[0]);
      handleElementClick(element as SVGElement);
    });
    
    // Add mousedown for drag start
    element.addEventListener('mousedown', (e: MouseEvent) => {
      // Prevent default to disable text selection 
      e.preventDefault();
      startDrag(e);
    });
    element.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling when dragging
      startDrag(e);
    });
    
    function startDrag(e: MouseEvent | TouchEvent) {
      // Only handle elements from current game mode
      if (!id.startsWith(gameMode.value)) return;
      console.log('startDrag: ', id);
      // Check if element is already placed
      const el = findElementById(id);
      if (el && el.placed) return;
      
      console.log('Drag started:', id);
      
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
      
      // Start dragging
      isDragging.value = true;
      currentDraggingElement.value = element as SVGElement;
      
      // Create SVG point for coordinate transformation
      const point = svg.createSVGPoint();
      const transform = svg.getScreenCTM()?.inverse();
      if (!transform) return;
      
      // Add visual indication
      element.classList.add('dragging');
      
      // Define position getters based on event type
      const getPos = isTouch ? getTouchPos : getMousePos;
      
      let moving = true;
      let newPt;
      
      // Update function using requestAnimationFrame for smooth animation
      const updateFn = () => {
        if (moving) requestAnimationFrame(updateFn);
        if (!currentDraggingElement.value) return;
        
        // Map screen pixels to SVG coordinates
        newPt = point.matrixTransform(transform);
        
        // Get the original position from our stored map
        const id = element.getAttribute('id') || '';
        const originalPos = originalPositions.get(id);
        
        if (originalPos) {
          // Convert screen pixels to SVG units
          const viewBox = svg.viewBox.baseVal;
          const svgRect = svg.getBoundingClientRect();
          const scaleX = viewBox.width / svgRect.width;
          const scaleY = viewBox.height / svgRect.height;
          
          // Get original position in SVG coordinates
          const svgOrigX = originalPos.x * scaleX;
          const svgOrigY = originalPos.y * scaleY;
          
          // Apply transformation using SVG's transform attribute
          const translateX = newPt.x - svgOrigX;
          const translateY = newPt.y - svgOrigY;
          
          element.setAttribute('transform', `translate(${translateX} ${translateY})`);
        }
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
        
        console.log('Drag ended:', id);
        
        // Remove dragging class
        element.classList.remove('dragging');
        
        // Handle the drop
        if (isTouch) {
          const touch = (evt as TouchEvent).changedTouches[0];
          handleElementDropped(id, touch.clientX, touch.clientY);
        } else {
          handleElementDropped(id, (evt as MouseEvent).clientX, (evt as MouseEvent).clientY);
        }
        
        // Reset dragging state
        isDragging.value = false;
        currentDraggingElement.value = null;
      };
      
      // Add event listeners
      document.addEventListener(events.move, moveFn, { passive: false });
      document.addEventListener(events.stop, stopFn);
    }
  });
}

// Get mouse position
function getMousePos(evt: MouseEvent | TouchEvent, point: DOMPoint) {
  point.x = (evt as MouseEvent).clientX;
  point.y = (evt as MouseEvent).clientY;
}

// Get touch position
function getTouchPos(evt: MouseEvent | TouchEvent, point: DOMPoint) {
  point.x = (evt as TouchEvent).touches[0].clientX;
  point.y = (evt as TouchEvent).touches[0].clientY;
}

// Show draggable elements based on current game mode
function showDraggableElements(svg: SVGSVGElement) {
  // First, hide everything (opacity 0)
  svg.querySelectorAll('[id^="asset-"], [id^="threat-"], [id^="control-"]').forEach(el => {
    (el as SVGElement).style.opacity = '0';
    (el as SVGElement).style.cursor = 'default';
    (el as SVGElement).style.transform = '';
    (el as SVGElement).classList.remove('draggable-svg-element');
    (el as SVGElement).classList.remove('dragging');
  });
  
  // If game is completed, show all placed elements
  if (gameCompleted.value) {
    // Show all placed elements
    phases.forEach(phase => {
      const elementsOfPhase = elements[phase as keyof typeof elements];
      elementsOfPhase.forEach(element => {
        if (element.placed) {
          const el = svg.querySelector(`#${element.id}`);
          if (el) {
            (el as SVGElement).style.opacity = '1';
            (el as SVGElement).style.pointerEvents = 'auto';
            (el as SVGElement).style.cursor = 'pointer';
          }
        }
      });
    });
    return;
  }
  
  // Show elements for current mode
  let elementsToShow: NodeListOf<Element>;
  switch (gameMode.value) {
    case 'asset':
      elementsToShow = svg.querySelectorAll('[id^="asset-"]');
      break;
    case 'threat':
      elementsToShow = svg.querySelectorAll('[id^="threat-"]');
      break;
    case 'control':
      elementsToShow = svg.querySelectorAll('[id^="control-"]');
      break;
    default:
      return;
  }
  
  // Make elements visible and draggable
  elementsToShow.forEach(el => {
    const id = el.getAttribute('id') || '';
    const element = findElementById(id);
    
    // Enable pointer events and visibility for all elements in this phase
    (el as SVGElement).style.pointerEvents = 'auto';
    
    // If element is already placed, show it fully
    if (element?.placed) {
      (el as SVGElement).style.opacity = '1';
      (el as SVGElement).style.cursor = 'pointer';
    } else {
      // Otherwise, make it draggable
      (el as SVGElement).style.opacity = '0.8';
      (el as SVGElement).style.cursor = 'grab';
      (el as SVGElement).classList.add('draggable-svg-element');
    }
  });
  
  // Show only correctly placed elements from other phases (not draggable)
  phases.forEach(phase => {
    if (phase !== gameMode.value) {
      const elementsOfPhase = elements[phase as keyof typeof elements];
      elementsOfPhase.forEach(element => {
        if (element.placed) {
          const el = svg.querySelector(`#${element.id}`);
          if (el) {
            (el as SVGElement).style.opacity = '0.6'; // Slightly dimmed
            (el as SVGElement).style.pointerEvents = 'auto';
            (el as SVGElement).style.cursor = 'pointer';
          }
        } else {
          // Ensure unplaced elements from other phases are completely hidden
          const el = svg.querySelector(`#${element.id}`);
          if (el) {
            (el as SVGElement).style.opacity = '0';
            (el as SVGElement).style.pointerEvents = 'none';
          }
        }
      });
    }
  });
}

// Extract element positions from the SVG
function extractElementPositions(svg: SVGSVGElement, prefix: string, targetArray: any[]) {
  const elements = svg.querySelectorAll(`[id^="${prefix}"]`);
  
  elements.forEach(element => {
    const id = element.getAttribute('id') || '';
    const rect = element.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    
    // Calculate position relative to the SVG
    const x = rect.left - svgRect.left;
    const y = rect.top - svgRect.top;
    
    // Store original position
    originalPositions.set(id, {
      x,
      y,
      width: rect.width,
      height: rect.height
    });
    
    // Add to target array
    targetArray.push({
      id,
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height,
      placed: false
    });
  });
}

// Change game mode
function setGameMode(mode: string) {
  // Don't allow changing to unavailable modes
  if (!phaseStatus[mode].available) {
    currentStatus.value = `Complete the ${gameMode.value} phase first to unlock ${mode}!`;
    return;
  }
  
  if (gameMode.value === mode) return;
  
  gameMode.value = mode;
  currentStatus.value = '';
  selectedElement.value = null;
  
  // Update the SVG and show appropriate elements
  if (svgContainer.value) {
    const svg = svgContainer.value.querySelector('svg');
    if (svg) {
      showDraggableElements(svg);
      positionElementsInColumn(svg);
    }
  }
}

// Position elements in a column at the right side of the view
function positionElementsInColumn(svg: SVGSVGElement) {
  if (!svg) return;
  
  // Define the staging area dimensions exactly as specified
  const stagingArea = {
    x: 2200,
    y: 30,
    width: 300,
    height: 430,
    rx: 10,
    ry: 10
  };
  
  // Create the staging area rectangle
  const existingArea = svg.querySelector('.element-staging-area');
  if (existingArea) {
    existingArea.remove();
  }
  
  // Always create the staging area with exact specifications
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
  
  // Get elements for current game mode
  let elementsToPosition: Element[];
  switch (gameMode.value) {
    case 'asset':
      elementsToPosition = Array.from(svg.querySelectorAll('[id^="asset-"]'));
      break;
    case 'threat':
      elementsToPosition = Array.from(svg.querySelectorAll('[id^="threat-"]'));
      break;
    case 'control':
      elementsToPosition = Array.from(svg.querySelectorAll('[id^="control-"]'));
      break;
    default:
      return;
  }
  
  // Filter out already placed elements
  const unplacedElements = elementsToPosition.filter(el => {
    const id = el.getAttribute('id') || '';
    const element = findElementById(id);
    return !(element && element.placed);
  });
  
  console.log(`Positioning ${unplacedElements.length} elements in column`);
  
  // Use fixed spacing and positioning
  const spacing = 70;
  const centerX = stagingArea.x + (stagingArea.width / 3);
  
  // Position each element in the column
  unplacedElements.forEach((el, index) => {
    const element = el as SVGElement;
    const id = element.getAttribute('id') || '';
    
    // Use the positions we already have in originalPositions
    const originalPos = originalPositions.get(id);
    if (!originalPos) return;
    let yPos;
    // Calculate the y position in the column
    if (el.getAttribute('id').startsWith('asset')) {
      yPos = stagingArea.y + 100 + (index * spacing);
    } else if (el.getAttribute('id').startsWith('control-2')) {
      yPos = stagingArea.y + 80 + (index - 1 * spacing);
    } else {
      yPos = stagingArea.y + 100 + ((index - 2) * spacing);
    }
    
    // Calculate the translation from original to new position
    // We need to convert screen coordinates to SVG coordinates
    const viewBox = svg.viewBox.baseVal;
    const svgRect = svg.getBoundingClientRect();
    
    // Convert screen pixels to SVG units
    const scaleX = viewBox.width / svgRect.width;
    const scaleY = viewBox.height / svgRect.height;
    
    // Get original position in SVG coordinates
    const svgOrigX = originalPos.x * scaleX;
    const svgOrigY = (originalPos.y + 10) * scaleY;
    
    // Calculate how much to move from the original position
    const translateX = (centerX - svgOrigX);
    const translateY = (yPos - svgOrigY);
    
    // Apply SVG transformation
    element.setAttribute('transform', `translate(${translateX} ${translateY})`);
    console.log(`Positioned ${id} at:`, { x: centerX, y: yPos, translate: `${translateX},${translateY}` });
  });
}

// Handle when an element is dropped
function handleElementDropped(id: string, x: number, y: number) {
  if (!svgContainer.value) return;
  
  const svg = svgContainer.value.querySelector('svg');
  if (!svg) return;
  
  const svgRect = svg.getBoundingClientRect();
  const targetPos = targetPositions.get(id); // Use the target position
  
  console.log('Element dropped:', id, 'at position:', { x, y });
  
  if (targetPos) {
    // Convert client coordinates to SVG coordinates
    const svgX = x - svgRect.left;
    const svgY = y - svgRect.top;
    
    // Check if the element is close to its original position
    const distance = Math.sqrt(
      Math.pow(targetPos.x - svgX, 2) + 
      Math.pow(targetPos.y - svgY, 2)
    );
    
    console.log(`Distance to target for ${id}:`, distance.toFixed(2), 'pixels');
    
    // Find the element in our arrays
    const element = findElementById(id);
    const svgElement = svg.querySelector(`#${id}`) as SVGElement;
    
    if (distance < 50) { // Within 50 pixels is considered correct
      currentStatus.value = `Correct! The ${elementInfo[id]?.title || id} is in the right position.`;
      score.value += 10;
      
      console.log('Element correctly placed:', id, 'Distance:', distance.toFixed(2));
      
      if (element) {
        element.placed = true;
      }
      
      // Update element's visual state - move it to exact target position
      if (svgElement) {
        const originalPos = originalPositions.get(id);
        
        if (originalPos) {
          // Convert screen coordinates to SVG coordinates
          const viewBox = svg.viewBox.baseVal;
          const svgRect = svg.getBoundingClientRect();
          const scaleX = viewBox.width / svgRect.width;
          const scaleY = viewBox.height / svgRect.height;
          
          // Calculate exact translation to target position
          const svgOrigX = originalPos.x * scaleX;
          const svgOrigY = originalPos.y * scaleY;
          const svgTargetX = targetPos.x * scaleX;
          const svgTargetY = targetPos.y * scaleY;
          
          const translateX = svgTargetX - svgOrigX;
          const translateY = svgTargetY - svgOrigY;
          
          // Apply transformation
          svgElement.setAttribute('transform', `translate(${translateX} ${translateY})`);
          svgElement.style.opacity = '1';
          svgElement.style.cursor = 'default';
          svgElement.classList.remove('draggable-svg-element');
          
          // After a brief delay, reset the transform
          setTimeout(() => {
            svgElement.setAttribute('transform', '');
          }, 500);
        }
      }
      
      // Check if all elements in the current mode are placed
      checkGameCompletion();
    } else {
      currentStatus.value = `Incorrect. Try placing ${elementInfo[id]?.title || id} in another position.`;
      
      // Return element to the column
      positionElementsInColumn(svg);
    }
  }
}

// Find an element by ID across all arrays
function findElementById(id: string) {
  const allElements = [...elements.asset, ...elements.threat, ...elements.control];
  return allElements.find(el => el.id === id);
}

// Check if all elements in the current mode are placed correctly
function checkGameCompletion() {
  const allPlaced = currentElements.value.every(el => el.placed);
  
  if (allPlaced) {
    // Mark the current phase as completed
    phaseStatus[gameMode.value as keyof typeof phaseStatus].completed = true;
    
    // Unlock the next phase if available
    const currentPhaseIndex = phases.indexOf(gameMode.value);
    if (currentPhaseIndex < phases.length - 1) {
      const nextPhase = phases[currentPhaseIndex + 1];
      phaseStatus[nextPhase as keyof typeof phaseStatus].available = true;
      
      // Show completion message
      currentStatus.value = `Congratulations! You've completed the ${gameMode.value} phase! The ${nextPhase} phase is now unlocked.`;
      
      // Switch to next phase automatically after a short delay
      setTimeout(() => {
        gameMode.value = nextPhase;
        
        // Update the SVG after changing phase
        if (svgContainer.value) {
          const svg = svgContainer.value.querySelector('svg');
          if (svg) {
            showDraggableElements(svg);
            positionElementsInColumn(svg);
            
            // Display a helpful message
            currentStatus.value = `Starting the ${nextPhase} phase. Place the ${nextPhase} elements in the correct locations.`;
          }
        }
      }, 1500); // 1.5 second delay for phase transition
    } else {
      currentStatus.value = `Congratulations! You've completed all phases of the game!`;
      gameCompleted.value = true;
      
      // Update the SVG to show all placed elements
      if (svgContainer.value) {
        const svg = svgContainer.value.querySelector('svg');
        if (svg) {
          showDraggableElements(svg);
        }
      }
    }
  }
}

// Reset the game
function resetGame() {
  score.value = 0;
  currentStatus.value = '';
  gameCompleted.value = false;
  gameMode.value = 'asset';
  selectedElement.value = null;
  
  // Reset phase status
  phases.forEach((phase, index) => {
    phaseStatus[phase].completed = false;
    phaseStatus[phase].available = index === 0; // Only make first phase available
  });
  
  // Reset placement status for all elements
  elements.asset.forEach(el => el.placed = false);
  elements.threat.forEach(el => el.placed = false);
  elements.control.forEach(el => el.placed = false);
  
  // Reset element positions in the SVG
  if (svgContainer.value) {
    const svg = svgContainer.value.querySelector('svg');
    if (svg) {
      svg.querySelectorAll('[id^="asset-"], [id^="threat-"], [id^="control-"]').forEach(el => {
        (el as SVGElement).style.transform = '';
        (el as SVGElement).setAttribute('transform', '');
      });
      
      // Show draggable elements for current mode
      showDraggableElements(svg);
      
      // Position elements in a column
      positionElementsInColumn(svg);
    }
  }
}

// Reset a specific phase
function resetPhase(phase: 'asset' | 'threat' | 'control') {
  // Reset status
  currentStatus.value = `Phase ${phase} reset.`;
  
  // Reset placement status for the phase's elements
  elements[phase].forEach(el => el.placed = false);
  
  // Reset the SVG elements
  if (svgContainer.value) {
    const svg = svgContainer.value.querySelector('svg');
    if (svg) {
      // Reset transformations for the phase's elements
      svg.querySelectorAll(`[id^="${phase}-"]`).forEach(el => {
        (el as SVGElement).style.transform = '';
        (el as SVGElement).setAttribute('transform', '');
      });
      
      // Update phase status if needed
      if (phaseStatus[phase].completed) {
        phaseStatus[phase].completed = false;
        
        // If this was completed and unlocked another phase, reduce score
        if (phase === 'asset' && phaseStatus.threat.available) {
          score.value -= elements[phase].length * 10;
        } else if (phase === 'threat' && phaseStatus.control.available) {
          score.value -= elements[phase].length * 10;
        } else {
          score.value -= elements[phase].length * 10;
        }
      }
      
      // If we're in a different mode, switch to this mode
      if (gameMode.value !== phase) {
        gameMode.value = phase;
      }
      
      // Show draggable elements and position them
      showDraggableElements(svg);
      positionElementsInColumn(svg);
    }
  }
}
</script>

<template>
  <div class="game-container">
    <!-- SVG Display (Top) -->
    <div class="svg-container" ref="svgContainer" v-html="svgContent"></div>
    
    <!-- Sidebar (Bottom) - More compact layout -->
    <div class="sidebar">
      <div class="sidebar-content">
        <!-- Left Column: Game progress and status -->
        <div class="sidebar-column">
          <!-- Game Title and Progress -->
          <div class="sidebar-section">
            <h2 class="text-xl font-bold">Threat Modeling Challenge</h2>
            <div class="w-full bg-gray-200 rounded-full h-3 mt-1">
              <div 
                class="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out" 
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
            <div class="text-right text-xs text-gray-600">{{ progress }}% complete</div>
          </div>
          
          <!-- Game Phases -->
          <div class="sidebar-section mt-3">
            <h3 class="text-md font-semibold">Game Phases</h3>
            <div class="flex flex-col space-y-1 mt-1">
              <div class="flex items-center gap-1">
                <button 
                  @click="setGameMode('asset')" 
                  :class="{ 
                    'bg-amber-500 text-white': gameMode === 'asset', 
                    'bg-amber-100 text-amber-800': gameMode !== 'asset' && phaseStatus.asset.available,
                    'bg-gray-100 text-gray-400': !phaseStatus.asset.available,
                    'border-green-500 border': phaseStatus.asset.completed
                  }" 
                  class="flex-1 px-2 py-1 rounded flex justify-between items-center text-xs"
                >
                  <span>1. Assets</span>
                  <span v-if="phaseStatus.asset.completed" class="text-green-500">✓</span>
                  <span v-else-if="phaseStatus.asset.available" class="text-amber-500">⟶</span>
                  <span v-else class="text-gray-400">🔒</span>
                </button>
                <button
                  v-if="phaseStatus.asset.available"
                  @click="resetPhase('asset')"
                  class="px-1.5 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px]"
                  title="Reset Asset Phase"
                >
                  ↺
                </button>
              </div>
              
              <div class="flex items-center gap-1">
                <button 
                  @click="setGameMode('threat')" 
                  :class="{
                    'bg-red-500 text-white': gameMode === 'threat',
                    'bg-red-100 text-red-800': gameMode !== 'threat' && phaseStatus.threat.available,
                    'bg-gray-100 text-gray-400': !phaseStatus.threat.available,
                    'border-green-500 border': phaseStatus.threat.completed
                  }" 
                  class="flex-1 px-2 py-1 rounded flex justify-between items-center text-xs"
                >
                  <span>2. Threats</span>
                  <span v-if="phaseStatus.threat.completed" class="text-green-500">✓</span>
                  <span v-else-if="phaseStatus.threat.available" class="text-red-500">⟶</span>
                  <span v-else class="text-gray-400">🔒</span>
                </button>
                <button
                  v-if="phaseStatus.threat.available"
                  @click="resetPhase('threat')"
                  class="px-1.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 text-[10px]"
                  title="Reset Threat Phase"
                >
                  ↺
                </button>
              </div>
              
              <div class="flex items-center gap-1">
                <button 
                  @click="setGameMode('control')" 
                  :class="{
                    'bg-blue-500 text-white': gameMode === 'control',
                    'bg-blue-100 text-blue-800': gameMode !== 'control' && phaseStatus.control.available,
                    'bg-gray-100 text-gray-400': !phaseStatus.control.available,
                    'border-green-500 border': phaseStatus.control.completed
                  }" 
                  class="flex-1 px-2 py-1 rounded flex justify-between items-center text-xs"
                >
                  <span>3. Controls</span>
                  <span v-if="phaseStatus.control.completed" class="text-green-500">✓</span>
                  <span v-else-if="phaseStatus.control.available" class="text-blue-500">⟶</span>
                  <span v-else class="text-gray-400">🔒</span>
                </button>
                <button
                  v-if="phaseStatus.control.available"
                  @click="resetPhase('control')"
                  class="px-1.5 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px]"
                  title="Reset Control Phase"
                >
                  ↺
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Middle Column: Element information -->
        <div class="sidebar-column">
          <!-- Selected Element Information -->
          <div class="sidebar-section">
            <h3 class="text-md font-semibold mb-1">Element Information</h3>
            <div v-if="selectedElementInfo" class="bg-blue-50 p-2 rounded border border-blue-200 h-full">
              <h4 class="text-sm font-semibold text-blue-800">{{ selectedElementInfo.title }}</h4>
              <p class="text-blue-800 text-xs mt-1">{{ selectedElementInfo.description }}</p>
            </div>
            <div v-else class="bg-gray-50 p-2 rounded border border-gray-200 h-full">
              <p class="text-gray-500 text-xs">Click on an element to see more information about it.</p>
            </div>
          </div>
        </div>
        
        <!-- Right Column: Game status and elements -->
        <div class="sidebar-column">
          <!-- Game Status -->
          <div class="sidebar-section">
            <div class="flex justify-between items-center">
              <h3 class="text-md font-semibold">Score: {{ score }}</h3>
              <button 
                @click="resetGame" 
                class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
              >
                Reset Game
              </button>
            </div>
            
            <div 
              v-if="currentStatus" 
              class="p-1 rounded mt-1 text-xs" 
              :class="{
                'bg-green-100 text-green-800': currentStatus.includes('Correct') || currentStatus.includes('Congratulations'),
                'bg-red-100 text-red-800': currentStatus.includes('Incorrect'),
                'bg-yellow-100 text-yellow-800': currentStatus.includes('Complete')
              }"
            >
              {{ currentStatus }}
            </div>
          </div>
          
          <!-- Elements to Place -->
          <div class="sidebar-section mt-2">
            <h3 class="text-md font-semibold">{{ gameMode === 'asset' ? 'Assets' : gameMode === 'threat' ? 'Threats' : 'Controls' }}</h3>
            <div class="grid grid-cols-2 gap-1 mt-1">
              <div 
                v-for="element in currentElements" 
                :key="element.id"
                class="p-1 rounded text-xs flex justify-between items-center"
                :class="{
                  'bg-green-100 text-green-800': element.placed,
                  'bg-gray-100': !element.placed,
                  'border-blue-500 border': selectedElement === element.id
                }"
              >
                <span class="truncate">{{ elementInfo[element.id]?.title || element.id }}</span>
                <span v-if="element.placed" class="text-green-500 ml-1">✓</span>
                <span v-else class="text-gray-400 ml-1">⟶</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.svg-container {
  flex: 1 1 auto;
  overflow: auto;
  background-color: #f8fafc;
  width: 100%;
  height: 70vh; /* 70% for the SVG */
}

.svg-container :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.sidebar {
  flex: 0 0 auto;
  height: 35vh;
  width: 100%;
  border-top: 1px solid #e5e7eb;
  background-color: white;
}

.sidebar-content {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 0.75rem;
  gap: 0.75rem;
}

.sidebar-column {
  flex: 1;
  min-width: 0; /* Allows flex items to shrink below content size */
  display: flex;
  flex-direction: column;
}

.sidebar-section {
  width: 100%;
}

/* Add styles for the element column area */
.svg-container :deep(.element-staging-area) {
  fill: rgba(49, 49, 51, 0.5);
  stroke: #e5e7eb;
  stroke-width: 1;
}

/* Add transition for smoother element movement */
.svg-container :deep(.svg-element) {
  transition: transform 0.3s ease, opacity 0.3s ease;
  user-select: none; /* Prevent text selection */
}

/* Remove transition during active dragging */
.svg-container :deep(.dragging) {
  transition: none !important;
}

@media (max-width: 768px) {
  .sidebar-content {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .sidebar-column {
    width: 100%;
  }
  
  .svg-container {
    height: 60vh;
  }
  
  .sidebar {
    height: 40vh;
  }
}
</style> 
