const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

// Set canvas size to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let animationId;

// Mouse/Touch input
let targetX = canvas.width / 2;
let targetY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});
canvas.addEventListener('touchmove', (e) => {
    targetX = e.touches[0].clientX;
    targetY = e.touches[0].clientY;
});

// General Snake Configuration
const snakeSpeed = 1.5; // Reduced speed to make it easier
const segmentRadius = 15;
const segmentSpacing = 12; 

// Player State
let playerSnake = []; // Array of {x, y}
let playerHistory = [];

// Enemies State
let enemies = [];
const numEnemies = 5;
const enemyColors = [
    { center: '#ff66cc', edge: '#cc0099', outline: '#990066' }, // Pink
    { center: '#66ff66', edge: '#00cc00', outline: '#009900' }, // Green
    { center: '#66ccff', edge: '#0066cc', outline: '#004499' }, // Blue
    { center: '#ffff66', edge: '#cccc00', outline: '#999900' }, // Yellow
    { center: '#cc66ff', edge: '#9900cc', outline: '#660099' }  // Purple
];

// Food Configuration
let foods = [];
const foodColors = ['#ff0055', '#00ffcc', '#ffff00', '#ff00ff', '#00ff00'];
const numFoods = 50;

function initGame() {
    score = 0;
    scoreElement.innerText = score;
    
    const startX = canvas.width / 2;
    const startY = canvas.height / 2;
    
    // Init Player
    playerSnake = [];
    playerHistory = [];
    for (let i = 0; i < 5; i++) {
        playerSnake.push({ x: startX, y: startY });
    }
    for(let i=0; i<200; i++) {
        playerHistory.push({x: startX, y: startY});
    }
    targetX = startX;
    targetY = startY - 100;

    // Init Enemies
    enemies = [];
    for (let i = 0; i < numEnemies; i++) {
        spawnEnemy();
    }

    // Init Food
    spawnInitialFoods();
    
    gameState = 'PLAYING';
    startScreen.style.opacity = '0';
    setTimeout(() => startScreen.style.display = 'none', 300);
    
    if(animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function spawnEnemy() {
    // Spawn somewhere random on the edge to avoid immediate collision
    const spawnMargin = 100;
    let ex = Math.random() < 0.5 ? spawnMargin : canvas.width - spawnMargin;
    let ey = Math.random() * canvas.height;

    let enemySnake = [];
    let enemyHistory = [];
    for (let j = 0; j < 5; j++) {
        enemySnake.push({ x: ex, y: ey });
    }
    for(let j=0; j<200; j++) {
        enemyHistory.push({x: ex, y: ey});
    }

    const colorScheme = enemyColors[Math.floor(Math.random() * enemyColors.length)];

    enemies.push({
        snake: enemySnake,
        history: enemyHistory,
        colors: colorScheme,
        targetX: ex,
        targetY: ey,
        speed: snakeSpeed * (0.8 + Math.random() * 0.4) // Slightly random speeds
    });
}

function spawnInitialFoods() {
    foods = [];
    for (let i = 0; i < numFoods; i++) {
        spawnFood();
    }
}

function spawnFood() {
    foods.push({
        x: segmentRadius + Math.random() * (canvas.width - segmentRadius * 2),
        y: segmentRadius + Math.random() * (canvas.height - segmentRadius * 2),
        color: foodColors[Math.floor(Math.random() * foodColors.length)],
        radius: 6 + Math.random() * 4
    });
}

// Helper to check if two circles overlap
function checkCollision(p1, p2, combinedRadius) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y) < combinedRadius;
}

