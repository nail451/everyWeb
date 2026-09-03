/**
 * HEADER.JS - Навигация стрелками
 */

// ===== ПЕРЕХОД МЕЖДУ СТРАНИЦАМИ =====
function navigatePage(direction) {
    console.log('Navigate:', direction);

    const currentPageName = document.querySelector('.header .page-title span:last-child')?.textContent;
    if (!currentPageName) return;

    // Получаем список всех страниц из навигации
    const pageLinks = document.querySelectorAll('.page-nav a');
    if (!pageLinks || pageLinks.length === 0) return;

    // Находим текущую страницу
    let currentIndex = -1;
    pageLinks.forEach((link, index) => {
        if (link.classList.contains('active')) {
            currentIndex = index;
        }
    });

    if (currentIndex === -1) return;

    // Вычисляем новую страницу
    let newIndex;
    if (direction === 'prev') {
        newIndex = (currentIndex - 1 + pageLinks.length) % pageLinks.length;
    } else {
        newIndex = (currentIndex + 1) % pageLinks.length;
    }

    // Переходим на новую страницу
    const newPage = pageLinks[newIndex];
    if (newPage) {
        const pageName = newPage.textContent.trim();
        // Сохраняем страницу перед переходом
        if (typeof saveLastPage === 'function') {
            saveLastPage(pageName);
        }
        window.location.href = newPage.href;
    }
}

// ===== ОБНОВЛЕНИЕ СТРЕЛОК =====
function updateNavigationArrows() {
    const pageLinks = document.querySelectorAll('.page-nav a');
    const prevArrow = document.querySelector('.page-navigation.prev');
    const nextArrow = document.querySelector('.page-navigation.next');

    if (!prevArrow || !nextArrow) return;

    if (!pageLinks || pageLinks.length <= 1) {
        prevArrow.classList.add('disabled');
        nextArrow.classList.add('disabled');
        return;
    }

    prevArrow.classList.remove('disabled');
    nextArrow.classList.remove('disabled');
}

function saveLastPage(pageName) {
    try {
        localStorage.setItem('everyweb_last_page', pageName);
        console.log('Saved last page:', pageName);
    } catch (e) {
        // Игнорируем ошибки localStorage
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Header initialized');
    updateNavigationArrows();

    window.addEventListener('popstate', updateNavigationArrows);
});