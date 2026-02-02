/**
 * Rocket Sled Main Application Controller
 * Handles UI events and connects physics engine with visualization
 */

// UI Elements
let directionSlider, forceValueDisplay;
let maxForceSlider, maxForceValueDisplay;
let frictionToggle, airDragToggle;
let resetBtn;
let forceArrowsBtn, gridBtn;

// Force value displays
let appliedForceValueEl, frictionForceValueEl, airDragForceValueEl, netForceValueEl;

// Velocimeter elements
let velocimeterNeedle, velocityDisplay;

// Animation state
let isRunning = true;
let lastTime = 0;

// Current max force setting
let maxForce = 2000;

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
    checkEmbedMode();
    setupModals();

    // Start the physics loop
    lastTime = performance.now();
    requestAnimationFrame(physicsLoop);

    console.log('🚀 Rocket Sled Simulation initialized');
});

/**
 * Initialize UI element references
 */
function initializeUI() {
    // Direction slider (combines direction and intensity)
    directionSlider = document.getElementById('directionSlider');
    forceValueDisplay = document.getElementById('forceValue');

    // Max force slider
    maxForceSlider = document.getElementById('maxForceSlider');
    maxForceValueDisplay = document.getElementById('maxForceValue');

    // Toggles
    frictionToggle = document.getElementById('frictionToggle');
    airDragToggle = document.getElementById('airDragToggle');

    // Control buttons
    resetBtn = document.getElementById('resetBtn');

    // Force value displays
    appliedForceValueEl = document.getElementById('appliedForceValue');
    frictionForceValueEl = document.getElementById('frictionForceValue');
    airDragForceValueEl = document.getElementById('airDragForceValue');
    netForceValueEl = document.getElementById('netForceValue');

    // Velocimeter
    velocimeterNeedle = document.getElementById('velocimeterNeedle');
    velocityDisplay = document.getElementById('velocityDisplay');

    // Visualization buttons
    forceArrowsBtn = document.getElementById('forceArrowsBtn');
    gridBtn = document.getElementById('gridBtn');

    // Legend indicators
    updateLegend();
}

/**
 * Set up event listeners for all controls
 */
function setupEventListeners() {
    // Direction slider (controls both direction and intensity)
    directionSlider?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        updateForceFromSlider(value);
    });

    // Max force slider
    maxForceSlider?.addEventListener('input', (e) => {
        maxForce = parseInt(e.target.value, 10);
        if (maxForceValueDisplay) {
            maxForceValueDisplay.textContent = `${maxForce} N`;
        }
        // Update applied force with new max
        if (directionSlider) {
            updateForceFromSlider(parseInt(directionSlider.value, 10));
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Toggles - with debug logging
    frictionToggle?.addEventListener('change', (e) => {
        console.log('Friction toggle changed:', e.target.checked);
        setFrictionEnabled(e.target.checked);
        updateLegend();
    });

    airDragToggle?.addEventListener('change', (e) => {
        console.log('Air drag toggle changed:', e.target.checked);
        setAirDragEnabled(e.target.checked);
        updateLegend();
    });

    // Reset button with debug
    resetBtn?.addEventListener('click', () => {
        console.log('Reset button clicked');
        handleReset();
    });

    // Visualization toggles
    forceArrowsBtn?.addEventListener('click', () => {
        forceArrowsBtn.classList.toggle('active');
        toggleForceArrows(forceArrowsBtn.classList.contains('active'));
    });

    gridBtn?.addEventListener('click', () => {
        gridBtn.classList.toggle('active');
        toggleGrid(gridBtn.classList.contains('active'));
    });

    // Worksheet scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = btn.dataset.scenario;
            console.log('Loading scenario:', scenario);
            loadScenario(scenario);

            // Update active state
            document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Update force from direction slider value (-100 to 100)
 */
function updateForceFromSlider(sliderValue) {
    // Calculate actual force: percentage of max force * direction
    const percentage = sliderValue / 100;
    const actualForce = Math.round(percentage * maxForce);

    // Update physics engine
    if (sliderValue > 0) {
        setThrustDirection(1);
        setAppliedForceMagnitude(Math.abs(actualForce));
    } else if (sliderValue < 0) {
        setThrustDirection(-1);
        setAppliedForceMagnitude(Math.abs(actualForce));
    } else {
        setThrustDirection(0);
        setAppliedForceMagnitude(0);
    }

    // Update display
    if (forceValueDisplay) {
        forceValueDisplay.textContent = `${actualForce} N`;
    }
}

/**
 * Handle keyboard controls
 */
function handleKeyDown(e) {
    if (!directionSlider) return;

    const step = 10;
    let currentValue = parseInt(directionSlider.value, 10);

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            currentValue = Math.max(-100, currentValue - step);
            directionSlider.value = currentValue;
            updateForceFromSlider(currentValue);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            currentValue = Math.min(100, currentValue + step);
            directionSlider.value = currentValue;
            updateForceFromSlider(currentValue);
            break;
        case ' ':
            directionSlider.value = 0;
            updateForceFromSlider(0);
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            handleReset();
            break;
    }
}

function handleKeyUp(e) {
    // No action needed for key up
}

/**
 * Handle reset button click
 */
function handleReset() {
    console.log('Resetting simulation...');
    resetPhysics();
    if (directionSlider) {
        directionSlider.value = 0;
    }
    updateForceFromSlider(0);

    // Reset toggles to unchecked state
    if (frictionToggle) {
        frictionToggle.checked = false;
        setFrictionEnabled(false);
    }
    if (airDragToggle) {
        airDragToggle.checked = false;
        setAirDragEnabled(false);
    }

    // Clear scenario selection
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));

    updateLegend();
    updateDisplays();
    console.log('Reset complete');
}

