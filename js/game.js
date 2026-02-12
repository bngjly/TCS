/**
 * game.js - 贪吃蛇核心游戏逻辑
 * Canvas 渲染、蛇移动、食物生成、碰撞检测、计分、速度控制
 */

class SnakeGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize; // 20
        this.reset();
        this.state = 'ready'; // ready | running | paused | over
        this.animFrameId = null;
        this.lastTime = 0;
        this.onScoreChange = null;
        this.gameStartTime = null;

        // SVG 资产初始化
        this.assets = {
            head: new Image(),
            food: new Image()
        };

        const onAssetLoad = () => {
            console.log('SnakeGame: SVG asset loaded.');
            if (this.state === 'ready') {
                this.drawReady();
            }
        };

        this.assets.head.onload = onAssetLoad;
        this.assets.food.onload = onAssetLoad;
        this.assets.head.onerror = (e) => console.error('SnakeGame: Head SVG load failed', e);
        this.assets.food.onerror = (e) => console.error('SnakeGame: Food SVG load failed', e);

        this.assets.head.src = 'data:image/svg+xml;base64,' + btoa('<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="18" height="18" rx="8" fill="#22d3ee"/><circle cx="6" cy="7" r="2.5" fill="white"/><circle cx="14" cy="7" r="2.5" fill="white"/><circle cx="6" cy="7" r="1.2" fill="black"/><circle cx="14" cy="7" r="1.2" fill="black"/><path d="M10 14v4m-2 0h4" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/></svg>');
        this.assets.food.src = 'data:image/svg+xml;base64,' + btoa('<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 18c-3 0-5-2-5-5s2-5 5-5 5 2 5 5-2 5-5 5z" fill="#ef4444"/><path d="M9 13c-2 0-3-1-3-3s1-3 3-3 3 1 3 3-1 3-3 3z" fill="#ef4444" opacity="0.8"/><path d="M10 8V5c0-1 1-2 2-2" stroke="#78350f" stroke-width="1.5" fill="none"/><path d="M11 5c2 0 3-1 3-2s-1-1-3 0-2 2-2 2z" fill="#22c55e"/><circle cx="7" cy="11" r="1.5" fill="white" opacity="0.4"/></svg>');

        console.log('SnakeGame: SVG sources assigned.');
    }

    reset() {
        const mid = Math.floor(this.tileCount / 2);
        this.snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = null;
        this.score = 0;
        this.speed = 150;
        this.spawnFood();
    }

    spawnFood() {
        const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        this.food = pos;
    }

    setDirection(dx, dy) {
        // 防止180度掉头
        if (this.direction.x === -dx && this.direction.y === -dy) return;
        if (dx === 0 && dy === 0) return;
        this.nextDirection = { x: dx, y: dy };
    }

    update() {
        this.direction = { ...this.nextDirection };
        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        // 碰撞检测：墙壁
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.endGame();
            return;
        }

        // 碰撞检测：自身
        for (const seg of this.snake) {
            if (seg.x === head.x && seg.y === head.y) {
                this.endGame();
                return;
            }
        }

        this.snake.unshift(head);

        // 吃食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            // 加速
            if (this.score % 50 === 0 && this.speed > 60) {
                this.speed = Math.max(60, this.speed - 10);
            }
            this.spawnFood();
            if (this.onScoreChange) this.onScoreChange(this.score);
        } else {
            this.snake.pop();
        }
    }

    draw() {
        const ctx = this.ctx;
        const gs = this.gridSize;

        // 清除画布
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gs, 0);
            ctx.lineTo(i * gs, this.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * gs);
            ctx.lineTo(this.canvas.width, i * gs);
            ctx.stroke();
        }

        // 绘制食物（SVG 苹果）
        if (this.food) {
            const x = this.food.x * gs;
            const y = this.food.y * gs;
            ctx.drawImage(this.assets.food, x, y, gs, gs);
        }

        // 绘制蛇
        this.snake.forEach((seg, i) => {
            const x = seg.x * gs;
            const y = seg.y * gs;
            const pad = 1;

            if (i === 0) {
                // 卡通蛇头 (SVG)
                ctx.save();
                ctx.translate(x + gs / 2, y + gs / 2);

                // 根据方向旋转蛇头
                let angle = 0;
                if (this.direction.x === 1) angle = 0;
                else if (this.direction.x === -1) angle = Math.PI;
                else if (this.direction.y === 1) angle = Math.PI / 2;
                else if (this.direction.y === -1) angle = -Math.PI / 2;

                ctx.rotate(angle);
                ctx.drawImage(this.assets.head, -gs / 2, -gs / 2, gs, gs);
                ctx.restore();
            } else {
                // 蛇身：渐变透明
                const alpha = 1 - (i / (this.snake.length + 5)) * 0.6;
                ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
                ctx.beginPath();
                ctx.roundRect(x + pad, y + pad, gs - pad * 2, gs - pad * 2, 6);
                ctx.fill();
            }
        });
    }

    gameLoop(timestamp) {
        if (this.state !== 'running') return;

        if (timestamp - this.lastTime >= this.speed) {
            this.lastTime = timestamp;
            this.update();
            if (this.state === 'running') {
                this.draw();
            }
        }

        this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    start() {
        if (this.state === 'over' || this.state === 'ready') {
            this.reset();
            if (this.onScoreChange) this.onScoreChange(0);
        }
        this.state = 'running';
        this.gameStartTime = Date.now();
        this.lastTime = 0;
        this.draw();
        this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    pause() {
        if (this.state !== 'running') return;
        this.state = 'paused';
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'running';
        this.lastTime = 0;
        this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    togglePause() {
        if (this.state === 'running') this.pause();
        else if (this.state === 'paused') this.resume();
    }

    endGame() {
        this.state = 'over';
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        const duration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;

        // 绘制最后一帧
        this.draw();

        if (this.onGameOver) {
            this.onGameOver(this.score, duration);
        }
    }

    drawReady() {
        this.reset();
        this.draw();

        // 绘制提示文字
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = '600 20px Outfit, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('按 "开始游戏" 开始', this.canvas.width / 2, this.canvas.height / 2);
        ctx.textAlign = 'start';
    }
}
