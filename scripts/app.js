// Mindful Breath Timer Core Logic
// Accessible, single-thread animation loop with requestAnimationFrame

const state = {
  isRunning: false,
  currentPhaseIndex: 0,
  timeInPhase: 0,
  sessionStartTime: null,
  animationFrameId: null,
  timerIntervalId: null,
  pathLength: 0,
};

const patterns = {
  box: { 
    timings: [4, 4, 4, 4], 
    labels: ['Inhale', 'Hold', 'Exhale', 'Hold'], 
    description: 'Balanced 4-part pattern to calm the nervous system.' 
  },
  relax: { 
    timings: [4, 7, 8, 0], 
    labels: ['Inhale', 'Hold', 'Exhale', ''], 
    description: '4-7-8 pattern promotes relaxation and better sleep.' 
  },
  energize: { 
    timings: [3, 1, 3, 1], 
    labels: ['Inhale', 'Hold', 'Exhale', 'Hold'], 
    description: 'Quick rhythm to boost alertness and energy.' 
  },
  coherent: { 
    timings: [5, 0, 5, 0], 
    labels: ['Inhale', '', 'Exhale', ''], 
    description: 'Equal inhale/exhale for heart rate variability optimization.' 
  },
  triangle: { 
    timings: [4, 4, 8, 0], 
    labels: ['Inhale', 'Hold', 'Exhale', ''], 
    description: 'Extended exhale pattern for deep calming effect.' 
  }
};

function qs(id) { return document.getElementById(id); }

const elements = {};

function cacheDom() {
  elements.ball = qs('ball');
  elements.mountainPath = qs('mountainPath');
  elements.mountainFill = qs('mountainFill');
  elements.animationSvg = qs('animationSvg');
  elements.statusText = qs('statusText');
  elements.sessionTimer = qs('sessionTimer');
  elements.startStopBtn = qs('startStopBtn');
  elements.patternSelect = qs('patternSelect');
  elements.customInputs = qs('customInputs');
  elements.customInhale = qs('customInhale');
  elements.customHold1 = qs('customHold1');
  elements.customExhale = qs('customExhale');
  elements.customHold2 = qs('customHold2');
  elements.sessionSummary = qs('sessionSummary');
  elements.shareBtn = qs('shareBtn');
}

function getActivePattern() {
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
}

// Build a simple breathing-pattern-based mountain path using D3
function buildMountainPath() {
  if (typeof d3 === 'undefined') {
    console.warn('D3 is not loaded. Falling back to static path.');
    return;
  }

  const svg = d3.select(elements.animationSvg);
  const viewBox = elements.animationSvg.viewBox.baseVal;
  const width = viewBox.width;
  const height = viewBox.height;

  // Get breathing pattern timings
  const pattern = getActivePattern();
  const [inhale, hold1, exhale, hold2] = pattern.timings;
  const totalTime = inhale + hold1 + exhale + hold2;
  
  // Create simple arc path based on breathing pattern
  const startX = 20;
  const endX = width - 20;
  const baseY = height - 30;
  const peakY = 40;
  
  let points = [];
  
  if (totalTime === 0) {
    // Flat line if no breathing phases
    points = [[startX, baseY], [endX, baseY]];
  } else {
    // Create smooth arc that represents one complete breath cycle
    const numPoints = 50; // Smooth curve with 50 points
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints; // 0 to 1
      const x = startX + (endX - startX) * progress;
      
      // Calculate which phase we're in based on progress
      let phaseProgress = 0;
      let currentPhase = 0;
      let accumulatedTime = 0;
      
      // Find which phase this progress point belongs to
      const targetTime = progress * totalTime;
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
      
      if (currentPhase === 0) {
        // Inhale: rise smoothly
        y = baseY - (baseY - peakY) * easeInOutQuad(phaseProgress);
      } else if (currentPhase === 1) {
        // Hold at top: stay at peak with slight variation
        y = peakY + Math.sin(phaseProgress * Math.PI * 4) * 2;
      } else if (currentPhase === 2) {
        // Exhale: descend smoothly
        y = peakY + (baseY - peakY) * easeInOutQuad(phaseProgress);
      } else {
        // Hold at bottom: stay at base with slight variation
        y = baseY + Math.sin(phaseProgress * Math.PI * 3) * 1;
      }
      
      points.push([x, y]);
    }
  }
  
  // Ensure we have at least 2 points
  if (points.length < 2) {
    points = [[startX, baseY], [endX, baseY]];
  }

  // Generate smooth path using d3.line
  const line = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveCardinal);

  // Create path for stroke
  const pathData = line(points);
  elements.mountainPath.setAttribute('d', pathData);

  // Create filled mountain shape
  if (elements.mountainFill) {
    const fillPoints = [
      [0, height - 5],
      ...points,
      [width, height - 5],
      [0, height - 5]
    ];
    const fillPath = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveCardinal)(fillPoints);
    elements.mountainFill.setAttribute('d', fillPath);
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
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// Simplified ball positioning using SVG coordinates directly
function updateBallPosition(progress) {
  if (!state.pathLength || !elements.mountainPath) {
    return;
  }

  try {
    // Get point along the path (progress is 0 to 1)
    const pathPoint = elements.mountainPath.getPointAtLength(progress * state.pathLength);
    
    // Get SVG viewBox dimensions
    const viewBox = elements.animationSvg.viewBox.baseVal;
    const viewBoxWidth = viewBox.width;
    const viewBoxHeight = viewBox.height;
    
    // Get actual SVG element dimensions
    const svgRect = elements.animationSvg.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = svgRect.width / viewBoxWidth;
    const scaleY = svgRect.height / viewBoxHeight;
    
    // Convert SVG coordinates to actual pixel coordinates
    const pixelX = pathPoint.x * scaleX;
    const pixelY = pathPoint.y * scaleY;
    
    // Position ball (centered on the point)
    elements.ball.style.left = `${pixelX}px`;
    elements.ball.style.top = `${pixelY}px`;
    elements.ball.style.transform = 'translate(-50%, -50%)';
    
  } catch (e) {
    console.warn('Failed to position ball:', e);
  }
}

