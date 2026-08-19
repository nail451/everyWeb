/**
 * HEADER.JS - Навигация стрелками
 */

// ===== ПЕРЕХОД МЕЖДУ СТРАНИЦАМИ =====
function navigatePage(direction) {
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

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    updateNavigationArrows();

    // Обновляем стрелки при изменении URL (для SPA)
    window.addEventListener('popstate', updateNavigationArrows);
});