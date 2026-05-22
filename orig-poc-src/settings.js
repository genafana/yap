// settings.js

function getManifestData() {
  // Пробуем стандартный Chrome API
  if (typeof chrome?.runtime?.getManifest === 'function') {
    return chrome.runtime.getManifest();
  }
  // Пробуем Firefox/Browser API
  if (typeof browser?.runtime?.getManifest === 'function') {
    return browser.runtime.getManifest();
  }
  // Фолбэк, если ничего не сработало
  console.warn('API для чтения манифеста недоступно');
  return null;
}

const manifest = getManifestData();
/*if (manifest) {
  console.log('Версия:', manifest.version);
  console.log('Homepage:', manifest.homepage_url);
}*/

CONFIG = {};

let CONF_DEFAULT = {
    left_col_width: {
        ru: 'Ширина левого столбца',
        type: 'string',
        value: "9em",
        description: '<a target="_blank" rel="noopener noreferrer" href="https://learn.javascript.ru/css-units">Единицы измерения в CSS</a>'
    },
    left_col_right_border: {
        ru: 'Вертикальная линия левого столбца',
        type: 'string',
        value: "1px solid silver",
        description: 'Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a> <a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
    },
    hor_separate_border: {
        ru: 'Горизонтальная линия - разделитель сообщений',
        type: 'string',
        value: "1px ridge silver",
        description: 'Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a>'
    },
    user_pic_size: {
        ru: 'Размер аватарки в пикселях',
        type: 'integer',
        value: 70,
        description: 'Чем больше число, тем больше размер аватарки, понятное дело'
    },
    nik_on_top: {
        ru: 'Ник над аватаркой',
        type: 'boolean',
        value: true,
        description: 'При включенной галочке ник выводится в ленте над аватаркой пользователя, при отключенной - под ней.'
    },
    show_date_or_age: {
        ru: 'Дата регистрации или возраст на сайте',
        type: 'enum',
        value: "date",
        values: ['date', 'age'],
        labels: { ru: ['дата', 'возраст'] },
        description: 'Вид вывода информации по пользователю'
    },
    self_highlight_bg: {
        ru: 'Фон в левом столбце в собственных сообщениях',
        type: 'string',
        value: "Gainsboro",
        description: 'При пустом значении выделения фоном нет. <a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
    },
    self_highlight_border: {
        ru: 'Линия-граница в левом столбце в собственных сообщениях',
        type: 'string',
        value: "1px solid silver",
        description: 'При пустом значении границы нет. Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a>'
    },
    title_bg_color: {
        ru: 'Цвет фона строки-заголовка сообщения и левого столбца',
        type: 'string',
        value: "#FAF8F8",
        description: '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
    },
    message_bg_color: {
        ru: 'Цвет фона сообщения',
        type: 'string',
        value: "white",
        description: '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
    },
    citate_bg_color: {
        ru: 'Цвет фона цитаты в сообщении',
        type: 'string',
        value: "white",
        description: '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
    },
    msg_menu_type: {
        ru: 'Тип меню в сообщениях',
        type: 'enum',
        value: "icon",
        values: ['icon', 'text'],
        labels: { ru: ['иконки', 'текст'] },
        description: ''
    },
    reduce_ad_block: {
        ru: 'Уменьшить ширину правого столбца',
        type: 'boolean',
        value: false,
        description: 'При включенной галочке уменьшение ширины на 20%. Для широких мониторов не актуально.'
    },
    origin_scroll_top: {
        ru: 'Появляющаяся оригинальная ссылка "Наверх"',
        type: 'enum',
        value: "",
        values: ['', 'hide', 'moveleft'],
        labels: { ru: ['оставить как есть', 'скрыть', 'переместить ближе к столбцу сообщений'] },
        description: ''
    },
    apply_context_menu: {
        ru: 'Использовать контекстное меню по ПКМ',
        type: 'boolean',
        value: true,
        description: 'Включение/отключение контекстного меню в ленте сообщений по правой кнопке мыши'
    },
    privat_mail_type: {
        ru: 'Тип меню "написать в личку"',
        type: 'enum',
        value: 'msg_menu',
        values: ['msg_menu', 'avatar_rkm'],
        labels: { ru: ['в меню сообщения', 'ПКМ на аватаре'] },
        description: 'Способ вызхова страницы "лички". При выборе "ПКМ на аватаре" переход в "личку" в контекстном меню по ПКМ, за счет чего уменьшается "меню сообщений" (и меньше отвлекает от самой ленты). Настройка игнорируется, если "контекстное меню по ПКМ" отключено.'
    },
    response_form: {
        ru: 'Форма быстрого ответа (ФБО)',
        type: 'enum',
        value: "always",
        values: ['always', 'toggle'],
        labels: { ru: ['есть всегда', 'скрыть/отобразить по кнопке'] },
        description: 'В режиме "скрыть/отобразить по кнопке" не занимает место на экране в скрытом виде'
    },
    smilies_show_all: {
        ru: 'Показывать все смайлики непосредственно на ФБО',
        type: 'enum',
        value: "always",
        values: ['always', 'simple', ''],
        labels: { ru: ['всегда', 'только для простой формы', 'нет'] },
        description: 'Если выбрано "нет", используется стандартный функционал сайта'
    },
    smilies_text: {
        ru: 'Показывать текстовый эквивалент смайлика',
        type: 'enum',
        value: "title",
        values: ['bottom', 'title', ''],
        labels: { ru: ['снизу', 'всплывающая подсказка', 'нет'] },
        description: 'Настройка используется для включенного режима показа смайликов'
    },
    smilies_columns: {
        ru: 'Кол-во столбцов при выводе смайликов на ФБО',
        type: 'enum',
        value: 2,
        values: ['2', '3', '4', '5'],
        labels: { ru: ['2', '3', '4', '5'] },
        description: 'Четыре или пять столбцов - скорее для широких мониторов'
    }
};                       