/**
 * Load a preset worksheet scenario
 */
function loadScenario(scenario) {
    // First reset everything
    resetPhysics();
    if (directionSlider) directionSlider.value = 0;
    updateForceFromSlider(0); // Ensure force is reset

    // Configure based on scenario
    switch (scenario) {
        case 'no-forces':
            // Pure Newton's 1st Law - no resistance
            setFrictionEnabled(false);
            setAirDragEnabled(false);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = false;
            break;

        case 'friction-only':
            // Study friction without air drag
            setFrictionEnabled(true);
            setAirDragEnabled(false);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = false;
            break;

        case 'air-only':
            // Study air drag (velocity dependent)
            setFrictionEnabled(false);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = true;
            break;

        case 'all-forces':
            // Realistic scenario with all forces
            setFrictionEnabled(true);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = true;
            break;

        case 'terminal-velocity':
            // Start with air drag to observe terminal velocity
            setFrictionEnabled(false);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = true;
            // Apply thrust to demonstrate terminal velocity
            if (directionSlider) {
                directionSlider.value = 80;
                updateForceFromSlider(80);
            }
            break;

        case 'equilibrium':
            // Set up for balanced forces discussion
            setFrictionEnabled(true);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = true;
            // Medium thrust
            if (directionSlider) {
                directionSlider.value = 50;
                updateForceFromSlider(50);
            }
            break;
    }

    updateLegend();
    updateDisplays();
    console.log('Scenario loaded:', scenario, 'Friction:', physicsState.frictionEnabled, 'Air Drag:', physicsState.airDragEnabled);
}

/**
 * Physics update loop (separate from p5.js draw loop)
 */
function physicsLoop(currentTime) {
    if (!isRunning) {
        requestAnimationFrame(physicsLoop);
        return;
    }

    // Calculate delta time in seconds
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // Cap at 50ms
    lastTime = currentTime;

    // Update physics
    updatePhysics(dt);

    // Update UI displays
    updateDisplays();

    // Continue loop
    requestAnimationFrame(physicsLoop);
}

/**
 * Update all display elements
 */
function updateDisplays() {
    const state = getPhysicsState();

    // Update force values
    if (appliedForceValueEl) {
        appliedForceValueEl.textContent = `${state.appliedForce.toFixed(0)} N`;
    }
    if (frictionForceValueEl) {
        frictionForceValueEl.textContent = `${state.frictionForce.toFixed(0)} N`;
    }
    if (airDragForceValueEl) {
        airDragForceValueEl.textContent = `${state.airDragForce.toFixed(0)} N`;
    }
    if (netForceValueEl) {
        netForceValueEl.textContent = `${state.netForce.toFixed(0)} N`;
    }

    // Update velocimeter
    const velocity = state.velocity;
    const maxVelocity = 50;

    if (velocityDisplay) {
        velocityDisplay.innerHTML = `${velocity.toFixed(1)} <span class="unit">m/s</span>`;
    }

    if (velocimeterNeedle) {
        // Needle rotation: -90deg (left max) to +90deg (right max)
        const rotation = (velocity / maxVelocity) * 90;
        const clampedRotation = Math.max(-90, Math.min(90, rotation));
        velocimeterNeedle.style.transform = `translateX(-50%) rotate(${clampedRotation}deg)`;
    }
}

