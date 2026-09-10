/**
 * PAGES.JS - Управление страницами
 */

// ============================================================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================

let pagesInfo = {};
let pendingPageId = null;
let pendingPageName = null;
let pendingRedirectUrl = null;

// ============================================================
// 2. ЗАГРУЗКА ИНФОРМАЦИИ О СТРАНИЦАХ
// ============================================================

async function loadPagesInfo() {
    try {
        const response = await fetch('/api/pages');
        if (response.ok) {
            const pages = await response.json();
            pagesInfo = {};
            pages.forEach(page => {
                pagesInfo[page.id] = page;
                pagesInfo[page.name] = page;
            });

            return pages;
        }
    } catch (error) {
    }
    return null;
}

function getPageInfo(pageId) {
    return pagesInfo[pageId] || null;
}

function getPageIdByName(name) {
    if (pagesInfo) {
        for (const key in pagesInfo) {
            const page = pagesInfo[key];
            if (page.name === name) {
                return page.id;
            }
        }
    }

    const pageLinks = document.querySelectorAll('.page-nav .nav-pages a');
    for (const link of pageLinks) {
        if (link.textContent.trim() === name) {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(/\/page\/(.+)/);
                if (match) return match[1];
            }
            return name;
        }
    }
    return null;
}

function pageHasPassword(pageId) {
    const page = getPageInfo(pageId);
    return page && page.hasPassword === true;
}

function isPageUnlocked(pageId) {
    return sessionStorage.getItem('page_unlocked_' + pageId) === 'true';
}

function unlockPage(pageId) {
    sessionStorage.setItem('page_unlocked_' + pageId, 'true');
}

function lockPage(pageId) {
    sessionStorage.removeItem('page_unlocked_' + pageId);
}

// ============================================================
// 3. СОЗДАНИЕ СТРАНИЦЫ
// ============================================================

function openCreatePageModal() {
    const overlay = document.getElementById('createPageOverlay');
    if (!overlay) {
        return;
    }

    overlay.style.display = 'none';
    overlay.classList.remove('active');

    const nameInput = document.getElementById('pageName');
    const passwordInput = document.getElementById('pagePassword');
    const errorEl = document.getElementById('createPageError');

    if (nameInput) nameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 100);
}

function closeCreatePageModal() {
    const overlay = document.getElementById('createPageOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function handleCreatePageSubmit(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const nameInput = document.getElementById('pageName');
    const passwordInput = document.getElementById('pagePassword');
    const errorEl = document.getElementById('createPageError');
    const submitBtn = document.querySelector('#createPageForm .btn-submit');

    const name = nameInput ? nameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!name) {
        showToast('❌ Введите название страницы');
        if (nameInput) nameInput.focus();
        return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
        showToast('❌ Используйте только буквы, цифры, - и _');
        if (nameInput) nameInput.focus();
        return;
    }

    const pageLinks = document.querySelectorAll('.page-nav .nav-pages a');
    for (const link of pageLinks) {
        if (link.textContent.trim().toLowerCase() === name.toLowerCase()) {
            showToast('❌ Страница с таким именем уже существует');
            if (nameInput) nameInput.focus();
            return;
        }
    }

    if (submitBtn) {
        submitBtn.textContent = '⏳ Создание...';
        submitBtn.disabled = true;
    }

    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    try {
        const response = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                password: password || null
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Unknown error');
        }

        const data = await response.json();
        showToast(`✅ Страница "${name}" создана${data.hasPassword ? ' 🔒 с паролем' : ''}`);

        closeCreatePageModal();

        await loadPagesInfo();

        if (typeof saveLastPage === 'function') {
            saveLastPage(name);
        }

        setTimeout(() => {
            window.location.href = '/page/' + encodeURIComponent(name);
        }, 300);

    } catch (error) {
        if (errorEl) {
            errorEl.textContent = '❌ ' + (error.message || 'Неизвестная ошибка');
            errorEl.style.display = 'block';
        }

        showToast('❌ Ошибка: ' + (error.message || 'Неизвестная ошибка'));

        if (submitBtn) {
            submitBtn.textContent = '➕ Создать';
            submitBtn.disabled = false;
        }
    }
}

// ============================================================
// 4. РЕДАКТИРОВАНИЕ СТРАНИЦЫ
// ============================================================

let editingPageId = null;
let editingPageHasPassword = false;
let editingPageOriginalName = null;

