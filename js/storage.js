/**
 * storage.js - 数据管理模块
 * 封装 localStorage 的读写操作，管理用户数据和游戏记录
 */

const Storage = (() => {
    const USERS_KEY = 'snake_users';
    const CURRENT_USER_KEY = 'snake_current_user';
    const LOGIN_TIME_KEY = 'snake_login_time';

    // ===== 用户数据 =====

    function getAllUsers() {
        const data = localStorage.getItem(USERS_KEY);
        return data ? JSON.parse(data) : {};
    }

    function saveAllUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getUser(username) {
        const users = getAllUsers();
        return users[username] || null;
    }

    function createUser(username, encodedPassword) {
        const users = getAllUsers();
        if (users[username]) return false;
        users[username] = {
            password: encodedPassword,
            createdAt: new Date().toISOString(),
            records: []
        };
        saveAllUsers(users);
        return true;
    }

    // ===== 会话管理 =====

    function setCurrentUser(username) {
        sessionStorage.setItem(CURRENT_USER_KEY, username);
        sessionStorage.setItem(LOGIN_TIME_KEY, new Date().toISOString());
    }

    function getCurrentUser() {
        return sessionStorage.getItem(CURRENT_USER_KEY);
    }

    function getLoginTime() {
        return sessionStorage.getItem(LOGIN_TIME_KEY);
    }

    function clearSession() {
        sessionStorage.removeItem(CURRENT_USER_KEY);
        sessionStorage.removeItem(LOGIN_TIME_KEY);
    }

    // ===== 游戏记录 =====

    function addGameRecord(username, score, duration) {
        const users = getAllUsers();
        if (!users[username]) return false;
        users[username].records.push({
            score,
            duration,
            playedAt: new Date().toISOString()
        });
        saveAllUsers(users);
        return true;
    }

    function getGameRecords(username) {
        const user = getUser(username);
        return user ? user.records : [];
    }

    function getHighScore(username) {
        const records = getGameRecords(username);
        if (records.length === 0) return 0;
        return Math.max(...records.map(r => r.score));
    }

    return {
        getAllUsers,
        getUser,
        createUser,
        setCurrentUser,
        getCurrentUser,
        getLoginTime,
        clearSession,
        addGameRecord,
        getGameRecords,
        getHighScore
    };
})();
