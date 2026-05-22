/**
 * Контекстное меню для yaplakal.com
 * Все обработчики и логика рендеринга вынесены сюда
 * Стили вынесены в отдельный CSS-файл плагина
 */
let CTX_TARGET = null;

// ============================================
// 🔧 КОНФИГУРАЦИЯ МЕНЮ
// ============================================
//        { label: 'Скрыть сообщения пользователя', action: hideThisUser },

let CONTEXT_MENU = {
    // Пример: действия над пользователем
    user_actions: [
        { label: 'Перейти в профиль', action: openUserProfile },
        { label: 'Показать только сообщения пользователя', action: filterByThisUser }
    ],

    user_filter_only: [{ label: 'Показать только сообщения пользователя', action: filterByCitateAutor }],
    check_update: [{ label: 'Проверить обновление (v' + manifest.version + ')', action: checkUpdate }],
    
    // Пример: действия над сообщением
    post_actions: [
        { label: 'Цитировать', action: quotePost },
        { label: 'Пожаловаться', action: reportPost },
        { label: 'Копировать ссылку', action: copyPostLink }
    ],
    
    // Пример: общие действия
    common_actions: [
        { label: 'Обновить страницу', action: () => location.reload() },
        { label: 'Скрыть меню', action: hideAllMenus }
    ]
};

// ============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ============================================
function initContextMenu() {
    // Создаём подложку (для закрытия меню по клику вне)
    if (!document.querySelector('.ctxm-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'ctxm-overlay';
        overlay.id = 'ctxm-overlay';
        overlay.addEventListener('click', hideAllMenus);
        overlay.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            hideAllMenus();
        });
        document.body.appendChild(overlay);
    }

    // Глобальный обработчик правого клика
    document.addEventListener('contextmenu', handleRightClick);
    
    console.log('✅ Context menu initialized');
}

// ============================================
// 🖱️ ОБРАБОТКА КЛИКА ПРАВОЙ КНОПКОЙ
// ============================================
function handleRightClick(e) {
    CTX_TARGET = e.target;
    //console.log(CTX_TARGET);

    const target = e.target;
    const menuType = target.getAttribute('ctxm');
    
    // Если у элемента нет атрибута ctxm или тип не определён — выходим
    if (!menuType || !CONTEXT_MENU[menuType]) {
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Скрываем все открытые меню перед показом нового
    hideAllMenus();
    
    // Показываем нужное меню
    showMenu(menuType, e.clientX, e.clientY);
}

// ============================================
// 📦 РЕНДЕРИНГ МЕНЮ
// ============================================
function showMenu(menuType, x, y) {
    let menu = document.getElementById('ctxm-' + menuType);
    
    // Если меню ещё нет в DOM — создаём
    if (!menu) {
        menu = createMenuElement(menuType);
        document.body.appendChild(menu);
    }
    
    // Позиционируем меню (с учётом краёв экрана)
    positionMenu(menu, x, y);
    
    // Показываем меню и подложку
    menu.style.display = 'block';
    document.getElementById('ctxm-overlay').style.display = 'block';
}

function createMenuElement(menuType) {
    const menu = document.createElement('div');
    menu.id = 'ctxm-' + menuType;
    menu.className = 'ctxm-menu';
    
    const items = CONTEXT_MENU[menuType];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Разделитель перед элементом, если нужно
        if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'ctxm-separator';
            menu.appendChild(sep);
        }
        
        const el = document.createElement('div');
        el.className = 'ctxm-item';
        el.textContent = item.label;
        
        // Привязываем обработчик клика
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            hideAllMenus();
            if (typeof item.action === 'function') {
                // Передаём в функцию контекст: целевой элемент и тип меню
                item.action({ 
                    target: document.querySelector('[ctxm="' + menuType + '"]'),
                    menuType: menuType,
                    event: e
                });
            }
        });
        
        menu.appendChild(el);
    }
    
    return menu;
}

