/**
 * WALLPAPER MODULE - Полностью выделенная логика работы с обоями
 * Версия: 2.0
 */

// ============================================================
// WALLPAPER DATA
// ============================================================

const WallpaperModule = {
    // Состояние
    data: null,
    pageId: null,
    checkInterval: null,

    // DOM элементы
    elements: {
        preview: null,
        modeRadios: null,
        autoCheckbox: null,
        autoSettings: null,
        intervalInput: null,
        modeSelect: null,
        uploadInput: null,
        forceChangeBtn: null
    },

    // Конфигурация
    config: {
        checkIntervalMs: 5000,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    },

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    init(pageId) {
        this.pageId = pageId;
        this.cacheElements();
        this.bindEvents();
        this.startAutoCheck();
        return this;
    },

    // ===== КЭШИРОВАНИЕ DOM ЭЛЕМЕНТОВ =====
    cacheElements() {
        this.elements.preview = document.getElementById('wallpaperPreview');
        this.elements.modeRadios = document.querySelectorAll('input[name="wallpaperMode"]');
        this.elements.autoCheckbox = document.getElementById('autoChangeCheckbox');
        this.elements.autoSettings = document.getElementById('autoChangeSettings');
        this.elements.intervalInput = document.getElementById('changeInterval');
        this.elements.modeSelect = document.getElementById('changeMode');
        this.elements.uploadInput = document.getElementById('wallpaperInput');
        this.elements.forceChangeBtn = document.querySelector('.wallpaper-force-change-btn');
    },

    // ===== ПРИВЯЗКА СОБЫТИЙ =====
    bindEvents() {
        // Режимы
        this.elements.modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.updateMode(e.target.value);
                }
            });
        });

        // Автосмена
        if (this.elements.autoCheckbox) {
            this.elements.autoCheckbox.addEventListener('change', (e) => {
                this.updateAutoChange(e.target.checked);
            });
        }

        // Интервал
        if (this.elements.intervalInput) {
            this.elements.intervalInput.addEventListener('change', (e) => {
                this.updateInterval(e.target.value);
            });
        }

        // Режим смены
        if (this.elements.modeSelect) {
            this.elements.modeSelect.addEventListener('change', (e) => {
                this.updateChangeMode(e.target.value);
            });
        }

        // Загрузка
        if (this.elements.uploadInput) {
            this.elements.uploadInput.addEventListener('change', (e) => {
                this.uploadWallpapers(e.target);
            });
        }

        // Принудительная смена
        if (this.elements.forceChangeBtn) {
            this.elements.forceChangeBtn.addEventListener('click', () => {
                this.forceChange();
            });
        }
    },

    // ===== ЗАГРУЗКА ДАННЫХ =====
    async loadData() {
        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}`);
            if (!response.ok) throw new Error('Failed to load wallpaper data');

            this.data = await response.json();

            this.updateUI();
            this.render();

            return this.data;
        } catch (error) {
            this.showToast('❌ Ошибка загрузки данных обоев');
            return null;
        }
    },

    // ===== ОБНОВЛЕНИЕ UI =====
    updateUI() {
        if (!this.data) return;

        // Режим
        this.elements.modeRadios.forEach(radio => {
            radio.checked = (radio.value === this.data.mode);
        });

        // Автосмена
        if (this.elements.autoCheckbox) {
            this.elements.autoCheckbox.checked = this.data.autoChange || false;
            this.toggleAutoSettings(this.data.autoChange || false);
        }

        // Интервал
        if (this.elements.intervalInput) {
            this.elements.intervalInput.value = this.data.changeInterval || 30;
        }

        // Режим смены
        if (this.elements.modeSelect) {
            this.elements.modeSelect.value = this.data.changeMode || 'RANDOM';
        }
    },

    // ===== РЕНДЕРИНГ СПИСКА =====
    render() {
        const container = this.elements.preview;
        if (!container) return;

        container.innerHTML = '';

        const wallpapers = this.data?.wallpapers || [];
        const current = this.data?.currentWallpaper;

        if (wallpapers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📷</div>
                    <div class="title">Нет обоев</div>
                    <div class="subtitle">Загрузите изображения ниже</div>
                </div>
            `;
            return;
        }

        wallpapers.forEach((path) => {
            const isActive = path === current;
            const card = document.createElement('div');
            card.className = `wallpaper-card${isActive ? ' active' : ''}`;
            card.style.backgroundImage = `url('${path}?t=${Date.now()}')`;
            card.dataset.path = path;

            const fileName = path.split('/').pop();
            const shortName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;

            card.innerHTML = `
                <div class="check-mark">✓</div>
                <div class="card-overlay">
                    <span class="file-name">${isActive ? '✅ ' : ''}${shortName}</span>
                    <div class="actions">
                        ${!isActive ? `
                            <button class="select-btn" onclick="WallpaperModule.select('${path}')">✓</button>
                        ` : ''}
                        <button class="delete-btn" onclick="WallpaperModule.delete('${path}')">✕</button>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (!isActive) this.select(path);
            });

            container.appendChild(card);
        });

        // Счетчик
        const counter = document.createElement('div');
        counter.className = 'wallpaper-counter';
        counter.textContent = `Всего: ${wallpapers.length} изображений`;
        container.appendChild(counter);
    },

    // ===== УПРАВЛЕНИЕ НАСТРОЙКАМИ =====
    toggleAutoSettings(enabled) {
        if (this.elements.autoSettings) {
            this.elements.autoSettings.classList.toggle('active', enabled);
        }
    },

    async updateMode(mode) {
        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });
            if (response.ok) {
                this.showToast('✅ Режим обновлен');
                await this.loadData();

                if (mode === 'RANDOM') {
                    const randomResponse = await fetch(`/api/wallpaper/${this.pageId}/random`);
                    if (randomResponse.ok) {
                        const path = await randomResponse.text();
                        if (path) this.applyToPage(path);
                    }
                }
            }
        } catch (error) {
            this.showToast('❌ Ошибка обновления режима');
        }
    },

    async updateAutoChange(enabled) {
        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoChange: enabled })
            });
            if (response.ok) {
                this.toggleAutoSettings(enabled);
                this.showToast(enabled ? '✅ Автосмена включена' : '✅ Автосмена выключена');
                await this.loadData();
            }
        } catch (error) {
            this.showToast('❌ Ошибка обновления');
        }
    },

    async updateInterval(value) {
        const seconds = parseInt(value);
        if (isNaN(seconds) || seconds < 5) {
            this.showToast('❌ Минимальный интервал 5 секунд');
            return;
        }

        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changeInterval: seconds })
            });
            if (response.ok) {
                this.showToast('✅ Интервал обновлен');
            }
        } catch (error) {
            this.showToast('❌ Ошибка обновления интервала');
        }
    },

    async updateChangeMode(mode) {
        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changeMode: mode })
            });
            if (response.ok) {
                this.showToast('✅ Режим смены обновлен');
            }
        } catch (error) {
            this.showToast('❌ Ошибка обновления');
        }
    },

    // ===== ЗАГРУЗКА ОБОЕВ =====
    async uploadWallpapers(input) {
        if (!input.files || input.files.length === 0) {
            this.showToast('❌ Выберите файлы');
            return;
        }

        let uploaded = 0;
        let failed = 0;
        const total = input.files.length;

        this.showToast(`⏳ Загрузка ${total} файлов...`);

        for (const file of input.files) {
            if (file.size > this.config.maxFileSize) {
                failed++;
                continue;
            }

            if (!this.config.allowedTypes.includes(file.type)) {
                failed++;
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`/api/wallpaper/upload/${this.pageId}`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    uploaded++;
                } else {
                    failed++;
                    const error = await response.text();
                }
            } catch (error) {
                failed++;
            }
        }

        input.value = '';

        if (uploaded > 0) {
            this.showToast(`✅ Загружено ${uploaded} файлов${failed > 0 ? `, ${failed} с ошибками` : ''}`);
            await this.loadData();

            if (this.data?.currentWallpaper) {
                this.applyToPage(this.data.currentWallpaper);
            }
        } else {
            this.showToast('❌ Ошибка загрузки файлов');
        }
    },

    // ===== ВЫБОР ОБОЕВ =====
    async select(path) {
        if (!path) {
            this.showToast('❌ Путь не указан');
            return;
        }

        try {
            this.showToast('⏳ Установка...');

            const response = await fetch(`/api/wallpaper/${this.pageId}/set`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (response.ok) {
                this.showToast('✅ Обои установлены');
                this.applyToPage(path);
                await this.loadData();
            } else {
                const error = await response.text();
                this.showToast('❌ Ошибка: ' + error);
            }
        } catch (error) {
            this.showToast('❌ Ошибка установки');
        }
    },

    // ===== УДАЛЕНИЕ ОБОЕВ =====
    async delete(path) {
        if (!confirm('Удалить эти обои?')) return;

        try {
            const response = await fetch(`/api/wallpaper/${this.pageId}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (response.ok) {
                this.showToast('✅ Обои удалены');
                await this.loadData();

                if (!this.data?.currentWallpaper || this.data.wallpapers.length === 0) {
                    this.removeFromPage();
                } else if (this.data.currentWallpaper) {
                    this.applyToPage(this.data.currentWallpaper);
                }
            } else {
                const error = await response.text();
                this.showToast('❌ Ошибка: ' + error);
            }
        } catch (error) {
            this.showToast('❌ Ошибка удаления');
        }
    },

    // ===== ПРИНУДИТЕЛЬНАЯ СМЕНА =====
    async forceChange() {
        try {
            this.showToast('⏳ Смена...');

            const response = await fetch(`/api/wallpaper/${this.pageId}/next`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                const path = result.path;

                if (path) {
                    this.showToast('✅ Обои изменены');
                    this.applyToPage(path);
                    await this.loadData();
                } else {
                    this.showToast('❌ Нет обоев для смены');
                }
            } else {
                const error = await response.text();
                this.showToast('❌ Ошибка: ' + error);
            }
        } catch (error) {
            this.showToast('❌ Ошибка смены');
        }
    },

    // ===== ПРИМЕНЕНИЕ НА СТРАНИЦЕ =====
    // ===== ПРИМЕНЕНИЕ НА СТРАНИЦЕ =====
    applyToPage(path) {
        if (typeof applyWallpaperWithOverlay === 'function') {
            applyWallpaperWithOverlay(path);
        } else {
            // Fallback если функция не определена
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
    },

    removeFromPage() {
        const body = document.body;
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        body.classList.remove('wallpaper-applied');
        body.style.backgroundImage = '';
    },

    // ===== АВТОМАТИЧЕСКАЯ ПРОВЕРКА =====
    startAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/wallpaper/${this.pageId}/check`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.changed && data.path) {
                        this.applyToPage(data.path);

                        // Обновляем список если настройки открыты
                        const overlay = document.getElementById('settingsOverlay');
                        if (overlay?.classList.contains('active')) {
                            await this.loadData();
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        }, this.config.checkIntervalMs);
    },

    // ===== TOAST УВЕДОМЛЕНИЯ =====
    showToast(message) {
        let toast = document.getElementById('wallpaperToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'wallpaperToast';
            toast.className = 'wallpaper-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    // Ждем пока определится currentPageId
    const checkPageId = setInterval(() => {
        if (typeof currentPageId !== 'undefined') {
            clearInterval(checkPageId);
            WallpaperModule.init(currentPageId);

            // Загружаем данные
            WallpaperModule.loadData().then(data => {
                if (data?.mode === 'RANDOM' && data.wallpapers.length > 0) {
                    fetch(`/api/wallpaper/${currentPageId}/random`)
                        .then(r => r.text())
                        .then(path => {
                            if (path) WallpaperModule.applyToPage(path);
                        })
                        .catch(() => {});
                } else if (data?.currentWallpaper) {
                    WallpaperModule.applyToPage(data.currentWallpaper);
                }
            });
        }
    }, 100);
});