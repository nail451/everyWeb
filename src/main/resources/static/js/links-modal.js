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

    icons: [
        '🔗', '🌐', '📧', '📱', '💻', '🖥️', '📚', '📖', '🎮', '🎵',
        '📷', '🎨', '🏠', '🏢', '🏫', '🏪', '🏛️', '🏗️', '🚀', '⭐',
        '🔥', '💡', '🎯', '📌', '📍', '🔖', '📎', '✏️', '📝', '📋',
        '📊', '📈', '📉', '💎', '🔮', '🎪', '🎭', '🎫', '🏆', '🥇'
    ],

    init(pageId) {
        this.pageId = pageId;
        this.createModal();
        this.bindEvents();
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
    },

    // ===== ОТКРЫТИЕ ДЛЯ ДОБАВЛЕНИЯ =====
    open() {
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

        this.isEdit = true;
        this.editId = link.id;
        this.setModalTitle('✏️ Редактировать ссылку');
        this.setSubmitButtonText('💾 Сохранить');

        // Заполняем форму данными
        this.fillForm(link);

        // Показываем модальное окно
        this.showModal();
    },

    showModal() {
        const overlay = document.getElementById('linksModalOverlay');
        if (!overlay) {
            this.createModal();
            const newOverlay = document.getElementById('linksModalOverlay');
            if (newOverlay) newOverlay.classList.add('active');
        } else {
            overlay.classList.add('active');
        }

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
        document.getElementById('linkTitle').value = link.title || '';
        document.getElementById('linkUrl').value = link.url || '';

        const iconType = link.iconType || 'emoji';
        const icon = link.icon || '🔗';
        const customImage = link.customImage || null;

        // Устанавливаем тип
        this.selectedIconType = iconType;
        document.querySelectorAll('input[name="iconType"]').forEach(el => {
            el.checked = (el.value === iconType);
        });
        this.switchIconType(iconType);

        if (iconType === 'custom' && customImage) {
            this.customImageData = customImage;
            this.selectedIcon = '🔗';
            const preview = document.getElementById('customImagePreview');
            const img = document.getElementById('customImagePreviewImg');
            img.src = customImage;
            preview.style.display = 'block';
            document.getElementById('customImageInput').value = '';
        } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
            this.selectedIcon = icon;
            const preview = document.getElementById('faviconPreview');
            const img = document.getElementById('faviconImg');
            img.src = icon;
            preview.style.display = 'block';
            document.getElementById('faviconStatus').textContent = '✅ Favicon загружен';
        } else {
            this.selectedIcon = icon;
            this.updateIconSelection();
            document.getElementById('customIcon').value = '';
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

        document.querySelector('input[name="iconType"][value="emoji"]').checked = true;
        this.switchIconType('emoji');
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

    switchIconType(type) {
        this.selectedIconType = type;

        document.getElementById('emojiPicker').style.display = type === 'emoji' ? 'block' : 'none';
        document.getElementById('faviconPicker').style.display = type === 'favicon' ? 'block' : 'none';
        document.getElementById('customImagePicker').style.display = type === 'custom' ? 'block' : 'none';

        if (type === 'custom') {
            document.getElementById('faviconStatus').textContent = 'Введите URL и нажмите кнопку';
            document.getElementById('faviconPreview').style.display = 'none';
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
        const overlay = document.getElementById('linksModalOverlay');
        if (overlay) overlay.classList.remove('active');
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

        if (iconType === 'custom') {
            customImage = this.customImageData;
            icon = '🔗';
        } else if (iconType === 'favicon') {
            if (icon && icon.startsWith('http')) {
                // OK
            } else {
                icon = '🔗';
                iconType = 'emoji';
            }
        } else {
            icon = icon || '🔗';
            iconType = 'emoji';
        }

        const payload = {
            pageId: this.pageId,
            title: title,
            url: url,
            icon: icon,
            iconType: iconType,
            customImage: customImage
        };

        const submitBtn = document.getElementById('linksModalSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Сохранение...';
        submitBtn.disabled = true;

        try {
            let response;
            if (this.isEdit && this.editId) {
                response = await fetch(`/api/links/${this.editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`/api/links/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                const data = await response.json();
                showToast(this.isEdit ? '✅ Ссылка обновлена' : '✅ Ссылка добавлена');
                this.close();
                setTimeout(() => location.reload(), 500);
            } else {
                const error = await response.text();
                showToast('❌ Ошибка: ' + error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            showToast('❌ Ошибка сохранения');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
};

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
function openAddLinkModal() {
    if (typeof LinksModal !== 'undefined') {
        LinksModal.open();
    } else {
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    if (typeof currentPageId !== 'undefined' && currentPageId) {
        LinksModal.init(currentPageId);
    }
});