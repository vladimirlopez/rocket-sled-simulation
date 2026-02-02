/**
 * Rocket Sled Visualization
 * p5.js sketch for rendering the sled, track, and force diagram
 */

// Canvas and display settings
let canvasWidth, canvasHeight;
const TRACK_Y_RATIO = 0.6; // Track vertical position as ratio of canvas height
const SLED_WIDTH = 80;
const SLED_HEIGHT = 50;
const WHEEL_RADIUS = 12;

// Display options - default OFF for cleaner initial view
let showForceArrows = false;
let showGrid = false;

// Jet animation
let jetFlameOffset = 0;

// Snow system configuration (now just static ground snow)
// No longer need falling snow particles

// Parallax background scrolling
let bgOffset = 0; // Tracks cumulative background position

// Color palette (matches CSS variables)
const COLORS = {
    primary: '#00BCD4',
    bgDark: '#0d1117',
    bgLight: '#1a1f26',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    forceApplied: '#FF9800',
    forceNormal: '#4CAF50',
    forceGravity: '#9C27B0',
    forceFriction: '#F44336',
    forceAir: '#2196F3',
    track: '#3a4149',
    sled: '#455A64',
    sledAccent: '#78909C',
    wheel: '#263238',
    jet: '#FF5722',
    jetGlow: '#FFAB91'
};

// p5.js setup function
function setup() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvasContainer');

    // Smooth animations
    frameRate(60);
}

// p5.js window resize handler
function windowResized() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    resizeCanvas(canvasWidth, canvasHeight);
}

// p5.js main draw loop
function draw() {
    // Clear background
    background(COLORS.bgDark);

    // Get current physics state
    const state = getPhysicsState();

    // Update background offset based on velocity (parallax scrolling)
    bgOffset += state.velocity * 2; // Scale for visual effect

    // Draw parallax background layers
    drawParallaxBackground(state.velocity);

    // Draw grid if enabled (on top of background)
    if (showGrid) {
        drawGrid();
    }

    // Draw track
    drawTrack();

    // Sled stays fixed at center of screen - background moves instead
    const sledScreenX = canvasWidth / 2;
    const sledScreenY = canvasHeight * TRACK_Y_RATIO - SLED_HEIGHT / 2 - WHEEL_RADIUS;

    // Draw sled
    drawSled(sledScreenX, sledScreenY, state);

    // Draw force diagram if enabled
    if (showForceArrows) {
        drawForceDiagram(sledScreenX, sledScreenY, state);
    }

    // Draw snow (on top of everything for depth)
    drawSnow(state.velocity);

    // Draw velocity indicator
    drawVelocityArrow(sledScreenX, sledScreenY - SLED_HEIGHT - 30, state.velocity);

    // Update jet animation
    jetFlameOffset = (jetFlameOffset + 0.3) % (Math.PI * 2);
}

/**
 * Draw parallax scrolling background to simulate motion
 * Three layers scroll at different speeds for depth effect
 * Includes prominent objects (trees, poles, signs) to show motion clearly
 */