/**
 * Update the force legend based on active forces
 */
function updateLegend() {
    const frictionItem = document.getElementById('legendFriction');
    const airItem = document.getElementById('legendAir');

    if (frictionItem) {
        if (frictionToggle?.checked) {
            frictionItem.classList.remove('inactive');
        } else {
            frictionItem.classList.add('inactive');
        }
    }

    if (airItem) {
        if (airDragToggle?.checked) {
            airItem.classList.remove('inactive');
        } else {
            airItem.classList.add('inactive');
        }
    }
}

/**
 * Check for embed mode (LMS integration)
 */
function checkEmbedMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('embed') === '1') {
        document.body.classList.add('embed');
    }
}

/**
 * Pause/resume simulation
 */
function toggleSimulation() {
    isRunning = !isRunning;
    if (isRunning) {
        lastTime = performance.now();
    }
}

/**
 * Initialize Modals and Quiz
 */
function setupModals() {
    const helpBtn = document.getElementById('helpBtn');
    const quizBtn = document.getElementById('quizBtn');
    const helpModal = document.getElementById('helpModal');
    const quizModal = document.getElementById('quizModal');
    const closeBtns = document.querySelectorAll('.close-modal');

    // Open Help
    helpBtn?.addEventListener('click', () => {
        openModal(helpModal);
    });

    // Open Quiz
    quizBtn?.addEventListener('click', () => {
        resetQuiz();
        openModal(quizModal);
    });

    // Close Modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(helpModal);
            closeModal(quizModal);
        });
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === helpModal) closeModal(helpModal);
        if (e.target === quizModal) closeModal(quizModal);
    });
}

function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    // Small delay to allow CSS transition
    setTimeout(() => modal.classList.add('show'), 10);
    // Pause simulation when modal is open
    isRunning = false;
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // Resume simulation
        isRunning = true;
        lastTime = performance.now();
    }, 300);
}

// --- Quiz Logic ---

function resetQuiz() {
    // Reset all questions to initial state
    document.querySelectorAll('.quiz-question').forEach(q => {
        q.classList.remove('active');
        q.querySelector('.feedback').innerHTML = '';
        q.querySelector('.next-btn').classList.add('hidden');
        q.querySelectorAll('.quiz-opt').forEach(opt => {
            opt.classList.remove('correct', 'incorrect');
            opt.style.pointerEvents = 'auto'; // Re-enable clicks
        });
    });
    // Show first question
    document.querySelector('.quiz-question[data-q="1"]')?.classList.add('active');
}

// Make these global so HTML onclick works
window.checkAnswer = function (btn, isCorrect) {
    const parent = btn.closest('.quiz-question');
    const feedback = parent.querySelector('.feedback');
    const nextBtn = parent.querySelector('.next-btn');

    // Disable all options in this question
    parent.querySelectorAll('.quiz-opt').forEach(opt => {
        opt.style.pointerEvents = 'none';
        if (opt === btn) {
            if (isCorrect) {
                opt.classList.add('correct');
                feedback.innerHTML = '<span style="color: #4CAF50">✅ Correct!</span>';
            } else {
                opt.classList.add('incorrect');
                feedback.innerHTML = '<span style="color: #F44336">❌ Try again! (Reset quiz to retry)</span>';
            }
        }
    });

    // Always show next button regardless of right/wrong (educational flow)
    nextBtn.classList.remove('hidden');
};

window.nextQuestion = function (currentId) {
    const current = document.querySelector(`.quiz-question[data-q="${currentId}"]`);
    const next = document.querySelector(`.quiz-question[data-q="${currentId + 1}"]`);

    if (current && next) {
        current.classList.remove('active');
        next.classList.add('active');
    }
};

window.closeQuiz = function () {
    closeModal(document.getElementById('quizModal'));
};