function openEditPageModal(pageId, pageName, hasPassword) {
    editingPageId = pageId;
    editingPageHasPassword = hasPassword;
    editingPageOriginalName = pageName;

    const overlay = document.getElementById('editPageOverlay');
    if (!overlay) return;

    document.getElementById('editPageName').value = pageName;
    document.getElementById('editPagePassword').value = '';
    document.getElementById('editPageRemovePassword').checked = false;

    const errorEl = document.getElementById('editPageError');
    errorEl.style.display = 'none';
    errorEl.textContent = '';

    const removeGroup = document.getElementById('editPageRemovePasswordGroup');
    const passwordInput = document.getElementById('editPagePassword');
    const passwordHint = document.getElementById('editPagePasswordHint');

    if (hasPassword) {
        removeGroup.style.display = 'block';
        passwordInput.placeholder = 'Оставьте пустым, чтобы не менять';
        passwordHint.textContent = '🔒 У страницы уже есть пароль';
    } else {
        removeGroup.style.display = 'none';
        passwordInput.placeholder = 'Введите пароль (опционально)';
        passwordHint.textContent = '🔓 Пароля нет, можно установить новый';
    }

    overlay.classList.add('active');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('editPageName').focus(), 100);
}

function closeEditPageModal() {
    const overlay = document.getElementById('editPageOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    editingPageId = null;
    editingPageHasPassword = false;
    editingPageOriginalName = null;
}

async function handleEditPageSubmit(event) {
    event.preventDefault();
    if (!editingPageId) return;

    const nameInput = document.getElementById('editPageName');
    const passwordInput = document.getElementById('editPagePassword');
    const removeCheck = document.getElementById('editPageRemovePassword');
    const errorEl = document.getElementById('editPageError');
    const submitBtn = document.querySelector('#editPageForm .btn-submit');

    const newName = nameInput.value.trim();
    const newPassword = passwordInput.value.trim();
    const removePassword = removeCheck.checked;

    if (!newName) {
        showToast('❌ Введите название');
        return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(newName)) {
        showToast('❌ Только буквы, цифры, - и _');
        return;
    }

    submitBtn.textContent = '⏳ Сохранение...';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
        const response = await fetch(`/api/pages/${editingPageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newName,
                password: newPassword || null,
                removePassword: removePassword
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Ошибка обновления');
        }

        const data = await response.json();
        showToast('✅ Страница обновлена');

        const nameChanged = newName !== editingPageOriginalName;

        closeEditPageModal();

        if (nameChanged) {
            setTimeout(() => {
                window.location.href = '/page/' + encodeURIComponent(data.name);
            }, 300);
        } else {
            setTimeout(() => window.location.reload(), 300);
        }
    } catch (error) {
        errorEl.textContent = '❌ ' + (error.message || 'Неизвестная ошибка');
        errorEl.style.display = 'block';
        submitBtn.textContent = '💾 Сохранить';
        submitBtn.disabled = false;
    }
}

// ============================================================
// 5. УДАЛЕНИЕ СТРАНИЦЫ
// ============================================================

async function deletePageById(pageId, pageName) {
    if (!confirm(`Удалить страницу "${pageName}"? Это действие нельзя отменить.`)) return;

    try {
        const response = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Ошибка удаления');

        showToast('✅ Страница удалена');

        const remainingPages = [...document.querySelectorAll('.page-nav .nav-pages a')]
            .filter(a => a.textContent.trim() !== pageName);

        setTimeout(async () => {
            if (typeof exitEditModeBeforeNavigate === 'function') {
                await exitEditModeBeforeNavigate();
            }
            if (remainingPages.length > 0) {
                window.location.href = remainingPages[0].getAttribute('href');
            } else {
                window.location.href = '/page/main';
            }
        }, 500);
    } catch (error) {
        showToast('❌ ' + error.message);
    }
}

// ============================================================
// 6. ОБРАБОТЧИКИ КНОПОК РЕДАКТИРОВАНИЯ/УДАЛЕНИЯ СТРАНИЦ
// ============================================================

function bindPageNavActions() {
    document.querySelectorAll('.page-edit-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pageId = parseInt(btn.dataset.pageId);
            const page = getPageInfo(pageId);
            if (page) {
                openEditPageModal(pageId, page.name, page.hasPassword);
            }
        };
    });

    document.querySelectorAll('.page-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pageId = parseInt(btn.dataset.pageId);
            const page = getPageInfo(pageId);
            if (page) {
                deletePageById(pageId, page.name);
            }
        };
    });

    document.querySelectorAll('.page-move-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pageId = parseInt(btn.dataset.pageId);
            const direction = btn.classList.contains('page-move-left') ? 'left' : 'right';
            movePageById(pageId, direction);
        };
    });

    updateMoveButtonsState();
}

function updateMoveButtonsState() {
    const navItems = document.querySelectorAll('.page-nav .nav-pages .page-nav-item');
    const total = navItems.length;

    navItems.forEach((item, index) => {
        const leftBtn = item.querySelector('.page-move-left');
        const rightBtn = item.querySelector('.page-move-right');

        if (leftBtn) {
            leftBtn.classList.toggle('disabled', index === 0);
        }
        if (rightBtn) {
            rightBtn.classList.toggle('disabled', index === total - 1);
        }
    });
}

async function movePageById(pageId, direction) {
    try {
        const response = await fetch(`/api/pages/${pageId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction })
        });

        if (!response.ok) {
            throw new Error('Ошибка перемещения');
        }

        showToast('✅ Порядок обновлен');
        setTimeout(() => {
            window.location.reload();
        }, 300);
    } catch (error) {
        showToast('❌ ' + error.message);
    }
}