async function loadConfig() 
{
    try 
    {              
        let conf_raw = localStorage.getItem('yap_plugin_conf_klassika');
        if( conf_raw )
        {
            CONFIG = JSON.parse(conf_raw);
            console.log(CONFIG);
            console.log('Настройки прочитаны из localStorage');
        }
        else
        {
            const url = chrome.runtime.getURL('config.json');
            const response = await fetch(url);

            if (!response.ok) 
            {
                console.log('Ошибка чтения настроек из файла:');
                console.log(`HTTP ${response.status}: ${response.statusText}`);
            }

            const loaded = await response.json();

            if(loaded)
            {
                CONFIG = loaded;
                console.log('Настройки прочитаны из файла (config.json)');
            }
            else
            {
                for(let key in CONF_DEFAULT) CONFIG[key] = CONF_DEFAULT[key].value;
                console.log('Не удалось прочитать настройки. Используются настройки по умолчанию.');
            }
        }
    } 
    catch (err) 
    {
      console.log('❌ [PLUGIN] Failed to load config.json:', err);
      for(let key in CONF_DEFAULT) CONFIG[key] = CONF_DEFAULT[key].value;
      console.log('Используются настройки по умолчанию.');
    }

    for(let key in CONF_DEFAULT) 
    {
        if(typeof CONFIG[key] == 'undefined' )
        {
            CONFIG[key] = CONF_DEFAULT[key].value;
            CONF_DEFAULT[key].isNew = true;
        }
        else if(CONF_DEFAULT[key].isNew)
        {
            CONF_DEFAULT[key].isNew = false;
        }
    }

    if(!CONFIG.apply_context_menu)
    {
        CONFIG.privat_mail_type = 'msg_menu';
    }
}


