// Mindful Breath Timer Core Logic
// Mobile-first, accessible, single-thread animation loop with requestAnimationFrame

// Configuration constants
const CONFIG = {
  MOBILE_BREAKPOINT: 640,
  VOLUME_LEVEL: 0.5,
  WHITE_NOISE_VOLUME: 0.03,
  BELL_FREQUENCY: 800,
  BELL_DURATION: 0.8,
  RESIZE_DEBOUNCE: 100,
  TRANSITION_DELAY: 150,
  INIT_DELAY: 200,
  ORIENTATION_DELAY: 300,
  SHARE_MESSAGE_TIMEOUT: 2000,
  MIN_SESSION_TIME: 5
};

const state = {
  isRunning: false,
  currentPhaseIndex: 0,
  timeInPhase: 0,
  sessionStartTime: null,
  animationFrameId: null,
  timerIntervalId: null,
  pathLength: 0,
  isInitialized: false,
  resizeTimeout: null,
  lastPhaseIndex: -1,
  audioContext: null,
  whiteNoiseNode: null,
  whiteNoiseGain: null,
  isWhiteNoiseEnabled: false,
  isSoundEnabled: true
};

const patterns = {
  box: { 
    timings: [4, 4, 4, 4], 
    labels: ['Inhale', 'Hold', 'Exhale', 'Hold'], 
    description: 'Balanced 4-part pattern to calm the nervous system.',
    displayName: 'Box Breathing (4-4-4-4)'
  },
  relax: { 
    timings: [4, 7, 8, 0], 
    labels: ['Inhale', 'Hold', 'Exhale', ''], 
    description: '4-7-8 pattern promotes relaxation and better sleep.',
    displayName: '4-7-8 Relaxing Breath'
  },
  energize: { 
    timings: [3, 1, 3, 1], 
    labels: ['Inhale', 'Hold', 'Exhale', 'Hold'], 
    description: 'Quick rhythm to boost alertness and energy.',
    displayName: 'Energizing (3-1-3-1)'
  },
  coherent: { 
    timings: [5, 0, 5, 0], 
    labels: ['Inhale', '', 'Exhale', ''], 
    description: 'Equal inhale/exhale for heart rate variability optimization.',
    displayName: 'Coherent (5-0-5-0)'
  },
  triangle: { 
    timings: [4, 4, 8, 0], 
    labels: ['Inhale', 'Hold', 'Exhale', ''], 
    description: 'Extended exhale pattern for deep calming effect.',
    displayName: 'Triangle (4-4-8-0)'
  },
  deepRelax: { 
    timings: [6, 2, 8, 2], 
    labels: ['Inhale', 'Hold', 'Exhale', 'Hold'], 
    description: 'Deep relaxation with extended exhale for maximum calm.',
    displayName: 'Deep Relaxation (6-2-8-2)'
  }
};

