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

// ===== ЗАГРУЗКА НАСТРОЕК ССЫЛОК =====
async function loadLinkSettingsFromServer() {
    try {
        const response = await fetch(`/api/pages/${currentPageId}/links/settings`);
        if (response.ok) {
            const data = await response.json();

            const settings = {
                iconSize: data.linkIconSize || data.iconSize || 28,
                fontSize: data.linkFontSize || data.fontSize || 12,
                bgOpacity: data.linkBgOpacity || data.bgOpacity || 15,
                bgDarkness: data.linkBgDarkness || data.bgDarkness || 0,
                showAddLinkButton: data.showAddLinkButton !== undefined ? data.showAddLinkButton : true
            };

            linkSettings = settings;

            applyLinkStylesFromSettings(settings);

            if (typeof renderLinks === 'function') {
                renderLinks();
            }

            const overlay = document.getElementById('settingsOverlay');
            if (overlay && overlay.classList.contains('active')) {
                const checkbox = document.getElementById('showAddLinkButton');
                if (checkbox) {
                    checkbox.checked = settings.showAddLinkButton;
                }
            }

            return settings;
        }
    } catch (error) {
    }
    return null;
}

// ===== ПРИМЕНЕНИЕ НАСТРОЕК ССЫЛОК =====
function applyLinkStylesFromSettings(settings) {
    if (!settings) {
        return;
    }

    const iconSize = settings.iconSize || settings.linkIconSize || 28;
    const fontSize = settings.fontSize || settings.linkFontSize || 12;
    const bgOpacity = settings.bgOpacity || settings.linkBgOpacity || 15;
    const bgDarkness = settings.bgDarkness || settings.linkBgDarkness || 0;

    const opacity = bgOpacity / 100;
    const baseColor = `rgba(255, 255, 255, ${opacity})`;

    let darknessColor = 'transparent';
    if (bgDarkness < 0) {
        const darkAmount = Math.abs(bgDarkness) / 100;
        darknessColor = `rgba(0, 0, 0, ${darkAmount * 0.5})`;
    } else if (bgDarkness > 0) {
        const lightAmount = bgDarkness / 100;
        darknessColor = `rgba(255, 255, 255, ${lightAmount * 0.3})`;
    }

    const iconSizePx = Math.max(28, Math.min(100, iconSize)) + 'px';
    const containerSize = Math.max(40, Math.min(112, iconSize + 12)) + 'px';

    document.querySelectorAll('.link-card').forEach(card => {
        card.style.background = baseColor;

        const oldLayer = card.querySelector('.darkness-layer');
        if (oldLayer) oldLayer.remove();

        if (darknessColor !== 'transparent') {
            const darkLayer = document.createElement('div');
            darkLayer.className = 'darkness-layer';
            darkLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: ${darknessColor};
                pointer-events: none;
                z-index: 0;
                border-radius: inherit;
            `;
            card.prepend(darkLayer);
        }

        card.style.boxShadow = opacity < 0.3
            ? '0 2px 12px rgba(0, 0, 0, 0.25)'
            : '0 2px 12px rgba(0, 0, 0, 0.08)';

        const iconContainer = card.querySelector('.icon-container');
        if (iconContainer) {
            iconContainer.style.width = containerSize;
            iconContainer.style.height = containerSize;
        }

        const emojiIcons = card.querySelectorAll('.link-icon');
        emojiIcons.forEach(icon => {
            icon.style.fontSize = iconSizePx;
        });

        const fallbackIcons = card.querySelectorAll('.link-icon-fallback');
        fallbackIcons.forEach(icon => {
            icon.style.fontSize = iconSizePx;
        });

        const imgIcons = card.querySelectorAll('.link-icon-img, .link-icon-favicon');
        imgIcons.forEach(img => {
            img.style.width = '100%';
            img.style.height = '100%';
        });

        const title = card.querySelector('.link-title');
        if (title) {
            title.style.fontSize = fontSize + 'px';
        }
    });
}

// ===== ПЕРЕСОЗДАНИЕ ИКОНОК =====
function recreateLinkIcons(settings) {
    if (!settings) {
        return;
    }

    const iconSize = settings.iconSize || settings.linkIconSize || 28;

    const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
    const containerSize = Math.max(40, Math.min(112, iconSize + 12)) + 'px';

    document.querySelectorAll('.link-card').forEach(card => {
        const container = card.querySelector('.icon-container');
        if (!container) return;

        container.style.width = containerSize;
        container.style.height = containerSize;

        const emoji = container.querySelector('.link-icon');
        if (emoji) {
            emoji.style.fontSize = iconSizePx;
        }

        const fallback = container.querySelector('.link-icon-fallback');
        if (fallback) {
            fallback.style.fontSize = iconSizePx;
        }

        const img = container.querySelector('.link-icon-img, .link-icon-favicon');
        if (img) {
            img.style.width = '100%';
            img.style.height = '100%';
        }
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const pageContainer = document.getElementById('pageContainer');
    if (pageContainer) {
        currentPageId = parseInt(pageContainer.dataset.pageId);
    }

    if (typeof initHeader === 'function') initHeader();
    if (typeof initLinks === 'function') initLinks();
    if (typeof initModules === 'function') initModules();

    if (typeof WallpaperModule !== 'undefined' && currentPageId) {
        WallpaperModule.init(currentPageId);
    }

    if (currentPageId) {
        loadLinkSettingsFromServer();
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