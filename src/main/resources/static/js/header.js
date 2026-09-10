/**
 * HEADER.JS - Навигация стрелками
 */

// ===== ОБНОВЛЕНИЕ СТРЕЛОК =====
function updateNavigationArrows() {
    if (typeof updateNavArrows === 'function') {
        updateNavArrows();
        return;
    }
    // fallback
    const prevArrow = document.getElementById('prevPageArrow');
    const nextArrow = document.getElementById('nextPageArrow');
    const pageLinks = document.querySelectorAll('.page-nav .nav-pages a');
    if (!prevArrow || !nextArrow) return;
    if (pageLinks.length <= 1) {
        prevArrow.classList.add('disabled');
        nextArrow.classList.add('disabled');
    } else {
        prevArrow.classList.remove('disabled');
        nextArrow.classList.remove('disabled');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    updateNavigationArrows();

    const prevArrow = document.getElementById('prevPageArrow');
    const nextArrow = document.getElementById('nextPageArrow');

    if (prevArrow) {
        prevArrow.addEventListener('click', () => navigatePage('prev'));
    }
    if (nextArrow) {
        nextArrow.addEventListener('click', () => navigatePage('next'));
    }

    window.addEventListener('popstate', updateNavigationArrows);
});