function updateStatusText(text) {
  if (elements.statusText.innerText !== text) {
    elements.statusText.classList.add('opacity-0');
    setTimeout(() => {
      elements.statusText.innerText = text;
      elements.statusText.classList.remove('opacity-0');
    }, 180);
  }
}

function updateSessionTimer() {
  if (!state.isRunning) return;
  const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  elements.sessionTimer.textContent = `${minutes}:${seconds}`;
}

let lastTimestamp = 0;
function mainLoop(timestamp) {
  if (!state.isRunning) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const pattern = getActivePattern();
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

  // Calculate total progress through the complete breathing cycle
  const totalTime = pattern.timings.reduce((sum, time) => sum + time, 0);
  
  if (totalTime > 0) {
    // Calculate how much time has elapsed in the current cycle
    let elapsedCycleTime = 0;
    for (let i = 0; i < state.currentPhaseIndex; i++) {
      elapsedCycleTime += pattern.timings[i];
    }
    elapsedCycleTime += Math.min(state.timeInPhase, currentPhaseDuration);
    
    // Convert to progress (0 to 1)
    const totalProgress = elapsedCycleTime / totalTime;
    updateBallPosition(totalProgress);
  }

  if (state.timeInPhase >= currentPhaseDuration) {
    state.timeInPhase = 0;
    state.currentPhaseIndex = (state.currentPhaseIndex + 1) % pattern.timings.length;
  }

  state.animationFrameId = requestAnimationFrame(mainLoop);
}

function resetState() {
  state.currentPhaseIndex = 0;
  state.timeInPhase = 0;
}

function start() {
  state.isRunning = true;
  state.sessionStartTime = Date.now();
  elements.startStopBtn.textContent = 'Stop';
  elements.startStopBtn.classList.remove('bg-gradient-to-r', 'from-indigo-500', 'to-blue-500', 'hover:from-indigo-600', 'hover:to-blue-600', 'shadow-indigo-500/20');
  elements.startStopBtn.classList.add('bg-gradient-to-r', 'from-rose-500', 'to-pink-500', 'hover:from-rose-600', 'hover:to-pink-600', 'shadow-rose-500/20');
  elements.patternSelect.disabled = true;
  updateStatusText('Inhale');
  resetState();
  elements.sessionSummary.textContent = '';
  state.timerIntervalId = setInterval(updateSessionTimer, 1000);
  lastTimestamp = 0;
  state.animationFrameId = requestAnimationFrame(mainLoop);
}

