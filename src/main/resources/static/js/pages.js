/**
 * PAGES.JS - Управление страницами
 * Версия: 2.3 - исправлена проблема с null при переходе
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
            console.log('📋 Pages info loaded:', pages);

            pagesInfo = {};
            pages.forEach(page => {
                pagesInfo[page.id] = page;
                pagesInfo[page.name] = page;
            });

            return pages;
        }
    } catch (error) {
        console.error('❌ Error loading pages info:', error);
    }
    return null;
}

function getPageInfo(pageId) {
    return pagesInfo[pageId] || null;
}

function getPageIdByName(name) {
    // Сначала ищем в кэше
    if (pagesInfo) {
        for (const key in pagesInfo) {
            const page = pagesInfo[key];
            if (page.name === name) {
                return page.id;
            }
        }
    }

    // Fallback: ищем в навигации
    const pageLinks = document.querySelectorAll('.page-nav a');
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
    console.log('🔓 Page unlocked:', pageId);
}

function lockPage(pageId) {
    sessionStorage.removeItem('page_unlocked_' + pageId);
    console.log('🔒 Page locked:', pageId);
}

// ============================================================
// 3. СОЗДАНИЕ СТРАНИЦЫ
// ============================================================

function openCreatePageModal() {
    console.log('🔵 openCreatePageModal called');

    const overlay = document.getElementById('createPageOverlay');
    if (!overlay) {
        console.error('❌ createPageOverlay not found');
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
    console.log('🔵 closeCreatePageModal called');

    const overlay = document.getElementById('createPageOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function handleCreatePageSubmit(event) {
    console.log('🔵 handleCreatePageSubmit called');

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

    // Проверяем, что страница с таким именем не существует
    const pageLinks = document.querySelectorAll('.page-nav a');
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
        console.log('✅ Page created:', data);

        showToast(`✅ Страница "${name}" создана${data.hasPassword ? ' 🔒 с паролем' : ''}`);

        closeCreatePageModal();

        // Обновляем информацию о страницах
        await loadPagesInfo();

        if (typeof saveLastPage === 'function') {
            saveLastPage(name);
        }

        setTimeout(() => {
            window.location.href = '/page/' + encodeURIComponent(name);
        }, 300);

    } catch (error) {
        console.error('❌ Creation failed:', error);

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
// 4. ПРОВЕРКА ПАРОЛЯ (МОДАЛЬНОЕ ОКНО)
// ============================================================

function openPasswordCheckModal(pageId, pageName, redirectUrl) {
    console.log('🔵 openPasswordCheckModal called:', { pageId, pageName, redirectUrl });

    // ВАЖНО: Сохраняем ВСЕ данные для перехода
    pendingPageId = pageId;
    pendingPageName = pageName;
    pendingRedirectUrl = redirectUrl;

    console.log('📌 Pending data set:', {
        pageId: pendingPageId,
        pageName: pendingPageName,
        redirectUrl: pendingRedirectUrl
    });

    const overlay = document.getElementById('passwordCheckOverlay');
    if (!overlay) {
        console.error('❌ passwordCheckOverlay not found');
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
    console.log('🔵 closePasswordCheckModal called');

    const overlay = document.getElementById('passwordCheckOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = '';

    // НЕ ОЧИЩАЕМ pending данные при закрытии, чтобы они остались для перехода
    // pendingPageId = null;
    // pendingPageName = null;
    // pendingRedirectUrl = null;

    const errorEl = document.getElementById('passwordError');
    if (errorEl) errorEl.classList.remove('show');
}

async function handlePasswordSubmit(event) {
    console.log('🔵 handlePasswordSubmit called');

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Проверяем, что у нас есть данные для перехода
    if (!pendingPageId) {
        console.error('❌ No pending page ID');
        showToast('❌ Ошибка: не найдена страница для перехода');
        closePasswordCheckModal();
        return;
    }

    // Получаем имя страницы из pending данных или из кэша
    let pageName = pendingPageName;
    if (!pageName) {
        // Пытаемся получить из кэша по ID
        const pageInfo = getPageInfo(pendingPageId);
        if (pageInfo) {
            pageName = pageInfo.name;
            pendingPageName = pageName;
        }
    }

    if (!pageName) {
        console.error('❌ No page name found for ID:', pendingPageId);
        showToast('❌ Ошибка: имя страницы не найдено');
        closePasswordCheckModal();
        return;
    }

    console.log('📌 Processing password for page:', { id: pendingPageId, name: pageName });

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
        console.log('🔐 Password check result:', result);

        if (result.valid) {
            // Пароль правильный - запоминаем в сессии
            unlockPage(pendingPageId);
            closePasswordCheckModal();

            showToast('✅ Пароль верный, переход...');

            // Формируем URL для перехода
            let targetUrl = pendingRedirectUrl;
            if (!targetUrl) {
                targetUrl = '/page/' + encodeURIComponent(pageName);
            }

            console.log('🔀 Redirecting to:', targetUrl);

            // Сохраняем последнюю страницу
            if (typeof saveLastPage === 'function') {
                saveLastPage(pageName);
            }

            // Переходим на страницу
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);

        } else {
            // Неверный пароль
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
        console.error('❌ Password check error:', error);
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
// 5. НАВИГАЦИЯ
// ============================================================

function saveLastPage(pageName) {
    try {
        localStorage.setItem('everyweb_last_page', pageName);
        console.log('💾 Saved last page:', pageName);
    } catch (e) {
        // Игнорируем
    }
}

// ===== НАВИГАЦИЯ СТРЕЛКАМИ (пропускаем защищенные) =====
window.navigatePage = function(direction) {
    console.log('🔵 navigatePage called:', direction);

    const currentPageName = document.querySelector('.header .page-title span:last-child')?.textContent;
    if (!currentPageName) {
        console.warn('⚠️ Current page name not found');
        return;
    }

    const pageLinks = document.querySelectorAll('.page-nav a');
    if (!pageLinks || pageLinks.length === 0) {
        console.warn('⚠️ No page links found');
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
        console.warn('⚠️ Current page not found in navigation');
        return;
    }

    // Ищем следующую доступную страницу (пропускаем защищенные)
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
            // Проверяем, есть ли пароль
            if (!pageHasPassword(pageId)) {
                foundPage = { name: pageName, id: pageId, link: pageLinks[newIndex] };
                break;
            }

            // С паролем - проверяем, не введен ли уже
            if (isPageUnlocked(pageId)) {
                foundPage = { name: pageName, id: pageId, link: pageLinks[newIndex] };
                break;
            }

            // Требуется пароль - продолжаем поиск
            console.log(`🔒 Page "${pageName}" requires password, skipping...`);
        }
    } while (attempts < maxAttempts && newIndex !== currentIndex);

    if (foundPage && newIndex !== currentIndex) {
        const { name: pageName, id: pageId, link } = foundPage;

        if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
            const url = link.getAttribute('href');
            // ПЕРЕДАЕМ ВСЕ ДАННЫЕ: ID, имя, URL
            openPasswordCheckModal(pageId, pageName, url);
        } else {
            if (typeof saveLastPage === 'function') {
                saveLastPage(pageName);
            }
            window.location.href = link.getAttribute('href');
        }
    }
};

// ===== КЛИК ПО СТРАНИЦЕ В НАВИГАЦИИ =====
function handlePageLinkClick(event, link) {
    event.preventDefault();

    const pageName = link.textContent.trim();
    const pageId = getPageIdByName(pageName);
    const url = link.getAttribute('href');

    console.log('🔵 Page link clicked:', { pageName, pageId, url });

    if (!pageId) {
        // Если не можем определить ID - просто переходим
        window.location.href = url;
        return;
    }

    if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
        // Требуется пароль - ПЕРЕДАЕМ ВСЕ ДАННЫЕ
        openPasswordCheckModal(pageId, pageName, url);
    } else {
        // Свободный доступ
        if (typeof saveLastPage === 'function') {
            saveLastPage(pageName);
        }
        window.location.href = url;
    }
}

// ============================================================
// 6. ПРОВЕРКА ПАРОЛЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

async function checkPagePasswordOnLoad() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) return;

    const pageId = parseInt(pageContainer.dataset.pageId);
    if (!pageId) return;

    console.log('🔍 Checking password for page:', pageId);

    // Проверяем, есть ли у страницы пароль
    if (Object.keys(pagesInfo).length === 0) {
        await loadPagesInfo();
    }

    if (pageHasPassword(pageId) && !isPageUnlocked(pageId)) {
        console.log('🔒 Page is locked, showing password modal');

        const pageNameElement = document.querySelector('.header .page-title span:last-child');
        const pageName = pageNameElement ? pageNameElement.textContent : '';

        console.log('📌 Page name from header:', pageName);

        // Получаем текущий URL
        const currentUrl = window.location.href;

        setTimeout(() => {
            // ПЕРЕДАЕМ ВСЕ ДАННЫЕ: ID, имя, URL
            openPasswordCheckModal(pageId, pageName, currentUrl);
        }, 300);
    } else if (pageHasPassword(pageId) && isPageUnlocked(pageId)) {
        console.log('🔓 Page is unlocked');
    }
}

// ============================================================
// 7. ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Pages.js initialized');

    // Скрываем модальные окна
    const createOverlay = document.getElementById('createPageOverlay');
    if (createOverlay) {
        createOverlay.classList.remove('active');
        createOverlay.style.display = 'none';
    }

    const passwordOverlay = document.getElementById('passwordCheckOverlay');
    if (passwordOverlay) {
        passwordOverlay.classList.remove('active');
        passwordOverlay.style.display = 'none';
    }

    // Привязываем обработчик формы создания страницы
    const createForm = document.getElementById('createPageForm');
    if (createForm) {
        const newForm = createForm.cloneNode(true);
        createForm.parentNode.replaceChild(newForm, createForm);
        newForm.addEventListener('submit', function(e) {
            console.log('📩 Create form submit');
            handleCreatePageSubmit(e);
        });
    }

    // Привязываем обработчик формы проверки пароля
    const passwordForm = document.getElementById('passwordCheckForm');
    if (passwordForm) {
        const newPasswordForm = passwordForm.cloneNode(true);
        passwordForm.parentNode.replaceChild(newPasswordForm, passwordForm);
        newPasswordForm.addEventListener('submit', function(e) {
            console.log('📩 Password form submit');
            handlePasswordSubmit(e);
        });
    }

    // Кнопки закрытия
    const createPageCloseBtn = document.getElementById('createPageCloseBtn');
    if (createPageCloseBtn) {
        createPageCloseBtn.addEventListener('click', closeCreatePageModal);
    }

    const createPageCancelBtn = document.getElementById('createPageCancelBtn');
    if (createPageCancelBtn) {
        createPageCancelBtn.addEventListener('click', closeCreatePageModal);
    }

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
        }
    });

    // Обработчики для кликов по страницам в навигации
    document.querySelectorAll('.page-nav a').forEach(link => {
        // Удаляем старые обработчики
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', function(e) {
            handlePageLinkClick(e, this);
        });
    });

    // Загружаем информацию о страницах
    loadPagesInfo().then(() => {
        // Проверяем пароль текущей страницы
        checkPagePasswordOnLoad();
    });

    console.log('✅ Pages.js initialization complete');
});

// ============================================================
// 8. ГЛОБАЛЬНЫЕ ФУНКЦИИ
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

console.log('✅ pages.js 2.3 loaded');