function update() {
    if (gameState !== 'PLAYING') return;

    // ==========================================
    // 1. Update Player
    // ==========================================
    const pHead = playerSnake[0];
    const dx = targetX - pHead.x;
    const dy = targetY - pHead.y;
    const pAngle = Math.atan2(dy, dx);
    
    if(Math.hypot(dx, dy) > snakeSpeed) {
        pHead.x += Math.cos(pAngle) * snakeSpeed;
        pHead.y += Math.sin(pAngle) * snakeSpeed;
    }

    // Player Screen Wrap
    if (pHead.x < -segmentRadius) pHead.x = canvas.width + segmentRadius;
    else if (pHead.x > canvas.width + segmentRadius) pHead.x = -segmentRadius;
    
    if (pHead.y < -segmentRadius) pHead.y = canvas.height + segmentRadius;
    else if (pHead.y > canvas.height + segmentRadius) pHead.y = -segmentRadius;

    // Player Self Collision
    for (let i = 10; i < playerSnake.length; i++) {
        if (checkCollision(pHead, playerSnake[i], segmentRadius)) {
            gameOver();
            return;
        }
    }

    // Update Player Body
    playerHistory.unshift({ x: pHead.x, y: pHead.y });
    if (playerHistory.length > playerSnake.length * segmentSpacing + 10) playerHistory.pop();
    for (let i = 1; i < playerSnake.length; i++) {
        const idx = i * segmentSpacing;
        if (playerHistory[idx]) {
            playerSnake[i].x = playerHistory[idx].x;
            playerSnake[i].y = playerHistory[idx].y;
        }
    }

    // ==========================================
    // 2. Update Enemies
    // ==========================================
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        let eHead = enemy.snake[0];

        // Basic AI: Find closest food every frame
        let closestFood = null;
        let minDist = Infinity;
        for (let f of foods) {
            let dist = Math.hypot(eHead.x - f.x, eHead.y - f.y);
            if (dist < minDist) {
                minDist = dist;
                closestFood = f;
            }
        }
        if (closestFood) {
            enemy.targetX = closestFood.x;
            enemy.targetY = closestFood.y;
        }

        // Move Enemy Head
        const edx = enemy.targetX - eHead.x;
        const edy = enemy.targetY - eHead.y;
        const eAngle = Math.atan2(edy, edx);
        eHead.x += Math.cos(eAngle) * enemy.speed;
        eHead.y += Math.sin(eAngle) * enemy.speed;

        // Enemy Screen Wrap
        if (eHead.x < -segmentRadius) eHead.x = canvas.width + segmentRadius;
        else if (eHead.x > canvas.width + segmentRadius) eHead.x = -segmentRadius;
        
        if (eHead.y < -segmentRadius) eHead.y = canvas.height + segmentRadius;
        else if (eHead.y > canvas.height + segmentRadius) eHead.y = -segmentRadius;

        // Enemy vs Player Collision (Enemy Dies)
        let hitPlayer = false;
        for (let seg of playerSnake) {
            if (checkCollision(eHead, seg, segmentRadius)) {
                hitPlayer = true; break;
            }
        }
        if (hitPlayer) {
            enemies.splice(i, 1);
            spawnEnemy();
            continue;
        }

        // Update Enemy Body
        enemy.history.unshift({ x: eHead.x, y: eHead.y });
        if (enemy.history.length > enemy.snake.length * segmentSpacing + 10) enemy.history.pop();
        for (let j = 1; j < enemy.snake.length; j++) {
            const idx = j * segmentSpacing;
            if (enemy.history[idx]) {
                enemy.snake[j].x = enemy.history[idx].x;
                enemy.snake[j].y = enemy.history[idx].y;
            }
        }
    }

    // ==========================================
    // 3. Player vs Enemy Collision (Player Dies)
    // ==========================================
    for (let enemy of enemies) {
        for (let eSeg of enemy.snake) {
            if (checkCollision(pHead, eSeg, segmentRadius * 1.5)) {
                gameOver();
                return;
            }
        }
    }

    // ==========================================
    // 4. Food Collisions (Player and Enemies)
    // ==========================================
    for (let i = foods.length - 1; i >= 0; i--) {
        let food = foods[i];
        let eaten = false;

        // Check if player ate it
        if (checkCollision(pHead, food, segmentRadius + food.radius)) {
            score += 10;
            scoreElement.innerText = score;
            const last = playerSnake[playerSnake.length - 1];
            playerSnake.push({ x: last.x, y: last.y });
            eaten = true;
        }

        // Check if enemies ate it
        if (!eaten) {
            for (let enemy of enemies) {
                if (checkCollision(enemy.snake[0], food, segmentRadius + food.radius)) {
                    const last = enemy.snake[enemy.snake.length - 1];
                    enemy.snake.push({ x: last.x, y: last.y });
                    eaten = true;
                    break;
                }
            }
        }

        if (eaten) {
            foods.splice(i, 1);
            spawnFood();
        }
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('screen-title').innerText = 'GAME OVER';
    document.getElementById('screen-title').style.color = 'red';
    document.getElementById('screen-subtitle').innerText = 'Final Score: ' + score;
    startBtn.innerText = 'PLAY AGAIN';
    startScreen.style.display = 'block';
    setTimeout(() => {
        startScreen.style.opacity = '1';
    }, 50);
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Foods
    foods.forEach(food => {
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        ctx.fillStyle = food.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Helper function to draw a snake
    const drawSnake = (snakeArray, colors, target_x, target_y) => {
        for (let i = snakeArray.length - 1; i >= 0; i--) {
            const segment = snakeArray[i];
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, segmentRadius, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                segment.x - 5, segment.y - 5, 2, 
                segment.x, segment.y, segmentRadius
            );
            gradient.addColorStop(0, colors.center); 
            gradient.addColorStop(1, colors.edge); 
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw eyes on the head
            if (i === 0) {
                drawEyes(segment.x, segment.y, target_x, target_y);
            }
        }
    };

    // Draw Enemies
    for (let enemy of enemies) {
        drawSnake(enemy.snake, enemy.colors, enemy.targetX, enemy.targetY);
    }

    // Draw Player (Orange Colors)
    const playerColors = { center: '#ffcc00', edge: '#ff6600', outline: '#cc4400' };
    drawSnake(playerSnake, playerColors, targetX, targetY);
}

function drawEyes(x, y, tx, ty) {
    const dx = tx - x;
    const dy = ty - y;
    const angle = Math.atan2(dy, dx);

    const eyeOffset = 8;
    const eyeRadius = 4;
    const pupilRadius = 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Left Eye
    ctx.beginPath();
    ctx.arc(eyeOffset, -6, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeOffset + 1, -6, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();

    // Right Eye
    ctx.beginPath();
    ctx.arc(eyeOffset, 6, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeOffset + 1, 6, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', initGame);
draw();
