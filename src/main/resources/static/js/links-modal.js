/**
 * LINKS-MODAL.JS - Модальное окно для добавления/редактирования ссылок
 */

const LinksModal = {
    isOpen: false,
    isEdit: false,
    editId: null,
    selectedIcon: '🔗',
    selectedIconType: 'emoji',
    customImageData: null,
    pageId: null,
    _afterSubmitCallback: null,
    _initialized: false,

    icons: [
        '🔗', '🌐', '📧', '📱', '💻', '🖥️', '📚', '📖', '🎮', '🎵',
        '📷', '🎨', '🏠', '🏢', '🏫', '🏪', '🏛️', '🏗️', '🚀', '⭐',
        '🔥', '💡', '🎯', '📌', '📍', '🔖', '📎', '✏️', '📝', '📋',
        '📊', '📈', '📉', '💎', '🔮', '🎪', '🎭', '🎫', '🏆', '🥇'
    ],

    init(pageId) {
        console.log('LinksModal.init() called with pageId:', pageId);
        this.pageId = pageId;
        this._initialized = true;
        this.createModal();
        this.bindEvents();
        console.log('LinksModal initialized');
    },

    afterSubmit(callback) {
        this._afterSubmitCallback = callback;
        console.log('AfterSubmit callback set');
    },

    ensureInitialized() {
        if (!this._initialized || !this.pageId) {
            console.log('LinksModal not initialized, initializing...');
            if (typeof currentPageId !== 'undefined' && currentPageId) {
                this.init(currentPageId);
                return true;
            }
            return false;
        }
        return true;
    },

    createModal() {
        if (document.getElementById('linksModalOverlay')) {
            return;
        }

        const modalHTML = `
            <div class="links-modal-overlay" id="linksModalOverlay">
                <div class="links-modal">
                    <div class="links-modal-header">
                        <h3 id="linksModalTitle">➕ Добавить ссылку</h3>
                        <button class="links-modal-close" onclick="LinksModal.close()">✕</button>
                    </div>
                    
                    <form class="links-modal-form" id="linksModalForm" onsubmit="LinksModal.submit(event)">
                        <div class="form-group">
                            <label for="linkTitle">Название</label>
                            <input type="text" id="linkTitle" placeholder="Введите название..." required autofocus>
                        </div>
                        
                        <div class="form-group">
                            <label for="linkUrl">URL</label>
                            <input type="url" id="linkUrl" placeholder="https://example.com" required>
                            <span class="hint">Введите полный URL с https:// или просто домен</span>
                        </div>
                        
                        <div class="form-group">
                            <label>Тип иконки</label>
                            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                    <input type="radio" name="iconType" value="emoji" 
                                           onchange="LinksModal.switchIconType('emoji')">
                                    <span>Эмодзи</span>
                                </label>
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                    <input type="radio" name="iconType" value="favicon" 
                                           onchange="LinksModal.switchIconType('favicon')">
                                    <span>🌐 Favicon</span>
                                </label>
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                    <input type="radio" name="iconType" value="custom" 
                                           onchange="LinksModal.switchIconType('custom')">
                                    <span>🖼️ Своё изображение</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Эмодзи -->
                        <div class="form-group" id="emojiPicker">
                            <label>Выберите эмодзи</label>
                            <div class="icon-picker" id="iconPicker">
                                ${this.icons.map(icon => `
                                    <div class="icon-option ${icon === this.selectedIcon ? 'selected' : ''}" 
                                         onclick="LinksModal.selectIcon('${icon}')">
                                        ${icon}
                                    </div>
                                `).join('')}
                            </div>
                            <div class="icon-custom-input">
                                <input type="text" id="customIcon" placeholder="Или введите свой эмодзи" 
                                       oninput="LinksModal.setCustomIcon(this.value)">
                            </div>
                        </div>
                        
                        <!-- Favicon -->
                        <div class="form-group" id="faviconPicker" style="display:none;">
                            <label>Favicon</label>
                            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                                <button type="button" class="btn-favicon" onclick="LinksModal.fetchFavicon()">
                                    🔍 Получить favicon
                                </button>
                                <span id="faviconStatus" style="font-size:12px; opacity:0.5;">Введите URL и нажмите кнопку</span>
                            </div>
                            <div id="faviconPreview" style="margin-top:10px; display:none;">
                                <img id="faviconImg" src="" alt="Favicon" style="width:48px; height:48px; border-radius:8px;">
                            </div>
                        </div>
                        
                        <!-- Custom image -->
                        <div class="form-group" id="customImagePicker" style="display:none;">
                            <label>Загрузить изображение</label>
                            <input type="file" id="customImageInput" accept="image/*" 
                                   onchange="LinksModal.handleImageUpload(event)">
                            <span class="hint">Поддерживаются JPG, PNG, GIF до 2MB</span>
                            <div id="customImagePreview" style="margin-top:10px; display:none;">
                                <img id="customImagePreviewImg" src="" alt="Preview" 
                                     style="width:64px; height:64px; border-radius:8px; object-fit:cover;">
                                <button type="button" onclick="LinksModal.removeCustomImage()" 
                                        style="margin-left:10px; background:rgba(244,67,54,0.2); border:none; 
                                               color:white; padding:4px 12px; border-radius:6px; cursor:pointer;">
                                    Удалить
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="LinksModal.close()">Отмена</button>
                            <button type="submit" class="btn-submit" id="linksModalSubmitBtn">➕ Добавить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // После создания модального окна, устанавливаем правильное состояние
        setTimeout(() => {
            // По умолчанию показываем только эмодзи
            const emojiPicker = document.getElementById('emojiPicker');
            const faviconPicker = document.getElementById('faviconPicker');
            const customImagePicker = document.getElementById('customImagePicker');

            if (emojiPicker) emojiPicker.style.display = 'block';
            if (faviconPicker) faviconPicker.style.display = 'none';
            if (customImagePicker) customImagePicker.style.display = 'none';

            // Убеждаемся, что радио кнопка эмодзи выбрана
            const emojiRadio = document.querySelector('input[name="iconType"][value="emoji"]');
            if (emojiRadio) emojiRadio.checked = true;

            this.selectedIconType = 'emoji';
            this.selectedIcon = '🔗';
        }, 50);
    },

    // ===== ОТКРЫТИЕ ДЛЯ ДОБАВЛЕНИЯ =====
    open() {
        console.log('LinksModal.open() called');

        // Проверяем инициализацию
        if (!this.ensureInitialized()) {
            showToast('❌ Ошибка: система ссылок не инициализирована');
            return;
        }

        this.isEdit = false;
        this.editId = null;
        this.setModalTitle('➕ Добавить ссылку');
        this.setSubmitButtonText('➕ Добавить');
        this.resetForm();
        this.showModal();
    },

    // ===== ОТКРЫТИЕ ДЛЯ РЕДАКТИРОВАНИЯ С ДАННЫМИ =====
    openEditWithData(link) {
        if (!link) {
            showToast('❌ Ошибка: данные ссылки не найдены');
            return;
        }

        console.log('LinksModal.openEditWithData() called for link:', link.id);
        this.isEdit = true;
        this.editId = link.id;

        this.fillForm(link);
        this.showModal();
    },

    showModal() {
        console.log('LinksModal.showModal() called');

        // Сначала создаем оверлей если его нет
        let overlay = document.getElementById('linksModalOverlay');
        if (!overlay) {
            console.log('Creating modal overlay');
            this.createModal();
            overlay = document.getElementById('linksModalOverlay');
        }

        if (!overlay) {
            console.error('Failed to create modal overlay');
            return;
        }

        // Показываем оверлей
        overlay.classList.add('active');
        overlay.style.display = 'flex';

        this.isOpen = true;
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            const titleInput = document.getElementById('linkTitle');
            if (titleInput) titleInput.focus();
        }, 100);
    },

    setModalTitle(title) {
        const el = document.getElementById('linksModalTitle');
        if (el) el.textContent = title;
    },

    setSubmitButtonText(text) {
        const el = document.getElementById('linksModalSubmitBtn');
        if (el) el.textContent = text;
    },

    // ===== ЗАПОЛНЕНИЕ ФОРМЫ =====
    fillForm(link) {
        console.log('Filling form with link data:', link);

        document.getElementById('linkTitle').value = link.title || '';
        document.getElementById('linkUrl').value = link.url || '';

        let iconType = link.iconType || 'emoji';
        let icon = link.icon || '🔗';
        let customImage = link.customImage || null;

        console.log('Form data:', { iconType, icon, customImage: customImage ? 'present' : 'null' });

        // Если иконка - это URL (favicon) и тип не указан
        if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
            const ext = icon.split('.').pop().toLowerCase();
            if (['ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
                iconType = 'favicon';
            }
        }

        this.selectedIconType = iconType;
        this.selectedIcon = icon;
        this.customImageData = customImage;

        // Устанавливаем радио кнопку
        document.querySelectorAll('input[name="iconType"]').forEach(el => {
            el.checked = (el.value === iconType);
        });

        // Переключаем видимость
        this.switchIconType(iconType);

        if (iconType === 'custom' && customImage) {
            const preview = document.getElementById('customImagePreview');
            const img = document.getElementById('customImagePreviewImg');
            if (preview && img) {
                img.src = customImage;
                preview.style.display = 'block';
            }
            document.getElementById('customImageInput').value = '';
        } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
            const preview = document.getElementById('faviconPreview');
            const img = document.getElementById('faviconImg');
            if (preview && img) {
                img.src = icon;
                preview.style.display = 'block';
                document.getElementById('faviconStatus').textContent = '✅ Favicon загружен';
            }
        } else {
            // Эмодзи
            this.selectedIcon = icon;
            this.updateIconSelection();
            document.getElementById('customIcon').value = '';
            // Скрываем превью
            document.getElementById('customImagePreview').style.display = 'none';
            document.getElementById('faviconPreview').style.display = 'none';
        }
    },

    // ===== СБРОС ФОРМЫ =====
    resetForm() {
        document.getElementById('linkTitle').value = '';
        document.getElementById('linkUrl').value = '';
        document.getElementById('customIcon').value = '';
        document.getElementById('customImageInput').value = '';

        this.selectedIcon = '🔗';
        this.selectedIconType = 'emoji';
        this.customImageData = null;

        document.getElementById('customImagePreview').style.display = 'none';
        document.getElementById('faviconPreview').style.display = 'none';
        document.getElementById('faviconStatus').textContent = 'Введите URL и нажмите кнопку';
        document.getElementById('faviconImg').src = '';

        this.updateIconSelection();

        // Переключаем на эмодзи
        const emojiRadio = document.querySelector('input[name="iconType"][value="emoji"]');
        if (emojiRadio) emojiRadio.checked = true;

        // Показываем только эмодзи
        document.getElementById('emojiPicker').style.display = 'block';
        document.getElementById('faviconPicker').style.display = 'none';
        document.getElementById('customImagePicker').style.display = 'none';
    },

    // ===== ОСТАЛЬНЫЕ МЕТОДЫ =====
    bindEvents() {
        const overlay = document.getElementById('linksModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    LinksModal.close();
                }
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && LinksModal.isOpen) {
                LinksModal.close();
            }
        });
    },

    // ===== ПЕРЕКЛЮЧЕНИЕ ТИПА ИКОНКИ =====
    switchIconType(type) {
        console.log('Switching icon type to:', type);
        this.selectedIconType = type;

        const emojiPicker = document.getElementById('emojiPicker');
        const faviconPicker = document.getElementById('faviconPicker');
        const customImagePicker = document.getElementById('customImagePicker');

        // Скрываем все
        if (emojiPicker) emojiPicker.style.display = 'none';
        if (faviconPicker) faviconPicker.style.display = 'none';
        if (customImagePicker) customImagePicker.style.display = 'none';

        // Показываем только выбранный
        if (type === 'emoji' && emojiPicker) {
            emojiPicker.style.display = 'block';
        } else if (type === 'favicon' && faviconPicker) {
            faviconPicker.style.display = 'block';
            const status = document.getElementById('faviconStatus');
            const preview = document.getElementById('faviconPreview');
            if (status) status.textContent = 'Введите URL и нажмите кнопку';
            if (preview) preview.style.display = 'none';
        } else if (type === 'custom' && customImagePicker) {
            customImagePicker.style.display = 'block';
        }
    },

    async fetchFavicon() {
        const urlInput = document.getElementById('linkUrl');
        const status = document.getElementById('faviconStatus');
        const preview = document.getElementById('faviconPreview');
        const img = document.getElementById('faviconImg');

        let url = urlInput.value.trim();
        if (!url) {
            status.textContent = '⚠️ Сначала введите URL';
            return;
        }

        status.textContent = '⏳ Поиск favicon...';
        preview.style.display = 'none';

        try {
            const response = await fetch(`/api/links/favicon?url=${encodeURIComponent(url)}`);
            if (response.ok) {
                const faviconUrl = await response.text();
                img.src = faviconUrl;
                preview.style.display = 'block';
                status.textContent = '✅ Favicon найден!';
                this.selectedIcon = faviconUrl;
                this.selectedIconType = 'favicon';
            } else {
                status.textContent = '❌ Favicon не найден';
                preview.style.display = 'none';
            }
        } catch (error) {
            status.textContent = '❌ Ошибка получения favicon';
        }
    },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('❌ Файл слишком большой (макс. 2MB)');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('❌ Только изображения');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.customImageData = dataUrl;
            this.selectedIcon = '🔗';
            this.selectedIconType = 'custom';

            const preview = document.getElementById('customImagePreview');
            const img = document.getElementById('customImagePreviewImg');
            img.src = dataUrl;
            preview.style.display = 'block';
            showToast('✅ Изображение загружено');
        };
        reader.readAsDataURL(file);
    },

    removeCustomImage() {
        this.customImageData = null;
        this.selectedIcon = '🔗';
        this.selectedIconType = 'emoji';
        document.getElementById('customImagePreview').style.display = 'none';
        document.getElementById('customImageInput').value = '';
        document.querySelector('input[name="iconType"][value="emoji"]').checked = true;
        this.switchIconType('emoji');
    },

    selectIcon(icon) {
        this.selectedIcon = icon;
        this.selectedIconType = 'emoji';
        this.updateIconSelection();
        document.getElementById('customIcon').value = '';
        document.querySelector('input[name="iconType"][value="emoji"]').checked = true;
        this.switchIconType('emoji');
    },

    setCustomIcon(value) {
        if (value && value.trim()) {
            this.selectedIcon = value.trim();
            this.selectedIconType = 'emoji';
            this.updateIconSelection();
        }
    },

    updateIconSelection() {
        document.querySelectorAll('.icon-option').forEach(el => {
            const icon = el.textContent.trim();
            el.classList.toggle('selected', icon === this.selectedIcon);
        });
    },

    close() {
        console.log('LinksModal.close() called');
        const overlay = document.getElementById('linksModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
        this.isOpen = false;
        this.isEdit = false;
        this.editId = null;
        document.body.style.overflow = '';
    },

    // ===== ОТПРАВКА ФОРМЫ =====
    async submit(event) {
        event.preventDefault();

        const title = document.getElementById('linkTitle').value.trim();
        let url = document.getElementById('linkUrl').value.trim();

        if (!title) {
            showToast('❌ Введите название');
            document.getElementById('linkTitle').focus();
            return;
        }

        if (!url) {
            showToast('❌ Введите URL');
            document.getElementById('linkUrl').focus();
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        try { new URL(url); } catch (e) {
            showToast('❌ Неверный формат URL');
            document.getElementById('linkUrl').focus();
            return;
        }

        let icon = this.selectedIcon;
        let iconType = this.selectedIconType;
        let customImage = null;

        console.log('Submit with:', { icon, iconType, customImage: this.customImageData ? 'present' : 'null' });

        if (iconType === 'custom') {
            customImage = this.customImageData;
            icon = '🔗'; // Для custom используем дефолтную иконку
            console.log('Custom image mode, icon set to default');
        } else if (iconType === 'favicon') {
            if (icon && icon.startsWith('http')) {
                // Сохраняем URL favicon
                console.log('Favicon mode, icon:', icon);
            } else {
                icon = '🔗';
                iconType = 'emoji';
                console.log('Favicon not found, falling back to emoji');
            }
        } else {
            icon = icon || '🔗';
            iconType = 'emoji';
            console.log('Emoji mode, icon:', icon);
        }

        const payload = {
            pageId: this.pageId,
            title: title,
            url: url,
            icon: icon,
            iconType: iconType,
            customImage: customImage
        };

        console.log('Final payload:', payload);

        const submitBtn = document.getElementById('linksModalSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Сохранение...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/links/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                showToast(this.isEdit ? '✅ Ссылка обновлена' : '✅ Ссылка добавлена');
                this.close();

                if (typeof this._afterSubmitCallback === 'function') {
                    const callback = this._afterSubmitCallback;
                    this._afterSubmitCallback = null;
                    callback(data);
                }

                if (typeof this._afterSubmitCallback !== 'function') {
                    setTimeout(() => location.reload(), 500);
                }
            } else {
                const error = await response.text();
                console.error('Server error:', error);
                showToast('❌ Ошибка: ' + error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast('❌ Ошибка сохранения');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
};

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
function openAddLinkModal() {
    console.log('openAddLinkModal() called');
    if (typeof LinksModal !== 'undefined') {
        LinksModal.open();
    } else {
        console.error('LinksModal not defined');
        showToast('❌ Система ссылок не загружена');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('links-modal.js loaded');
    if (typeof currentPageId !== 'undefined' && currentPageId) {
        LinksModal.init(currentPageId);
    }
});

// Добавляем проверку, что LinksModal доступен глобально
console.log('✅ links-modal.js loaded. LinksModal available:', typeof LinksModal !== 'undefined');