/**
 * WIDGET-SETTINGS-POPUP.JS
 * Плавающая панель настроек виджета
 */

let WidgetSettingsPopup = (function() {
    let popupEl = null;
    let overlayEl = null;
    let activeWidget = null;
    let outsideClickHandler = null;
    let escapeHandler = null;
    let repositionHandler = null;

    // ===== ПРОВЕРКА СОСТОЯНИЯ =====
    function isOpen() {
        return popupEl !== null && activeWidget !== null;
    }

    function isOpenFor(widgetId) {
        if (!isOpen()) return false;
        return String(activeWidget.dataset.widgetId) === String(widgetId);
    }

    function getActiveWidget() {
        return activeWidget;
    }

    function getActiveWidgetId() {
        return activeWidget ? activeWidget.dataset.widgetId : null;
    }

    // ===== ПЕРЕКЛЮЧЕНИЕ =====
    function toggle(widget) {
        if (!widget) return;

        const widgetId = widget.dataset.widgetId;
        if (isOpenFor(widgetId)) {
            close();
            return;
        }

        open(widget);
    }

    // ===== ОТКРЫТИЕ =====
    function open(widget) {
        if (!widget) return;

        if (isOpen()) {
            close(true);
        }

        const widgetId = widget.dataset.widgetId;
        const widgetType = widget.dataset.widgetType || 'WIDGET';

        const titleText = widget.querySelector('.widget-title')?.textContent?.trim() || widgetType;
        const icon = (typeof getWidgetIcon === 'function') ? getWidgetIcon(widgetType) : '📦';

        // === Оверлей ===
        overlayEl = document.createElement('div');
        overlayEl.className = 'widget-settings-overlay';
        document.body.appendChild(overlayEl);

        // === Сам попап ===
        popupEl = document.createElement('div');
        popupEl.className = 'widget-settings-popup';
        popupEl.dataset.widgetId = widgetId;
        popupEl.innerHTML = `
            <div class="widget-settings-popup-header">
                <div class="widget-settings-popup-title">
                    <span class="popup-title-icon">${icon}</span>
                    <span class="popup-title-text">${escapeHtml(titleText)}</span>
                    <span class="widget-settings-popup-type">${escapeHtml(widgetType)}</span>
                </div>
                <button class="widget-settings-popup-close" title="Закрыть (Esc)">✕</button>
            </div>
            <div class="widget-settings-popup-body"></div>
        `;
        document.body.appendChild(popupEl);

        // === Подсветка виджета ===
        activeWidget = widget;
        widget.classList.add('settings-active');

        // === Позиционирование ===
        position(widget, popupEl);

        // === Содержимое ===
        const body = popupEl.querySelector('.widget-settings-popup-body');
        if (typeof loadModuleSettingsInto === 'function') {
            loadModuleSettingsInto(widget, body).then(() => {
                position(widget, popupEl);
            });
        } else {
            body.innerHTML = `<div style="text-align:center;opacity:0.5;padding:20px;font-size:13px;">Ошибка: загрузчик настроек недоступен</div>`;
        }

        // === Кнопка закрытия ===
        popupEl.querySelector('.widget-settings-popup-close').addEventListener('click', () => {
            close();
        });

        // === Клик по оверлею ===
        overlayEl.addEventListener('mousedown', (e) => {
            if (e.target === overlayEl) {
                close();
            }
        });

        // === Клик вне попапа (страховка) ===
        outsideClickHandler = (e) => {
            if (!popupEl) return;
            if (popupEl.contains(e.target)) return;
            if (overlayEl && overlayEl.contains(e.target)) return;

            const settingsBtn = e.target.closest('.widget-settings-btn');
            if (settingsBtn) {
                const btnWidget = settingsBtn.closest('.widget');
                if (btnWidget && String(btnWidget.dataset.widgetId) === String(widgetId)) return;
            }
            if (activeWidget && activeWidget.contains(e.target)) return;
            close();
        };
        document.addEventListener('mousedown', outsideClickHandler);

        // === Escape ===
        escapeHandler = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // === Репозиционирование ===
        repositionHandler = () => {
            if (activeWidget && popupEl) {
                position(activeWidget, popupEl);
            }
        };
        window.addEventListener('resize', repositionHandler);
        window.addEventListener('scroll', repositionHandler, true);
    }

    // ===== ПОЗИЦИОНИРОВАНИЕ =====
    function position(widget, popup) {
        const wRect = widget.getBoundingClientRect();
        const pRect = popup.getBoundingClientRect();

        const popupWidth = pRect.width || 400;
        const popupHeight = pRect.height || 200;

        const gap = 12;
        const margin = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // === По горизонтали ===
        let left;

        const spaceRight = vw - wRect.right;
        const spaceLeft = wRect.left;

        const fitsRight = spaceRight >= popupWidth + gap + margin;
        const fitsLeft = spaceLeft >= popupWidth + gap + margin;

        if (fitsRight) {
            // Встаём справа от виджета
            left = wRect.right + gap;
        } else if (fitsLeft) {
            // Встаём слева от виджета
            left = wRect.left - gap - popupWidth;
        } else {
            // Нигде не помещается — прижимаем к краю с большим запасом места
            if (spaceRight >= spaceLeft) {
                // Прижимаем к правому краю
                left = vw - popupWidth - margin;
            } else {
                // Прижимаем к левому краю
                left = margin;
            }
        }

        // Финальная страховка от выхода за края окна
        if (left + popupWidth > vw - margin) {
            left = vw - popupWidth - margin;
        }
        if (left < margin) left = margin;

        // === По вертикали ===
        let top = wRect.top;
        if (top + popupHeight > vh - margin) {
            top = vh - popupHeight - margin;
        }
        if (top < margin) top = margin;

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    // ===== ЗАКРЫТИЕ =====
    function close(silent) {
        if (!popupEl) return;

        if (activeWidget) {
            activeWidget.classList.remove('settings-active');
        }

        popupEl.remove();
        popupEl = null;

        if (overlayEl) {
            overlayEl.remove();
            overlayEl = null;
        }

        activeWidget = null;

        if (outsideClickHandler) {
            document.removeEventListener('mousedown', outsideClickHandler);
            outsideClickHandler = null;
        }
        if (escapeHandler) {
            document.removeEventListener('keydown', escapeHandler);
            escapeHandler = null;
        }
        if (repositionHandler) {
            window.removeEventListener('resize', repositionHandler);
            window.removeEventListener('scroll', repositionHandler, true);
            repositionHandler = null;
        }
    }

    // ===== ОБНОВИТЬ СОДЕРЖИМОЕ =====
    function refresh() {
        if (!isOpen()) return;

        const widget = activeWidget;
        const body = popupEl.querySelector('.widget-settings-popup-body');
        if (!body) return;

        if (typeof loadModuleSettingsInto === 'function') {
            loadModuleSettingsInto(widget, body).then(() => {
                position(widget, popupEl);
            });
        }
    }

    // ===== ПУБЛИЧНЫЙ API =====
    return {
        toggle,
        open,
        close,
        refresh,
        isOpen,
        isOpenFor,
        getActiveWidget,
        getActiveWidgetId
    };
})();

window.WidgetSettingsPopup = WidgetSettingsPopup;