async function openSettingsModal(conf) {
    return new Promise((resolve) => {
        const max_width = 85;

        const existing = document.getElementById('ext-conf-overlay');
        if (existing) existing.remove();

        if (!document.getElementById('ext-conf-styles')) {
            const style = document.createElement('style');
            style.id = 'ext-conf-styles';
            style.textContent = `
                .ext-conf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647; }
                .ext-conf-modal { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 90vh; }
                .ext-conf-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .ext-conf-table th, .ext-conf-table td { padding: .25em .5em; border-bottom: 1px solid #eee; vertical-align: middle; }
                .ext-conf-table th { background: #f8f9fa; font-weight: 600; text-align: left; }
                .ext-conf-scroll-wrapper { flex: 1; overflow-y: auto; min-height: 0; margin: .25em 0; }
                .ext-conf-input { width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #ccc; border-radius: 4px; }
                .ext-conf-desc { font-size: 0.9em; color: #666; word-break: break-word; }
                .ext-conf-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; flex-shrink: 0; }
                .ext-conf-btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
                .ext-conf-btn:hover { opacity: 0.85; }
                .ext-conf-btn-apply { background: #0d6efd; color: #fff; }
                .ext-conf-btn-save { background: darkgreen; color: #fff; }
                .ext-conf-btn-abort { background: #BF3400; color: #fff; }
                .ext-conf-btn-cancel { background: #6c757d; color: #fff; }
                input[type="checkbox"].ext-conf-input { width: auto; transform: scale(1.2); cursor: pointer; }
                .column1 { width: 40%; }
                .column2 { width: 20%; }
                .column3 { width: 40%; }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement('div');
        overlay.id = 'ext-conf-overlay';
        overlay.className = 'ext-conf-overlay';

        const modal = document.createElement('div');
        modal.className = 'ext-conf-modal';
        modal.style.maxWidth = `${max_width}%`;
        modal.style.width = '96%';

        const title = document.createElement('h3');
        title.textContent = 'Редактирование настроек - "Классика" v ' + manifest.version;
        title.style.margin = '0 0 10px';
        modal.appendChild(title);

        const headerTable = document.createElement('table');
        headerTable.className = 'ext-conf-table';
        const headerRow = document.createElement('tr');
        ['Параметр', 'Значение', 'Описание'].forEach((text, i) => {
            const th = document.createElement('th');
            th.textContent = text;
            th.className = `column${i + 1}`;
            headerRow.appendChild(th);
        });
        headerTable.appendChild(headerRow);
        modal.appendChild(headerTable);

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'ext-conf-scroll-wrapper';

        const bodyTable = document.createElement('table');
        bodyTable.className = 'ext-conf-table';
        const tbody = document.createElement('tbody');

        for (const key in CONF_DEFAULT) 
        {
            let condef = CONF_DEFAULT[key]; 
            let isNew = condef.isNew

            const tr = document.createElement('tr');
            if (isNew) {
                tr.style.background = '#FFD1BF'; // Подсветка
            }

            const tdParam = document.createElement('td');
            tdParam.className = 'column1';
            tdParam.textContent = condef.ru; // Опциональная метка 🆕
            tr.appendChild(tdParam);

            const tdVal = document.createElement('td');
            tdVal.className = 'column2';
            // Значение: из конфига пользователя, либо из дефолта (для новых)
            const currentVal = conf[key];

            let input;
            switch (condef.type) {
                case 'boolean':
                    input = document.createElement('input'); input.type = 'checkbox'; input.className = 'ext-conf-input'; input.checked = !!currentVal; break;
                case 'integer':
                    input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.className = 'ext-conf-input'; input.value = Number.isFinite(currentVal) ? currentVal : 0; break;
                case 'string':
                    input = document.createElement('input'); input.type = 'text'; input.className = 'ext-conf-input'; input.value = currentVal ?? ''; break;
                case 'enum':
                    input = document.createElement('select'); input.className = 'ext-conf-input';
                    let found = false;
                    condef.values.forEach((val, i) => {
                        const opt = document.createElement('option'); opt.value = val; opt.textContent = condef.labels.ru[i];
                        if (val == currentVal) { opt.selected = true; found = true; }
                        input.appendChild(opt);
                    });
                    if (!found) input.selectedIndex = 0;
                    break;
                default:
                    input = document.createElement('input'); input.type = 'text'; input.className = 'ext-conf-input'; input.value = currentVal ?? '';
            }
            input.dataset.key = key;
            tdVal.appendChild(input);
            tr.appendChild(tdVal);

            const tdDesc = document.createElement('td');
            tdDesc.className = 'column3 ext-conf-desc';
            tdDesc.innerHTML = condef.description || '—';
            tr.appendChild(tdDesc);

            tbody.appendChild(tr);
        }
        // 🔍 === КОНЕЦ ИЗМЕНЕНИЙ ===

        bodyTable.appendChild(tbody);
        scrollWrapper.appendChild(bodyTable);
        modal.appendChild(scrollWrapper);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'ext-conf-btns';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Отмена'; btnCancel.className = 'ext-conf-btn ext-conf-btn-cancel';

        const btnAbort = document.createElement('button');
        btnAbort.textContent = 'Восстановить'; btnAbort.className = 'ext-conf-btn ext-conf-btn-abort';

        const btnApply = document.createElement('button');
        btnApply.textContent = 'Применить'; btnApply.className = 'ext-conf-btn ext-conf-btn-apply';

        const btnSave = document.createElement('button');
        btnSave.textContent = 'Сохранить'; btnSave.className = 'ext-conf-btn ext-conf-btn-save';

        btnWrap.append(btnCancel, btnApply, btnAbort, btnSave);
        modal.appendChild(btnWrap);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        let escHandler;
        const close = (result = null) => {
            document.removeEventListener('keydown', escHandler);
            overlay.remove();
            resolve(result);
        };

        escHandler = (e) => { if (e.key === 'Escape') close(null); };
        document.addEventListener('keydown', escHandler);
        overlay.onclick = (e) => { if (e.target === overlay) close(null); };

        btnCancel.onclick = () => close('cancel');

        btnAbort.onclick = () => {
            localStorage.removeItem('yap_plugin_conf_klassika');
            close('abort');
        };

        btnApply.onclick = () => {
            const newConf = {};
            document.querySelectorAll('.ext-conf-input[data-key]').forEach(el => {
                const key = el.dataset.key;
                const condef = CONF_DEFAULT[key];
                switch (condef.type) {
                    case 'boolean': newConf[key] = el.checked; break;
                    case 'integer': newConf[key] = parseInt(el.value, 10) || 0; break;
                    case 'string':  newConf[key] = el.value; break;
                    case 'enum':    newConf[key] = el.value; break;
                }
            });

            const jsonStr = JSON.stringify(newConf);
            localStorage.setItem('yap_plugin_conf_klassika', jsonStr);
            close('apply');
        };

        btnSave.onclick = () => {
            const newConf = {};
            document.querySelectorAll('.ext-conf-input[data-key]').forEach(el => {
                const key = el.dataset.key;
                const condef = CONF_DEFAULT[key];
                switch (condef.type) {
                    case 'boolean': newConf[key] = el.checked; break;
                    case 'integer': newConf[key] = parseInt(el.value, 10) || 0; break;
                    case 'string':  newConf[key] = el.value; break;
                    case 'enum':    newConf[key] = el.value; break;
                }
            });

            const jsonStr = JSON.stringify(newConf, null, 4);
            localStorage.setItem('yap_plugin_conf_klassika', jsonStr);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'config.json';
            document.body.appendChild(a); a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

            close('save');
        };
    });
}

function addConfigMenu()
{                                        
    //debugger;       
    async function configMenuLoad()
    {
        res = await openSettingsModal(CONFIG);
        if(res != 'cancel')
        {
            window.location.reload();
        }
    }

    if(document.querySelector('span.plugin-config-menu')) return;

    const menuDiv = document.querySelector('div#main-menu');
    if(!menuDiv) return;
    const configMenu = document.createElement('span');
    configMenu.id = 'plugin-config-menu';
    configMenu.style.paddingLeft = '.5em';
    configMenu.style.color = 'Honeydew';
    configMenu.style.cursor = 'pointer';
    configMenu.innerHTML = '&#x2699;&#xFE0F "Классика"';
    configMenu.addEventListener('click', configMenuLoad);

    configMenu.classList.add('has-context-menu');
    configMenu.setAttribute('ctxm', 'check_update');
    configMenu.style.cursor = 'default';

    menuDiv.append(configMenu);
}

function replaceLinksIfNeedIt()
{
    const params = new URLSearchParams(window.location.search);
    
    // Проверяем нужные параметры
    const isTargetPage = 
        params.get('act') === 'Search' &&
        params.get('nav') === 'au' &&
        params.get('CODE') === 'show';

    if(isTargetPage)
    {
        const tds = document.querySelectorAll('td.post1');
        if(tds)
            for(i = 0, l = tds.length; i < l; i++)
            {
                if(tds[i].innerHTML.match(/🔗/))
                {
                    tds[i].innerHTML = tds[i].innerHTML.replace(/🔗/g, '«');
                }
                if(tds[i].innerHTML.match(/↗/))
                {
                    tds[i].innerHTML = tds[i].innerHTML.replace(/↗/g, '«');
                }
            }
    }
}

replaceLinksIfNeedIt();

// Явный экспорт в контекст расширения
// Используем префикс, чтобы не конфликтовать с другими расширениями или сайтом
/*window.MY_EXT_SETTINGS = {
    CONF_DESC,
    CONF_DEFAULT,
    openSettingsModal
};

//осталось для примера
//var{ CONF_DESC, CONF_DEFAULT, openSettingsModal } = window.MY_EXT_SETTINGS;

*/