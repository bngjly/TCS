/**
 * app.js - 应用主控制器
 * 管理视图切换（登录 ↔ 游戏）、初始化各模块、绑定全局事件
 */

const App = (() => {
    let game = null;

    // ===== 视图切换 =====

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }

    // ===== 登录页逻辑 =====

    function initAuthView() {
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authMessage = document.getElementById('auth-message');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                authMessage.textContent = '';
                authMessage.className = 'auth-message';

                if (tab.dataset.tab === 'login') {
                    loginForm.style.display = 'block';
                    registerForm.style.display = 'none';
                } else {
                    loginForm.style.display = 'none';
                    registerForm.style.display = 'block';
                }
            });
        });

        // 登录
        document.getElementById('login-btn').addEventListener('click', () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const result = Auth.login(username, password);
            showMessage(authMessage, result.message, result.success);
            if (result.success) {
                setTimeout(() => enterGame(), 300);
            }
        });

        // 注册
        document.getElementById('register-btn').addEventListener('click', () => {
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;
            const result = Auth.register(username, password);
            showMessage(authMessage, result.message, result.success);
            if (result.success) {
                // 自动切到登录
                setTimeout(() => {
                    tabs[0].click();
                    document.getElementById('login-username').value = username;
                }, 800);
            }
        });

        // 游客模式
        document.getElementById('guest-btn').addEventListener('click', () => {
            Auth.guestLogin();
            enterGame();
        });

        // 回车提交
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('login-btn').click();
        });
        document.getElementById('register-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('register-btn').click();
        });
    }

    function showMessage(el, msg, success) {
        el.textContent = msg;
        el.className = 'auth-message ' + (success ? 'success' : 'error');
    }

    // ===== 游戏页逻辑 =====

    function enterGame() {
        const username = Auth.getCurrentUsername();
        const isGuest = Auth.isGuest();
        document.getElementById('user-display').textContent = isGuest ? username + ' (游客)' : username;
        document.getElementById('login-time-display').textContent = Auth.getLoginTime();
        document.getElementById('high-score').textContent = isGuest ? '—' : Storage.getHighScore(username);
        document.getElementById('current-score').textContent = '0';

        // 游客隐藏历史记录按钮
        document.getElementById('history-btn').style.display = isGuest ? 'none' : '';

        showView('game-view');

        // 初始化游戏
        game = new SnakeGame('game-canvas');
        game.onScoreChange = (score) => {
            document.getElementById('current-score').textContent = score;
        };
        game.onGameOver = (score, duration) => {
            // 非游客才保存记录
            if (!isGuest) {
                Storage.addGameRecord(username, score, duration);
                document.getElementById('high-score').textContent = Storage.getHighScore(username);
            }

            // 显示 Game Over 弹窗
            document.getElementById('final-score').textContent = score;
            document.getElementById('final-duration').textContent = formatDuration(duration);
            document.getElementById('game-over-overlay').classList.add('active');
        };
        game.drawReady();

        // 按钮绑定
        setupGameControls();
    }

    function setupGameControls() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');

        startBtn.onclick = () => {
            game.start();
            startBtn.textContent = '重新开始';
            pauseBtn.disabled = false;
            pauseBtn.textContent = '暂停';
        };

        pauseBtn.onclick = () => {
            game.togglePause();
            pauseBtn.textContent = game.state === 'paused' ? '继续' : '暂停';
        };

        // 重新开始（Game Over 弹窗中）
        document.getElementById('restart-btn').onclick = () => {
            document.getElementById('game-over-overlay').classList.remove('active');
            game.start();
            pauseBtn.disabled = false;
            pauseBtn.textContent = '暂停';
        };

        // 登出
        document.getElementById('logout-btn').onclick = () => {
            if (game) {
                game.pause();
                if (game.animFrameId) cancelAnimationFrame(game.animFrameId);
            }
            Auth.logout();
            showView('auth-view');
            // 清空表单
            document.querySelectorAll('.auth-input').forEach(inp => inp.value = '');
            document.getElementById('auth-message').textContent = '';
        };

        // 历史记录
        document.getElementById('history-btn').onclick = () => {
            showHistory();
        };
        document.getElementById('close-history-btn').onclick = () => {
            document.getElementById('history-panel').classList.remove('active');
        };

        // 键盘控制
        document.addEventListener('keydown', handleKeydown);

        // 移动端虚拟方向键
        document.querySelectorAll('.d-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
                if (map[dir] && game && game.state === 'running') {
                    game.setDirection(map[dir][0], map[dir][1]);
                }
            });
        });
    }

    function handleKeydown(e) {
        if (!game || (game.state !== 'running' && game.state !== 'paused')) return;
        const keyMap = {
            ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
            w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
            W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
        };
        if (keyMap[e.key]) {
            e.preventDefault();
            game.setDirection(keyMap[e.key][0], keyMap[e.key][1]);
        }
        if (e.key === 'p' || e.key === 'P') {
            game.togglePause();
            document.getElementById('pause-btn').textContent = game.state === 'paused' ? '继续' : '暂停';
        }
    }

    // ===== 历史记录 =====

    function showHistory() {
        const username = Auth.getCurrentUsername();
        const records = Storage.getGameRecords(username);
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">暂无游戏记录</td></tr>';
        } else {
            // 按时间倒序
            [...records].reverse().forEach(r => {
                const tr = document.createElement('tr');
                const date = new Date(r.playedAt);
                tr.innerHTML = `
          <td>${date.toLocaleString('zh-CN')}</td>
          <td>${r.score}</td>
          <td>${formatDuration(r.duration)}</td>
        `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('history-panel').classList.add('active');
    }

    function formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}分${s.toString().padStart(2, '0')}秒`;
    }

    // ===== 初始化 =====

    function init() {
        initAuthView();

        // 检查是否已登录
        if (Auth.isLoggedIn()) {
            enterGame();
        } else {
            showView('auth-view');
        }
    }

    // DOM 加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);

    return { init };
})();