function drawParallaxBackground(velocity) {
    const trackY = canvasHeight * TRACK_Y_RATIO;
    const skyHeight = trackY;

    // Sky gradient
    for (let y = 0; y < skyHeight; y++) {
        const inter = map(y, 0, skyHeight, 0, 1);
        const c = lerpColor(color('#1a1a2e'), color('#16213e'), inter);
        stroke(c);
        line(0, y, canvasWidth, y);
    }

    // Layer 1: Distant mountains (slowest parallax - 0.1x)
    const mountainOffset = bgOffset * 0.1;
    fill('#2d3a4a');
    noStroke();

    for (let i = -1; i <= Math.ceil(canvasWidth / 200) + 1; i++) {
        const baseX = (i * 200 - (mountainOffset % 200));
        beginShape();
        vertex(baseX - 50, skyHeight);
        vertex(baseX + 30, skyHeight - 80);
        vertex(baseX + 60, skyHeight - 120);
        vertex(baseX + 100, skyHeight - 90);
        vertex(baseX + 150, skyHeight - 140);
        vertex(baseX + 200, skyHeight - 70);
        vertex(baseX + 250, skyHeight);
        endShape(CLOSE);
    }

    // Layer 2: Trees in background (medium parallax - 0.4x) - LARGER and BRIGHTER
    const treeOffset = bgOffset * 0.4;
    const treeSpacing = 150;
    const centerX = canvasWidth / 2;
    const clearZone = 180; // Clear zone around sled for force arrows visibility

    for (let i = -1; i <= Math.ceil(canvasWidth / treeSpacing) + 2; i++) {
        const treeX = (i * treeSpacing - (treeOffset % treeSpacing));

        // Skip trees near the center (clear zone for force arrows)
        if (Math.abs(treeX - centerX) < clearZone) continue;

        const treeHeight = 80 + (i % 3) * 20; // Taller trees

        // Tree trunk - brown
        fill('#8B4513');
        noStroke();
        rect(treeX - 6, skyHeight - treeHeight, 12, treeHeight);

        // Tree foliage - bright green triangles
        fill('#228B22');
        triangle(
            treeX, skyHeight - treeHeight - 50,
            treeX - 35, skyHeight - treeHeight + 15,
            treeX + 35, skyHeight - treeHeight + 15
        );
        fill('#2E8B2E');
        triangle(
            treeX, skyHeight - treeHeight - 30,
            treeX - 28, skyHeight - treeHeight + 25,
            treeX + 28, skyHeight - treeHeight + 25
        );
    }

    // Layer 3: Utility poles (faster parallax - 0.7x) - TALLER and more visible
    const poleOffset = bgOffset * 0.7;
    const poleSpacing = 250;

    for (let i = -1; i <= Math.ceil(canvasWidth / poleSpacing) + 2; i++) {
        const poleX = (i * poleSpacing - (poleOffset % poleSpacing));

        // Skip poles near the center (clear zone for force arrows)
        if (Math.abs(poleX - centerX) < clearZone) continue;

        // Pole - gray with outline
        fill('#808080');
        stroke('#606060');
        strokeWeight(2);
        rect(poleX - 4, skyHeight - 120, 8, 120);

        // Crossbar - bright
        fill('#A0A0A0');
        rect(poleX - 25, skyHeight - 115, 50, 6);

        // Yellow warning markers on pole
        fill('#FFD700');
        noStroke();
        rect(poleX - 5, skyHeight - 30, 10, 20);

        noStroke();
    }

    // Ground area below track
    fill('#2a2a35');
    noStroke();
    rect(0, trackY + 8, canvasWidth, canvasHeight - trackY - 8);

    // Layer 4: Distance markers/signs (1x parallax) - LARGER and BRIGHTER
    const signOffset = bgOffset * 1.0;
    const signSpacing = 250;

    for (let i = -1; i <= Math.ceil(canvasWidth / signSpacing) + 2; i++) {
        const signX = (i * signSpacing - (signOffset % signSpacing));
        const distanceValue = Math.floor(Math.abs(bgOffset / 50) + i * 6);

        // Sign post - silver
        fill('#A0A0A0');
        stroke('#808080');
        strokeWeight(1);
        rect(signX - 3, trackY - 70, 6, 70);

        // Sign board - bright blue with yellow border
        fill('#0066CC');
        stroke('#FFD700');
        strokeWeight(3);
        rect(signX - 30, trackY - 95, 60, 30, 5);

        // Distance text - white and bold
        noStroke();
        fill('#FFFFFF');
        textSize(14);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(`${distanceValue}m`, signX, trackY - 80);
        textStyle(NORMAL);
    }

    // Layer 5: Ground stripes (fastest - 1.5x for speed emphasis)
    const stripeOffset = bgOffset * 1.5;
    const stripeSpacing = 50;

    fill('#5a5a65');
    noStroke();
    for (let i = -1; i <= Math.ceil(canvasWidth / stripeSpacing) + 3; i++) {
        const stripeX = (i * stripeSpacing - (stripeOffset % stripeSpacing));
        rect(stripeX, trackY + 12, 25, 5, 2);
    }

    // Ground dashes (very fast - 2x) - brighter
    const dashOffset = bgOffset * 2.0;
    fill('#7a7a85');
    for (let i = -1; i <= Math.ceil(canvasWidth / 20) + 3; i++) {
        const dashX = (i * 20 - (dashOffset % 20));
        rect(dashX, trackY + 22, 8, 3);
    }
}