// ============================================================
// 7. ПРОВЕРКА ПАРОЛЯ (МОДАЛЬНОЕ ОКНО)
// ============================================================

function openPasswordCheckModal(pageId, pageName, redirectUrl) {
    pendingPageId = pageId;
    pendingPageName = pageName;
    pendingRedirectUrl = redirectUrl;
    const overlay = document.getElementById('passwordCheckOverlay');
    if (!overlay) {
        return;
    }

    overlay.style.display = 'none';
    overlay.classList.remove('active');

    const pageNameSpan = document.getElementById('passwordPageName');
    if (pageNameSpan) pageNameSpan.textContent = pageName || 'страница';

    const passwordInput = document.getElementById('pagePasswordInput');
    if (passwordInput) passwordInput.value = '';

    const errorEl = document.getElementById('passwordError');
    if (errorEl) {
        errorEl.classList.remove('show');
        errorEl.textContent = '❌ Неверный пароль';
    }

    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (passwordInput) passwordInput.focus();
    }, 100);
}

function closePasswordCheckModal() {
    const overlay = document.getElementById('passwordCheckOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = '';

    const errorEl = document.getElementById('passwordError');
    if (errorEl) errorEl.classList.remove('show');
}

async function handlePasswordSubmit(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!pendingPageId) {
        showToast('❌ Ошибка: не найдена страница для перехода');
        closePasswordCheckModal();
        return;
    }

    let pageName = pendingPageName;
    if (!pageName) {
        const pageInfo = getPageInfo(pendingPageId);
        if (pageInfo) {
            pageName = pageInfo.name;
            pendingPageName = pageName;
        }
    }

    if (!pageName) {
        showToast('❌ Ошибка: имя страницы не найдено');
        closePasswordCheckModal();
        return;
    }

    const passwordInput = document.getElementById('pagePasswordInput');
    const errorEl = document.getElementById('passwordError');
    const submitBtn = document.querySelector('#passwordCheckForm .btn-submit');

    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!password) {
        if (passwordInput) passwordInput.focus();
        return;
    }

    if (submitBtn) {
        submitBtn.textContent = '⏳ Проверка...';
        submitBtn.disabled = true;
    }

    if (errorEl) errorEl.classList.remove('show');

    try {
        const response = await fetch(`/api/page/${pendingPageId}/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }

        const result = await response.json();
        if (result.valid) {
            unlockPage(pendingPageId);
            closePasswordCheckModal();

            showToast('✅ Пароль верный, переход...');

            let targetUrl = pendingRedirectUrl;
            if (!targetUrl) {
                targetUrl = '/page/' + encodeURIComponent(pageName);
            }

            if (typeof saveLastPage === 'function') {
                saveLastPage(pageName);
            }

            // Задержка чтобы тост успел отрисоваться, потом переход с выключением edit
            setTimeout(async () => {
                if (typeof exitEditModeBeforeNavigate === 'function') {
                    await exitEditModeBeforeNavigate();
                }
                window.location.href = targetUrl;
            }, 300);
        } else {
            if (errorEl) {
                errorEl.textContent = '❌ Неверный пароль';
                errorEl.classList.add('show');
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            showToast('❌ Неверный пароль');
        }
    } catch (error) {
        if (errorEl) {
            errorEl.textContent = '❌ Ошибка проверки пароля';
            errorEl.classList.add('show');
        }
        showToast('❌ Ошибка проверки пароля');
    } finally {
        if (submitBtn) {
            submitBtn.textContent = '🔓 Войти';
            submitBtn.disabled = false;
        }
    }
}

// ============================================================
// 8. НАВИГАЦИЯ
// ============================================================

function saveLastPage(pageName) {
    try {
        localStorage.setItem('everyweb_last_page', pageName);
    } catch (e) {
        // Игнорируем
    }
}

// ===== НАВИГАЦИЯ СТРЕЛКАМИ (пропускаем защищенные) =====
window.navigatePage = async function(direction) {
    const currentPageName = document.querySelector('.header .page-title span:last-child')?.textContent;
    if (!currentPageName) {
        return;
    }

    const pageLinks = document.querySelectorAll('.page-nav .nav-pages a');
    if (!pageLinks || pageLinks.length === 0) {
        return;
    }

    let currentIndex = -1;
    const pageNames = [];

    pageLinks.forEach((link, index) => {
        const name = link.textContent.trim();
        pageNames.push(name);
        if (link.classList.contains('active')) {
            currentIndex = index;
        }
    });

    if (currentIndex === -1) {
        return;
    }

    let newIndex = currentIndex;
    let attempts = 0;
    const maxAttempts = pageNames.length;
    let foundPage = null;

    do {
        if (direction === 'prev') {
            newIndex = (newIndex - 1 + pageNames.length) % pageNames.length;
        } else {
            newIndex = (newIndex + 1) % pageNames.length;
        }
        attempts++;

        const pageName = pageNames[newIndex];
        const pageId = getPageIdByName(pageName);

        if (pageId) {
            if (!pageHasPassword(pageId)) {
                foundPage = { name: pageName, id: pageId, link: pageLinks[newIndex] };
                break;
            }

            if (isPageUnlocked(pageId)) {
                foundPage = { name: pageName, id: pageId, link: pageLinks[newIndex] };
                break;
            }
        }
    } while (attempts < maxAttempts && newIndex !== currentIndex);

    if (foundPage && newIndex !== currentIndex) {
        const { name: pageName, id: pageId, link } = foundPage;

        if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
            const url = link.getAttribute('href');
            openPasswordCheckModal(pageId, pageName, url);
        } else {
            if (typeof saveLastPage === 'function') {
                saveLastPage(pageName);
            }
            await navigateWithEditModeExit(link.getAttribute('href'));
        }
    }
};

// ===== КЛИК ПО СТРАНИЦЕ В НАВИГАЦИИ =====
async function handlePageLinkClick(event, link) {
    event.preventDefault();

    const pageName = link.textContent.trim();
    const pageId = getPageIdByName(pageName);
    const url = link.getAttribute('href');

    if (!pageId) {
        await navigateWithEditModeExit(url);
        return;
    }

    if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
        openPasswordCheckModal(pageId, pageName, url);
    } else {
        if (typeof saveLastPage === 'function') {
            saveLastPage(pageName);
        }
        await navigateWithEditModeExit(url);
    }
}

// ============================================================
// 9. ПРОВЕРКА ПАРОЛЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

async function checkPagePasswordOnLoad() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) return;

    const pageId = parseInt(pageContainer.dataset.pageId);
    if (!pageId) return;

    if (Object.keys(pagesInfo).length === 0) {
        await loadPagesInfo();
    }

    if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
        const pageNameElement = document.querySelector('.header .page-title span:last-child');
        const pageName = pageNameElement ? pageNameElement.textContent : '';
        const currentUrl = window.location.href;

        setTimeout(() => {
            openPasswordCheckModal(pageId, pageName, currentUrl);
        }, 300);
    }
}

// ============================================================
// 10. ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Скрываем модальные окна
    const createOverlay = document.getElementById('createPageOverlay');
    if (createOverlay) {
        createOverlay.classList.remove('active');
        createOverlay.style.display = 'none';
    }

    const editOverlay = document.getElementById('editPageOverlay');
    if (editOverlay) {
        editOverlay.classList.remove('active');
        editOverlay.style.display = 'none';
    }

    const passwordOverlay = document.getElementById('passwordCheckOverlay');
    if (passwordOverlay) {
        passwordOverlay.classList.remove('active');
        passwordOverlay.style.display = 'none';
    }

    // Форма создания страницы
    const createForm = document.getElementById('createPageForm');
    if (createForm) {
        const newForm = createForm.cloneNode(true);
        createForm.parentNode.replaceChild(newForm, createForm);
        newForm.addEventListener('submit', function(e) {
            handleCreatePageSubmit(e);
        });
    }

    // Форма редактирования страницы
    const editForm = document.getElementById('editPageForm');
    if (editForm) {
        const newEditForm = editForm.cloneNode(true);
        editForm.parentNode.replaceChild(newEditForm, editForm);
        newEditForm.addEventListener('submit', function(e) {
            handleEditPageSubmit(e);
        });
    }

    // Форма проверки пароля
    const passwordForm = document.getElementById('passwordCheckForm');
    if (passwordForm) {
        const newPasswordForm = passwordForm.cloneNode(true);
        passwordForm.parentNode.replaceChild(newPasswordForm, passwordForm);
        newPasswordForm.addEventListener('submit', function(e) {
            handlePasswordSubmit(e);
        });
    }

    // Кнопки закрытия — создание
    const createPageCloseBtn = document.getElementById('createPageCloseBtn');
    if (createPageCloseBtn) {
        createPageCloseBtn.addEventListener('click', closeCreatePageModal);
    }
    const createPageCancelBtn = document.getElementById('createPageCancelBtn');
    if (createPageCancelBtn) {
        createPageCancelBtn.addEventListener('click', closeCreatePageModal);
    }

    // Кнопки закрытия — редактирование
    const editPageCloseBtn = document.getElementById('editPageCloseBtn');
    if (editPageCloseBtn) {
        editPageCloseBtn.addEventListener('click', closeEditPageModal);
    }
    const editPageCancelBtn = document.getElementById('editPageCancelBtn');
    if (editPageCancelBtn) {
        editPageCancelBtn.addEventListener('click', closeEditPageModal);
    }

    // Кнопки закрытия — пароль
    const passwordCheckCloseBtn = document.getElementById('passwordCheckCloseBtn');
    if (passwordCheckCloseBtn) {
        passwordCheckCloseBtn.addEventListener('click', closePasswordCheckModal);
    }
    const passwordCheckCancelBtn = document.getElementById('passwordCheckCancelBtn');
    if (passwordCheckCancelBtn) {
        passwordCheckCancelBtn.addEventListener('click', closePasswordCheckModal);
    }

    // Закрытие по клику на оверлей
    if (createOverlay) {
        createOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCreatePageModal();
            }
        });
    }

    if (editOverlay) {
        editOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditPageModal();
            }
        });
    }

    if (passwordOverlay) {
        passwordOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closePasswordCheckModal();
            }
        });
    }

    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('passwordCheckOverlay')?.classList.contains('active')) {
                closePasswordCheckModal();
            }
            if (document.getElementById('createPageOverlay')?.classList.contains('active')) {
                closeCreatePageModal();
            }
            if (document.getElementById('editPageOverlay')?.classList.contains('active')) {
                closeEditPageModal();
            }
        }
    });

    // Обработчики для кликов по страницам в навигации
    document.querySelectorAll('.page-nav .nav-pages a').forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', function(e) {
            handlePageLinkClick(e, this);
        });
    });

    // Загружаем информацию о страницах
    loadPagesInfo().then(() => {
        checkPagePasswordOnLoad();
        bindPageNavActions();
    });
});

// ============================================================
// ХЕЛПЕР: ПЕРЕХОД С ВЫКЛЮЧЕНИЕМ РЕЖИМА РЕДАКТИРОВАНИЯ
// ============================================================

async function navigateWithEditModeExit(targetUrl) {
    // Если функция выключения существует — вызываем
    if (typeof exitEditModeBeforeNavigate === 'function') {
        await exitEditModeBeforeNavigate();
    }
    window.location.href = targetUrl;
}

// ============================================================
// 11. ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ============================================================

window.createPage = openCreatePageModal;
window.openCreatePageModal = openCreatePageModal;
window.closeCreatePageModal = closeCreatePageModal;
window.handleCreatePageSubmit = handleCreatePageSubmit;
window.openPasswordCheckModal = openPasswordCheckModal;
window.closePasswordCheckModal = closePasswordCheckModal;
window.handlePasswordSubmit = handlePasswordSubmit;
window.saveLastPage = saveLastPage;
window.loadPagesInfo = loadPagesInfo;
window.getPageInfo = getPageInfo;
window.getPageIdByName = getPageIdByName;
window.pageHasPassword = pageHasPassword;
window.isPageUnlocked = isPageUnlocked;
window.unlockPage = unlockPage;
window.lockPage = lockPage;
window.checkPagePasswordOnLoad = checkPagePasswordOnLoad;
window.handlePageLinkClick = handlePageLinkClick;
window.openEditPageModal = openEditPageModal;
window.closeEditPageModal = closeEditPageModal;
window.deletePageById = deletePageById;
window.bindPageNavActions = bindPageNavActions;
window.navigateWithEditModeExit = navigateWithEditModeExit;
window.movePageById = movePageById;
window.updateMoveButtonsState = updateMoveButtonsState;