// ============================================
// 📐 ПОЗИЦИОНИРОВАНИЕ МЕНЮ
// ============================================
function positionMenu(menu, x, y) {
    const padding = 5;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const menuW = menu.offsetWidth || 220;
    const menuH = menu.offsetHeight || 100;
    
    // По умолчанию — меню справа-снизу от курсора
    let left = x + padding;
    let top = y + padding;
    
    // Если не влезает справа — сдвигаем влево от курсора
    if (left + menuW > viewportW) {
        left = x - menuW - padding;
    }
    
    // Если не влезает снизу — сдвигаем вверх
    if (top + menuH > viewportH) {
        top = y - menuH - padding;
    }
    
    // Гарантируем, что меню не уйдёт за край экрана
    left = Math.max(padding, Math.min(left, viewportW - menuW - padding));
    top = Math.max(padding, Math.min(top, viewportH - menuH - padding));
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

// ============================================
// 🙈 СКРЫТИЕ МЕНЮ
// ============================================
function hideAllMenus() {
    // Скрываем все меню по классу
    const menus = document.querySelectorAll('.ctxm-menu');
    for (let i = 0; i < menus.length; i++) {
        menus[i].style.display = 'none';
    }
    // Скрываем подложку
    const overlay = document.getElementById('ctxm-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ============================================
// 🧩 ФУНКЦИИ
// ============================================
function filterByThisUser(ctx) 
{
    //console.log(CTX_TARGET.closest('table').getAttribute('data-nik-name'));
    localStorage.setItem('filtered_nik_name', CTX_TARGET.closest('table').getAttribute('data-nik-name'));
    window.scrollTo(0, 0);
    location.reload();
}

function filterByCitateAutor(ctx) 
{
    localStorage.setItem('filtered_nik_name', CTX_TARGET.innerText.match(/(?<=\().+?(?= @)/)[0].trim());
    window.scrollTo(0, 0);
    location.reload();
}

function toPrivatMail(ctx)
{
    const tbl = CTX_TARGET.closest('table');
    if(tbl)
    {
        const pm_link = tbl.querySelector('a.search_pm');
        if(pm_link) pm_link.click();
    }
}

function checkUpdate(ctx)
{
    const a = document.createElement('a');
    a.href = manifest.homepage_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    a.remove();
}

function hideThisUser(ctx) {
    //console.log('🙈 hideThisUser', ctx);
}

function openUserProfile(ctx) {
//    window.location = CTX_TARGET.parentElement.href;
    window.open(CTX_TARGET.parentElement.href, '_blank')
}

function quotePost(ctx) {
//    console.log('💬 quotePost', ctx);
}

function reportPost(ctx) {
//    console.log('⚠️ reportPost', ctx);
}

function copyPostLink(ctx) {
    /*console.log('🔗 copyPostLink', ctx);
    const url = ctx.target.getAttribute('data-post-url') || location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
    }*/
}

// ============================================
// 🎬 ЗАПУСК
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContextMenu);
} else {
    initContextMenu();
}

// ============================================
// Метка ПКМ
// ============================================

const TARGET_CLASS = 'has-context-menu';
const tooltip = document.createElement('div');

// Вместо Object.assign(...) просто задаём класс
tooltip.className = 'ext-ctx-tooltip';
tooltip.textContent = 'ПКМ';
document.body.appendChild(tooltip);

let activeElement = null;

document.addEventListener('mouseover', (e) => {
  const target = e.target.closest(`.${TARGET_CLASS}`);
  if (target && target !== activeElement) {
    activeElement = target;
    tooltip.style.opacity = '1';
  }
});

document.addEventListener('mouseout', (e) => {
  const isStillOnTarget = e.relatedTarget?.closest(`.${TARGET_CLASS}`);
  if (activeElement && !isStillOnTarget) {
    activeElement = null;
    tooltip.style.opacity = '0';
  }
});

document.addEventListener('mousemove', (e) => {
  if (activeElement) {
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
  }
});