/**
 * Draw background grid
 */
function drawGrid() {
    stroke(COLORS.track);
    strokeWeight(1);

    // Vertical lines
    for (let x = 0; x < canvasWidth; x += 50) {
        line(x, 0, x, canvasHeight);
    }

    // Horizontal lines
    for (let y = 0; y < canvasHeight; y += 50) {
        line(0, y, canvasWidth, y);
    }
}

/**
 * Draw the horizontal track
 */
function drawTrack() {
    const trackY = canvasHeight * TRACK_Y_RATIO;

    // Main track surface
    noStroke();
    fill(COLORS.track);
    rect(50, trackY, canvasWidth - 100, 8, 4);

    // Distance markers
    fill(COLORS.textSecondary);
    textSize(10);
    textAlign(CENTER);

    for (let i = 0; i <= 10; i++) {
        const x = 50 + (canvasWidth - 100) * (i / 10);

        // Marker line
        stroke(COLORS.text);
        strokeWeight(1);
        line(x, trackY + 8, x, trackY + 16);

        // Label
        noStroke();
        text(`${(i - 5) * 10}m`, x, trackY + 28);
    }
}

/**
 * Draw the rocket sled
 */
function drawSled(x, y, state) {
    push();
    translate(x, y);

    // Wheels
    fill(COLORS.wheel);
    noStroke();
    ellipse(-SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);
    ellipse(SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);

    // Wheel highlights
    fill(COLORS.sledAccent);
    ellipse(-SLED_WIDTH / 3 - 2, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2 - 2, WHEEL_RADIUS);
    ellipse(SLED_WIDTH / 3 - 2, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2 - 2, WHEEL_RADIUS);

    // Main body
    fill(COLORS.sled);
    rect(-SLED_WIDTH / 2, 0, SLED_WIDTH, SLED_HEIGHT, 8);

    // Body highlight
    fill(COLORS.sledAccent);
    rect(-SLED_WIDTH / 2 + 5, 5, SLED_WIDTH - 10, 15, 4);

    // Cockpit
    fill(COLORS.primary);
    ellipse(0, SLED_HEIGHT / 3, 30, 20);
    fill(COLORS.bgDark);
    ellipse(0, SLED_HEIGHT / 3, 22, 14);

    // Rocket jets on sides
    // Logic corrected for Newton's 3rd Law:
    // To go LEFT (Force < 0), we need exhaust to go RIGHT. So Right rocket fires.
    // To go RIGHT (Force > 0), we need exhaust to go LEFT. So Left rocket fires.

    // Left Rocket (Points Left): Fires when thrust is Positive (Right)
    drawRocket(-SLED_WIDTH / 2 - 10, SLED_HEIGHT / 2, -1, state.thrustDirection === 1);

    // Right Rocket (Points Right): Fires when thrust is Negative (Left)
    drawRocket(SLED_WIDTH / 2 + 10, SLED_HEIGHT / 2, 1, state.thrustDirection === -1);

    // Draw Character (Penguin!)
    drawPenguin(0, -5, state.thrustDirection);

    pop();
}

/**
 * Draw a penguin character on the sled
 */
function drawPenguin(x, y, facing) {
    push();
    translate(x, y);

    // Scale down
    scale(0.8);

    // Body
    fill(255);
    stroke(0);
    strokeWeight(2);
    ellipse(0, 0, 40, 50); // White belly

    // Head/Back (black parts)
    fill(30);
    noStroke();
    arc(0, 0, 42, 52, PI + QUARTER_PI, TWO_PI - QUARTER_PI, CHORD);
    ellipse(0, -20, 35, 30); // Head

    // Eyes
    fill(255);
    ellipse(-8, -22, 10, 10);
    ellipse(8, -22, 10, 10);
    fill(0);

    // Eye direction based on thrust
    let pupilOffset = 0;
    if (facing === 1) pupilOffset = 2;
    if (facing === -1) pupilOffset = -2;

    ellipse(-8 + pupilOffset, -22, 3, 3);
    ellipse(8 + pupilOffset, -22, 3, 3);

    // Beak
    fill('#FF9800');
    triangle(-4, -15, 4, -15, 0, -10);

    // Scarf (blowing in wind)
    fill('#E91E63'); // Pink scarf
    rect(-15, -10, 30, 8, 2);

    // Scarf tail blowing opposite to motion
    if (Math.abs(getPhysicsState().velocity) > 1) {
        const windDir = -Math.sign(getPhysicsState().velocity);
        const windSpeed = Math.min(Math.abs(getPhysicsState().velocity) / 2, 20);

        beginShape();
        vertex(10 * windDir, -8);
        bezierVertex(
            20 * windDir, -15 - windSpeed / 2,
            30 * windDir + (sin(frameCount * 0.2) * 5), -5,
            35 * windDir + windSpeed, -10 + (cos(frameCount * 0.2) * 5)
        );
        vertex(35 * windDir + windSpeed, -2);
        vertex(10 * windDir, -2);
        endShape(CLOSE);
    }

    pop();
}