// Utility functions
const utils = {
  qs: (id) => document.getElementById(id),
  isMobile: () => window.innerWidth <= CONFIG.MOBILE_BREAKPOINT,
  easeInOutQuad: (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  debounce: (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  },
  formatTime: (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  },
  showMessage: (element, message, color, timeout = CONFIG.SHARE_MESSAGE_TIMEOUT) => {
    const originalText = element.textContent;
    const originalColor = element.style.color;
    element.textContent = message;
    element.style.color = color;
    setTimeout(() => {
      element.textContent = originalText;
      element.style.color = originalColor;
    }, timeout);
  }
};

const elements = {};

// Audio utilities
const audioUtils = {
  resumeContext: async () => {
    if (state.audioContext?.state === 'suspended') {
      try {
        await state.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  },
  
  setGainValue: (gainNode, value, rampTime = 0.1) => {
    if (!gainNode || !state.audioContext) return;
    const currentTime = state.audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(value, currentTime + rampTime);
  }
};

// DOM utilities
const domUtils = {
  updateToggle: (element, isActive) => {
    if (!element) return;
    element.classList.toggle('active', isActive);
    element.setAttribute('aria-pressed', isActive);
  },
  
  updateButtonStyle: (button, isStop) => {
    const removeClasses = isStop 
      ? ['bg-gradient-to-r', 'from-indigo-500', 'to-blue-500', 'hover:from-indigo-600', 'hover:to-blue-600', 'shadow-indigo-500/20']
      : ['bg-gradient-to-r', 'from-rose-500', 'to-pink-500', 'hover:from-rose-600', 'hover:to-pink-600', 'shadow-rose-500/20'];
    
    const addClasses = isStop 
      ? ['bg-gradient-to-r', 'from-rose-500', 'to-pink-500', 'hover:from-rose-600', 'hover:to-pink-600', 'shadow-rose-500/20']
      : ['bg-gradient-to-r', 'from-indigo-500', 'to-blue-500', 'hover:from-indigo-600', 'hover:to-blue-600', 'shadow-indigo-500/20'];
    
    button.classList.remove(...removeClasses);
    button.classList.add(...addClasses);
    button.textContent = isStop ? 'Stop' : 'Start';
  },
  
  populatePatternDropdown: () => {
    if (!elements.patternSelect) return;
    
    // Set color scheme for better option visibility
    elements.patternSelect.style.colorScheme = 'dark';
    
    // Clear existing options
    elements.patternSelect.innerHTML = '';
    
    // Add pattern options
    Object.entries(patterns).forEach(([key, pattern]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = pattern.displayName;
      option.style.backgroundColor = 'rgb(30 41 59)'; // slate-800
      option.style.color = 'rgb(241 245 249)'; // slate-100
      option.style.padding = '0.5rem';
      elements.patternSelect.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Pattern';
    customOption.style.backgroundColor = 'rgb(30 41 59)'; // slate-800
    customOption.style.color = 'rgb(241 245 249)'; // slate-100
    customOption.style.padding = '0.5rem';
    elements.patternSelect.appendChild(customOption);
    
    // Set default selection to first pattern
    elements.patternSelect.selectedIndex = 0;
  }
};

function cacheDom() {
  const elementIds = [
    'ball', 'mountainPath', 'mountainFill', 'animationSvg', 'animationContainer',
    'statusText', 'sessionTimer', 'startStopBtn', 'patternSelect', 'customInputs',
    'customInhale', 'customHold1', 'customExhale', 'customHold2', 'sessionSummary',
    'shareBtn', 'soundToggle', 'whiteNoiseToggle'
  ];
  
  elementIds.forEach(id => {
    elements[id] = utils.qs(id);
  });
}

// Pattern and timing utilities
const patternUtils = {
  getActivePattern: () => {
    const selected = elements.patternSelect.value;
    if (selected === 'custom') {
      return {
        timings: [
          parseFloat(elements.customInhale.value) || 4,
          parseFloat(elements.customHold1.value) || 0,
          parseFloat(elements.customExhale.value) || 4,
          parseFloat(elements.customHold2.value) || 0,
        ],
        labels: ['Inhale', 'Hold', 'Exhale', 'Hold']
      };
    }
    return patterns[selected];
  },
  
  calculateTotalTime: (pattern) => pattern.timings.reduce((sum, time) => sum + time, 0),
  
  calculateElapsedTime: (pattern, currentPhaseIndex, timeInPhase) => {
    let elapsed = 0;
    for (let i = 0; i < currentPhaseIndex; i++) {
      elapsed += pattern.timings[i];
    }
    elapsed += Math.min(timeInPhase, pattern.timings[currentPhaseIndex]);
    return elapsed;
  },
  
  calculateProgress: (pattern, currentPhaseIndex, timeInPhase) => {
    const totalTime = patternUtils.calculateTotalTime(pattern);
    if (totalTime === 0) return 0;
    const elapsed = patternUtils.calculateElapsedTime(pattern, currentPhaseIndex, timeInPhase);
    return elapsed / totalTime;
  }
};

function getActivePattern() {
  return patternUtils.getActivePattern();
}

// Build a mobile-optimized breathing-pattern-based mountain path using D3
function buildMountainPath() {
  if (typeof d3 === 'undefined') {
    console.warn('D3 is not loaded. Falling back to static path.');
    return;
  }

  const svg = d3.select(elements.animationSvg);
  const viewBox = elements.animationSvg.viewBox.baseVal;
  const { width, height } = viewBox;

  // Get breathing pattern timings
  const pattern = patternUtils.getActivePattern();
  const [inhale, hold1, exhale, hold2] = pattern.timings;
  const totalTime = patternUtils.calculateTotalTime(pattern);
  
  // Mobile-optimized dimensions
  const isMobile = utils.isMobile();
  const startX = isMobile ? 15 : 20;
  const endX = width - (isMobile ? 15 : 20);
  const baseY = height - (isMobile ? 25 : 30);
  const peakY = isMobile ? 30 : 40;
  
  let points = [];
  
  if (totalTime === 0) {
    points = [[startX, baseY], [endX, baseY]];
  } else {
    const numPoints = isMobile ? 40 : 50;
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const x = startX + (endX - startX) * progress;
      
      // Calculate which phase and progress within that phase
      const targetTime = progress * totalTime;
      let phaseProgress = 0;
      let currentPhase = 0;
      let accumulatedTime = 0;
      
      for (let p = 0; p < pattern.timings.length; p++) {
        if (targetTime <= accumulatedTime + pattern.timings[p]) {
          currentPhase = p;
          phaseProgress = pattern.timings[p] > 0 ? (targetTime - accumulatedTime) / pattern.timings[p] : 0;
          break;
        }
        accumulatedTime += pattern.timings[p];
      }
      
      // Calculate Y position based on phase
      let y = baseY;
      const easedProgress = utils.easeInOutQuad(phaseProgress);
      
      switch (currentPhase) {
        case 0: // Inhale
          y = baseY - (baseY - peakY) * easedProgress;
          break;
        case 1: // Hold at top
          const topVariation = isMobile ? 1 : 2;
          y = peakY + Math.sin(phaseProgress * Math.PI * 4) * topVariation;
          break;
        case 2: // Exhale
          y = peakY + (baseY - peakY) * easedProgress;
          break;
        default: // Hold at bottom
          const bottomVariation = isMobile ? 0.5 : 1;
          y = baseY + Math.sin(phaseProgress * Math.PI * 3) * bottomVariation;
      }
      
      points.push([x, y]);
    }
  }
  
  // Ensure minimum points
  if (points.length < 2) {
    points = [[startX, baseY], [endX, baseY]];
  }

  // Generate smooth path
  const tension = isMobile ? 0.3 : 0.5;
  const line = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveCardinal.tension(tension));

  // Create path for stroke
  elements.mountainPath.setAttribute('d', line(points));

  // Create filled mountain shape
  if (elements.mountainFill) {
    const fillPoints = [[0, height], ...points, [width, height], [0, height]];
    elements.mountainFill.setAttribute('d', line(fillPoints));
  }

  // Store path length for animation
  try {
    state.pathLength = elements.mountainPath.getTotalLength();
  } catch (e) {
    state.pathLength = 0;
    console.error('Failed to compute path length', e);
  }
}

// Helper easing function
function easeInOutQuad(x) {
  return utils.easeInOutQuad(x);
}

// Audio System - Web Audio API for generated sounds
function initAudioContext() {
  if (state.audioContext) return;
  
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    createWhiteNoise();
  } catch (error) {
    console.warn('Web Audio API not supported:', error);
    state.audioContext = null;
  }
}

function createWhiteNoise() {
  if (!state.audioContext) return;
  
  try {
    const bufferSize = state.audioContext.sampleRate * 2;
    const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    // Create and connect nodes
    state.whiteNoiseNode = state.audioContext.createBufferSource();
    state.whiteNoiseNode.buffer = buffer;
    state.whiteNoiseNode.loop = true;
    
    state.whiteNoiseGain = state.audioContext.createGain();
    state.whiteNoiseGain.gain.value = 0;
    
    state.whiteNoiseNode.connect(state.whiteNoiseGain);
    state.whiteNoiseGain.connect(state.audioContext.destination);
    state.whiteNoiseNode.start();
  } catch (error) {
    console.warn('Failed to create white noise:', error);
  }
}

function playBellSound(frequency = CONFIG.BELL_FREQUENCY, duration = CONFIG.BELL_DURATION) {
  if (!state.audioContext || !state.isSoundEnabled) return;

  try {
    audioUtils.resumeContext();
    const now = state.audioContext.currentTime;

    // Bell harmonic frequencies and amplitudes
    const harmonics = [
      { freq: frequency, amp: 0.4 },
      { freq: frequency * 2.76, amp: 0.3 },
      { freq: frequency * 5.4, amp: 0.15 },
      { freq: frequency * 8.93, amp: 0.08 },
      { freq: frequency * 1.5, amp: 0.2 }
    ];

    harmonics.forEach((harmonic, index) => {
      const oscillator = state.audioContext.createOscillator();
      const gainNode = state.audioContext.createGain();
      
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(harmonic.freq, now);

      // Bell envelope
      const volume = harmonic.amp * CONFIG.VOLUME_LEVEL;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.1, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Add modulation for fundamental frequency
      if (index === 0) {
        const modOscillator = state.audioContext.createOscillator();
        const modGain = state.audioContext.createGain();
        
        modOscillator.frequency.setValueAtTime(5, now);
        modOscillator.type = 'sine';
        modGain.gain.setValueAtTime(2, now);
        
        modOscillator.connect(modGain);
        modGain.connect(oscillator.frequency);
        
        modOscillator.start(now);
        modOscillator.stop(now + duration);
      }

      oscillator.connect(gainNode);
      gainNode.connect(state.audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  } catch (error) {
    console.warn('Failed to play bell sound:', error);
  }
}

function toggleWhiteNoise() {
  if (!state.audioContext) initAudioContext();
  if (!state.audioContext || !state.whiteNoiseGain) return;

  state.isWhiteNoiseEnabled = !state.isWhiteNoiseEnabled;

  try {
    audioUtils.resumeContext();
    const targetVolume = state.isWhiteNoiseEnabled ? CONFIG.WHITE_NOISE_VOLUME * CONFIG.VOLUME_LEVEL : 0;
    audioUtils.setGainValue(state.whiteNoiseGain, targetVolume);
    domUtils.updateToggle(elements.whiteNoiseToggle, state.isWhiteNoiseEnabled);
  } catch (error) {
    console.warn('Failed to toggle white noise:', error);
  }
}

function toggleSound() {
  state.isSoundEnabled = !state.isSoundEnabled;
  domUtils.updateToggle(elements.soundToggle, state.isSoundEnabled);

  // Turn off white noise if sound is disabled
  if (!state.isSoundEnabled && state.isWhiteNoiseEnabled) {
    state.isWhiteNoiseEnabled = false;
    if (state.whiteNoiseGain) {
      audioUtils.setGainValue(state.whiteNoiseGain, 0);
    }
    domUtils.updateToggle(elements.whiteNoiseToggle, false);
  }
}

// Mobile-optimized ball positioning using precise SVG coordinates
function updateBallPosition(progress) {
  if (!state.pathLength || !elements.mountainPath || !elements.animationContainer) return;

  try {
    const pathPoint = elements.mountainPath.getPointAtLength(progress * state.pathLength);
    const containerRect = elements.animationContainer.getBoundingClientRect();
    const svgRect = elements.animationSvg.getBoundingClientRect();
    const viewBox = elements.animationSvg.viewBox.baseVal;
    
    // Calculate scale factors
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    
    // Position ball
    const pixelX = pathPoint.x * scaleX;
    const pixelY = pathPoint.y * scaleY;
    
    Object.assign(elements.ball.style, {
      left: `${pixelX}px`,
      top: `${pixelY}px`,
      transform: 'translate(-50%, -50%)',
      display: 'block'
    });
  } catch (e) {
    console.warn('Failed to position ball:', e);
    // Fallback positioning
    Object.assign(elements.ball.style, {
      left: '50%',
      top: '75%',
      transform: 'translate(-50%, -50%)'
    });
  }
}

function updateStatusText(text) {
  if (elements.statusText.innerText !== text) {
    elements.statusText.classList.add('opacity-0');
    setTimeout(() => {
      elements.statusText.innerText = text;
      elements.statusText.classList.remove('opacity-0');
    }, CONFIG.TRANSITION_DELAY);
  }
}

function updateSessionTimer() {
  if (!state.isRunning) return;
  const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  elements.sessionTimer.textContent = utils.formatTime(elapsedSeconds);
}

let lastTimestamp = 0;
function mainLoop(timestamp) {
  if (!state.isRunning) return;
  
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const pattern = patternUtils.getActivePattern();
  const currentPhaseDuration = pattern.timings[state.currentPhaseIndex];

  if (currentPhaseDuration <= 0) {
    state.currentPhaseIndex = (state.currentPhaseIndex + 1) % pattern.timings.length;
    state.timeInPhase = 0;
    state.animationFrameId = requestAnimationFrame(mainLoop);
    return;
  }

  state.timeInPhase += deltaTime;
  const currentLabel = pattern.labels[state.currentPhaseIndex];
  updateStatusText(currentLabel || '');
  elements.ball.classList.toggle('breathe-glow', currentLabel === 'Hold');

  // Play bell sound when phase changes
  if (state.lastPhaseIndex !== state.currentPhaseIndex && state.lastPhaseIndex !== -1) {
    playBellSound();
  }
  state.lastPhaseIndex = state.currentPhaseIndex;

  // Update ball position
  const progress = patternUtils.calculateProgress(pattern, state.currentPhaseIndex, state.timeInPhase);
  updateBallPosition(progress);

  if (state.timeInPhase >= currentPhaseDuration) {
    state.timeInPhase = 0;
    state.currentPhaseIndex = (state.currentPhaseIndex + 1) % pattern.timings.length;
  }

  state.animationFrameId = requestAnimationFrame(mainLoop);
}

function resetState() {
  Object.assign(state, {
    currentPhaseIndex: 0,
    timeInPhase: 0,
    lastPhaseIndex: -1
  });
}

function start() {
  initAudioContext();
  
  state.isRunning = true;
  state.sessionStartTime = Date.now();
  
  domUtils.updateButtonStyle(elements.startStopBtn, true);
  elements.patternSelect.disabled = true;
  updateStatusText('Inhale');
  resetState();
  elements.sessionSummary.textContent = '';
  
  state.timerIntervalId = setInterval(updateSessionTimer, 1000);
  lastTimestamp = 0;
  
  playBellSound(); // Initial bell sound
  state.animationFrameId = requestAnimationFrame(mainLoop);
}

function stop() {
  state.isRunning = false;
  
  domUtils.updateButtonStyle(elements.startStopBtn, false);
  elements.patternSelect.disabled = false;
  
  cancelAnimationFrame(state.animationFrameId);
  clearInterval(state.timerIntervalId);
  elements.ball.classList.remove('breathe-glow');
  
  // Stop white noise smoothly
  if (state.whiteNoiseGain && state.audioContext) {
    audioUtils.setGainValue(state.whiteNoiseGain, 0, 0.2);
  }
  
  updateStatusText('Select a pattern');
  updateBallPosition(0);
  summarizeSession();
}

function summarizeSession() {
  if (!state.sessionStartTime) return;
  const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  if (elapsedSeconds < CONFIG.MIN_SESSION_TIME) return;
  const minutes = (elapsedSeconds / 60).toFixed(1);
  elements.sessionSummary.textContent = `Completed ${minutes} min session. Great job maintaining focus.`;
}

function handleStartStopClick() {
  state.isRunning ? stop() : start();
}

// Optimized resize handler with debouncing
const handleResize = utils.debounce(() => {
  buildMountainPath();
  
  // Update ball position after path rebuild
  if (state.isRunning) {
    const pattern = patternUtils.getActivePattern();
    const progress = patternUtils.calculateProgress(pattern, state.currentPhaseIndex, state.timeInPhase);
    updateBallPosition(progress);
  } else {
    updateBallPosition(0);
  }
}, CONFIG.RESIZE_DEBOUNCE);

function handlePatternChange() {
  if (state.isRunning) stop();
  
  const isCustom = elements.patternSelect.value === 'custom';
  elements.customInputs.classList.toggle('hidden', !isCustom);
  elements.customInputs.classList.toggle('grid', isCustom);
  
  elements.sessionTimer.textContent = '00:00';
  resetState();
  
  // Rebuild mountain path when pattern changes
  setTimeout(() => {
    buildMountainPath();
    updateBallPosition(0);
  }, 50);
}

// Share functionality
const shareUtils = {
  getPatternName: (pattern) => {
    const patternNames = {
      custom: 'Custom',
      box: 'Box Breathing',
      relax: '4-7-8 Relaxing Breath',
      energize: 'Energizing Breath',
      coherent: 'Coherent Breathing',
      triangle: 'Triangle Breathing'
    };
    return patternNames[pattern] || 'Unknown Pattern';
  },
  
  createShareText: (time, pattern) => 
    `I just completed a ${time} mindful breathing session using the ${shareUtils.getPatternName(pattern)} pattern.`,
  
  fallbackCopy: (text) => {
    const textarea = document.createElement('textarea');
    Object.assign(textarea, {
      value: text,
      style: 'position: fixed; left: -9999px;'
    });
    
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

function shareSession() {
  const time = elements.sessionTimer.textContent;
  const pattern = elements.patternSelect.value;
  const shareText = shareUtils.createShareText(time, pattern);
  const shareUrl = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: 'Mindful Breath Timer Session',
      text: shareText,
      url: shareUrl
    }).catch(() => {
      fallbackShare(shareText, shareUrl);
    });
  } else {
    fallbackShare(shareText, shareUrl);
  }
}

function fallbackShare(text, url) {
  const fullText = `${text}\n${url}`;
  const success = shareUtils.fallbackCopy(fullText);
  const message = success ? 'Share link copied!' : 'Share not supported on this device';
  const color = success ? '#10b981' : '#f59e0b';
  utils.showMessage(elements.sessionSummary, message, color);
}

// Mobile-optimized initialization
function init() {
  cacheDom();
  
  // Populate dropdown with patterns from JavaScript
  domUtils.populatePatternDropdown();
  
  // Set year in footer
  const yearElement = utils.qs('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
  
  // Register service worker for offline & caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.log('SW registration failed', err));
    });
  }
  
  // Initialize mountain path after DOM is ready
  setTimeout(() => {
    buildMountainPath();
    try {
      state.pathLength = elements.mountainPath.getTotalLength();
    } catch (e) {
      state.pathLength = 0;
    }
    updateBallPosition(0);
    state.isInitialized = true;
  }, CONFIG.INIT_DELAY);
  
  // Event listeners
  elements.startStopBtn.addEventListener('click', handleStartStopClick);
  elements.patternSelect.addEventListener('change', handlePatternChange);
  elements.shareBtn.addEventListener('click', shareSession);
  
  // Audio control event listeners
  elements.soundToggle?.addEventListener('click', toggleSound);
  elements.whiteNoiseToggle?.addEventListener('click', toggleWhiteNoise);
  
  // Initialize pattern selection
  handlePatternChange();
  
  // Optimized event handlers
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, CONFIG.ORIENTATION_DELAY);
  });
  
  // Prevent zoom on double tap for better mobile UX
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // Add touch-friendly focus handling
  document.addEventListener('touchstart', () => {
    document.body.classList.add('touch-device');
  }, { once: true });
}

// Enhanced DOM ready detection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}