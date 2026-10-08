/**
 * CORE.JS - Основные функции и инициализация
 */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentPageId = null;
let settingsData = null;
let linkSettings = null;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== ПРИМЕНЕНИЕ ОБОЕВ =====
function applyWallpaperWithOverlay(path) {
    if (!path) {
        const body = document.body;
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        body.classList.remove('wallpaper-applied');
        body.style.backgroundImage = '';
        return;
    }

    const body = document.body;
    const imageUrl = path + '?t=' + Date.now();

    const img = new Image();
    img.onload = function() {
        body.style.backgroundImage = `url('${imageUrl}')`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
        body.classList.add('wallpaper-applied');
    };
    img.onerror = function() {
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        body.classList.remove('wallpaper-applied');
    };
    img.src = imageUrl;
}

// ===== ПРИНУДИТЕЛЬНАЯ СМЕНА ОБОЕВ =====
async function forceChangeWallpaper() {
    try {
        showToast('⏳ Смена обоев...');

        const response = await fetch(`/api/wallpaper/${currentPageId}/next`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            const path = result.path;

            if (path) {
                showToast('✅ Обои изменены');
                applyWallpaperWithOverlay(path);

                const overlay = document.getElementById('settingsOverlay');
                if (overlay && overlay.classList.contains('active')) {
                    if (typeof WallpaperModule !== 'undefined') {
                        await WallpaperModule.loadData();
                        WallpaperModule.render();
                    }
                }
            } else {
                showToast('❌ Нет обоев для смены');
            }
        } else {
            const error = await response.text();
            showToast('❌ Ошибка смены обоев: ' + error);
        }
    } catch (error) {
        showToast('❌ Ошибка смены обоев');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const pageContainer = document.getElementById('pageContainer');
    if (pageContainer) {
        currentPageId = parseInt(pageContainer.dataset.pageId);
    }

    const pageNameEl = document.querySelector('.header .page-title span:last-child');
    if (pageNameEl && typeof saveLastPage === 'function') {
        saveLastPage(pageNameEl.textContent.trim());
    }

    if (typeof initHeader === 'function') initHeader();
    if (typeof initGrid === 'function') initGrid();
    if (typeof initModules === 'function') initModules();

    if (typeof WallpaperModule !== 'undefined' && currentPageId) {
        WallpaperModule.init(currentPageId);
    }

    // ===== ОДИН вызов восстановления настроек =====
    setTimeout(() => {
        if (typeof restoreAllWidgetSettings === 'function') {
            restoreAllWidgetSettings();
        }
    }, 400);

    // ===== PUSH УВЕДОМЛЕНИЯ =====
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted' && typeof autoSubscribeToPush === 'function') {
                        setTimeout(autoSubscribeToPush, 1000);
                    }
                });
            } else if (Notification.permission === 'granted' && typeof autoSubscribeToPush === 'function') {
                setTimeout(autoSubscribeToPush, 1000);
            }
        });
    }
});

// ===== НАВИГАЦИЯ ПО СТРЕЛКАМ =====
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        const prevArrow = document.querySelector('.page-navigation.prev');
        if (prevArrow && !prevArrow.classList.contains('disabled')) {
            navigatePage('prev');
        }
    }
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        const nextArrow = document.querySelector('.page-navigation.next');
        if (nextArrow && !nextArrow.classList.contains('disabled')) {
            navigatePage('next');
        }
    }
});