// Note: initSnow() function removed - static snow is drawn directly without initialization

/**
 * Draw snow on the ground only (no falling animation)
 */
function drawSnow(velocity) {
    // Draw snow on the ground only
    const trackY = canvasHeight * TRACK_Y_RATIO;
    const groundY = trackY + 8;
    
    noStroke();
    fill(255, 255, 255, 200);
    
    // Static snow layer on the ground
    // Using pseudo-random offsets based on x position for natural distribution
    for (let x = 0; x < canvasWidth; x += 15) {
        const offset = (x * 123) % 10 - 5; // Pseudo-random horizontal offset (-5 to 5)
        const size = 3 + ((x * 79) % 3);   // Pseudo-random size variation (3 to 6)
        ellipse(x + offset, groundY + 5, size, size);
    }
    
    // Add some snow patches for texture
    fill(255, 255, 255, 150);
    for (let x = 0; x < canvasWidth; x += 25) {
        const offset = (x * 97) % 12 - 6;  // Pseudo-random horizontal offset (-6 to 6)
        const size = 4 + ((x * 53) % 4);   // Pseudo-random size variation (4 to 8)
        ellipse(x + offset, groundY + 10, size, size);
    }
}

/**
 * Draw a rocket engine with optional flame
 */
function drawRocket(x, y, direction, active) {
    push();
    translate(x, y);

    // Rocket body
    fill(COLORS.sledAccent);
    noStroke();
    rect(-8 * direction, -10, 16 * direction, 20, 3);

    // Nozzle
    fill(COLORS.wheel);
    if (direction > 0) {
        triangle(8, -8, 8, 8, 16, 0);
    } else {
        triangle(-8, -8, -8, 8, -16, 0);
    }

    // Flame when active
    if (active) {
        const flameSize = 20 + sin(jetFlameOffset * 10) * 5;

        // Outer glow
        fill(COLORS.jetGlow + '60');
        noStroke();
        if (direction > 0) {
            ellipse(20 + flameSize / 2, 0, flameSize * 1.5, 18);
        } else {
            ellipse(-20 - flameSize / 2, 0, flameSize * 1.5, 18);
        }

        // Inner flame
        fill(COLORS.jet);
        if (direction > 0) {
            triangle(16, -6, 16, 6, 16 + flameSize, 0);
        } else {
            triangle(-16, -6, -16, 6, -16 - flameSize, 0);
        }

        // Hot core
        fill('#FFEB3B');
        if (direction > 0) {
            triangle(16, -3, 16, 3, 16 + flameSize * 0.6, 0);
        } else {
            triangle(-16, -3, -16, 3, -16 - flameSize * 0.6, 0);
        }
    }

    pop();
}

/**
 * Draw force diagram centered on the sled's center of mass
 * All forces originate from the center of mass
 * Uses notation: "F Type on Sled by Source"
 */