function stop() {
  state.isRunning = false;
  elements.startStopBtn.textContent = 'Start';
  elements.startStopBtn.classList.remove('bg-gradient-to-r', 'from-rose-500', 'to-pink-500', 'hover:from-rose-600', 'hover:to-pink-600', 'shadow-rose-500/20');
  elements.startStopBtn.classList.add('bg-gradient-to-r', 'from-indigo-500', 'to-blue-500', 'hover:from-indigo-600', 'hover:to-blue-600', 'shadow-indigo-500/20');
  elements.patternSelect.disabled = false;
  cancelAnimationFrame(state.animationFrameId);
  clearInterval(state.timerIntervalId);
  elements.ball.classList.remove('breathe-glow');
  updateStatusText('Select a pattern');
  updateBallPosition(0);
  summarizeSession();
}

function summarizeSession() {
  if (!state.sessionStartTime) return;
  const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  if (elapsedSeconds < 5) return; // ignore very short sessions
  const minutes = (elapsedSeconds / 60).toFixed(1);
  elements.sessionSummary.textContent = `Completed ${minutes} min session (${elapsedSeconds}s). Great job maintaining focus.`;
}

function handleStartStopClick() {
  state.isRunning ? stop() : start();
}

function handleResize() {
  buildMountainPath();
  // Update ball position immediately after path rebuild
  if (state.isRunning) {
    const pattern = getActivePattern();
    const totalTime = pattern.timings.reduce((sum, time) => sum + time, 0);
    if (totalTime > 0) {
      let elapsedPhaseTime = 0;
      for (let i = 0; i < state.currentPhaseIndex; i++) {
        elapsedPhaseTime += pattern.timings[i];
      }
      elapsedPhaseTime += state.timeInPhase;
      const totalProgress = Math.min(elapsedPhaseTime / totalTime, 1);
      updateBallPosition(totalProgress);
    }
  } else {
    updateBallPosition(0);
  }
}

function handlePatternChange() {
  if (state.isRunning) stop();
  const isCustom = elements.patternSelect.value === 'custom';
  elements.customInputs.classList.toggle('hidden', !isCustom);
  if (isCustom) {
    elements.customInputs.classList.add('grid');
  } else {
    elements.customInputs.classList.remove('grid');
  }
  elements.sessionTimer.textContent = '00:00';
  resetState();
  // Rebuild mountain path when pattern changes
  buildMountainPath();
  updateBallPosition(0);
}

function shareSession() {
  const time = elements.sessionTimer.textContent;
  const pattern = elements.patternSelect.value;
  const patternName = pattern === 'custom' ? 'Custom' : 
                      pattern === 'box' ? 'Box Breathing' : 
                      pattern === 'relax' ? '4-7-8 Relaxing Breath' :
                      pattern === 'energize' ? 'Energizing Breath' :
                      pattern === 'coherent' ? 'Coherent Breathing' :
                      'Triangle Breathing';
  
  const shareText = `I just completed a ${time} mindful breathing session using the ${patternName} pattern.`;
  const shareUrl = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: 'Mindful Breath Timer Session',
      text: shareText,
      url: shareUrl
    }).catch(error => {
      console.log('Error sharing:', error);
      fallbackShare(shareText, shareUrl);
    });
  } else {
    fallbackShare(shareText, shareUrl);
  }
}

function fallbackShare(text, url) {
  // Create a temporary input to copy the text
  const textarea = document.createElement('textarea');
  textarea.value = `${text}\n${url}`;
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    // Just show a simple non-scary message
    const messageEl = elements.sessionSummary;
    const originalText = messageEl.textContent;
    messageEl.textContent = 'Share link copied!';
    messageEl.style.color = '#10b981'; // emerald-400
    
    // Restore original text after 2 seconds
    setTimeout(() => {
      messageEl.textContent = originalText;
      messageEl.style.color = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
  
  document.body.removeChild(textarea);
}

function init() {
  cacheDom();
  
  // Set year in footer
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // Register service worker for offline & caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('SW reg failed', err));
    });
  }
  
  setTimeout(() => {
    buildMountainPath();
    try {
      state.pathLength = elements.mountainPath.getTotalLength();
    } catch (e) {
      state.pathLength = 0;
    }
    updateBallPosition(0);
  }, 120);
  
  elements.startStopBtn.addEventListener('click', handleStartStopClick);
  elements.patternSelect.addEventListener('change', handlePatternChange);
  elements.shareBtn.addEventListener('click', shareSession);
  handlePatternChange();
  
  // Use the new resize handler
  window.addEventListener('resize', handleResize);
}

window.addEventListener('load', init);