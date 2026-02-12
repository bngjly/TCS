/**
 * auth.js - 用户认证模块
 * 注册、登录、登出、会话管理
 */

const Auth = (() => {

    function encode(str) {
        return btoa(encodeURIComponent(str));
    }

    function register(username, password) {
        if (!username || !password) {
            return { success: false, message: '用户名和密码不能为空' };
        }
        if (username.length < 2) {
            return { success: false, message: '用户名至少需要2个字符' };
        }
        if (password.length < 4) {
            return { success: false, message: '密码至少需要4个字符' };
        }
        const encoded = encode(password);
        const created = Storage.createUser(username, encoded);
        if (!created) {
            return { success: false, message: '用户名已存在' };
        }
        return { success: true, message: '注册成功！请登录' };
    }

    function login(username, password) {
        if (!username || !password) {
            return { success: false, message: '请输入用户名和密码' };
        }
        const user = Storage.getUser(username);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }
        const encoded = encode(password);
        if (user.password !== encoded) {
            return { success: false, message: '密码错误' };
        }
        Storage.setCurrentUser(username);
        return { success: true, message: '登录成功' };
    }

    function guestLogin() {
        const guestName = '游客_' + Math.random().toString(36).substring(2, 6);
        sessionStorage.setItem('snake_is_guest', 'true');
        Storage.setCurrentUser(guestName);
        return { success: true, message: '游客模式', username: guestName };
    }

    function isGuest() {
        return sessionStorage.getItem('snake_is_guest') === 'true';
    }

    function logout() {
        sessionStorage.removeItem('snake_is_guest');
        Storage.clearSession();
    }

    function isLoggedIn() {
        return !!Storage.getCurrentUser();
    }

    function getCurrentUsername() {
        return Storage.getCurrentUser();
    }

    function getLoginTime() {
        const iso = Storage.getLoginTime();
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    return { register, login, guestLogin, isGuest, logout, isLoggedIn, getCurrentUsername, getLoginTime };
})();