function drawForceDiagram(x, y, state) {
    // Center of mass position (center of the sled body)
    const comX = x;
    const comY = y + SLED_HEIGHT / 2;

    // INCREASED scale for larger arrows
    const scale = 0.08; // Pixels per Newton - MUCH LARGER
    const minArrowLength = 60; // Minimum visible arrow length

    // Applied Force (horizontal) - from rockets
    if (state.appliedForce !== 0) {
        const length = Math.max(Math.abs(state.appliedForce) * scale, minArrowLength);
        drawForceArrow(
            comX, comY,
            state.appliedForce > 0 ? length : -length, 0,
            COLORS.forceApplied,
            'F push on Sled by Rockets'
        );
    }

    // Friction Force (horizontal, opposes motion) - from ground
    if (Math.abs(state.frictionForce) > 0.1) {
        const length = Math.max(Math.abs(state.frictionForce) * scale, minArrowLength);
        drawForceArrow(
            comX, comY,
            state.frictionForce > 0 ? length : -length, 0,
            COLORS.forceFriction,
            'F friction on Sled by Ground'
        );
    }

    // Air Drag Force (horizontal, opposes motion) - from air
    if (Math.abs(state.airDragForce) > 0.1) {
        const length = Math.max(Math.abs(state.airDragForce) * scale, minArrowLength);
        drawForceArrow(
            comX, comY,
            state.airDragForce > 0 ? length : -length, 0,
            COLORS.forceAir,
            'F drag on Sled by Air'
        );
    }

    // Normal Force (upward) - from ground
    const normalLength = Math.max(state.normalForce * scale * 0.5, minArrowLength);
    drawForceArrow(
        comX, comY,
        0, -normalLength,
        COLORS.forceNormal,
        'F normal on Sled by Ground'
    );

    // Gravity/Weight (downward) - from Earth
    const gravityLength = Math.max(state.gravityForce * scale * 0.5, minArrowLength);
    drawForceArrow(
        comX, comY,
        0, gravityLength,
        COLORS.forceGravity,
        'F gravity on Sled by Earth'
    );
}

/**
 * Draw a force arrow with label
 */
function drawForceArrow(x, y, dx, dy, color, label) {
    push();

    // Draw black outline for visibility
    stroke(0);
    strokeWeight(10);
    line(x, y, x + dx, y + dy);

    // Arrow line - medium thickness
    stroke(color);
    strokeWeight(6);
    fill(color);
    line(x, y, x + dx, y + dy);

    // LARGE arrowhead
    const angle = atan2(dy, dx);
    const arrowSize = 25;

    push();
    translate(x + dx, y + dy);
    rotate(angle);
    noStroke();
    fill(color);
    triangle(0, 0, -arrowSize, -arrowSize / 2, -arrowSize, arrowSize / 2);
    pop();

    // Label with LARGE text
    noStroke();
    textSize(16);
    textAlign(CENTER);
    textStyle(BOLD);

    // Position label at arrow tip
    let labelX = x + dx;
    let labelY = y + dy;

    if (dx !== 0) {
        labelX += (dx > 0 ? 50 : -50);
    }
    if (dy !== 0) {
        labelY += (dy > 0 ? 30 : -15);
    }

    // Draw text with black outline for visibility
    fill(0);
    for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
            text(label, labelX + ox, labelY + oy);
        }
    }
    fill(color);
    text(label, labelX, labelY);

    pop();
}

/**
 * Draw velocity indicator arrow
 */
function drawVelocityArrow(x, y, velocity) {
    if (Math.abs(velocity) < 0.1) return;

    push();

    const maxLength = 80;
    const length = (velocity / 50) * maxLength; // Scale to max velocity

    stroke(COLORS.primary);
    strokeWeight(2);
    fill(COLORS.primary);

    // Arrow line
    line(x, y, x + length, y);

    // Arrowhead
    const arrowSize = 8;
    if (velocity > 0) {
        triangle(x + length, y, x + length - arrowSize, y - arrowSize / 2, x + length - arrowSize, y + arrowSize / 2);
    } else {
        triangle(x + length, y, x + length + arrowSize, y - arrowSize / 2, x + length + arrowSize, y + arrowSize / 2);
    }

    // Label
    noStroke();
    textSize(11);
    textAlign(CENTER);
    text(`v = ${velocity.toFixed(1)} m/s`, x, y - 12);

    pop();
}

/**
 * Toggle force arrows visibility
 */
function toggleForceArrows(show) {
    showForceArrows = show;
}

/**
 * Toggle grid visibility
 */
function toggleGrid(show) {
    showGrid = show;
}
