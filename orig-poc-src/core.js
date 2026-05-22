//console.log('🔹 core.js loaded', new Date().toISOString());
//console.trace(); 

let filtered_nik_name = localStorage.getItem('filtered_nik_name');
const fbo = document.getElementById('REPLIER');

const style = document.createElement('style');
style.textContent = `
  body:not(.plugin-ready) table[id^="entry"] {
    display: none !important;
  }
`;
document.head.appendChild(style);

if (document.readyState === 'interactive' || document.readyState === 'complete') 
{
    initPage();
} 
else 
{
  window.addEventListener("load", initPage, false);
}

window.addEventListener('beforeunload', () => {
    localStorage.setItem('scrollPosition', window.pageYOffset);
});

// Legacy - парсим нестрогий json
function parseLooseJSON(text) {
  return JSON.parse(qq = text
    .replace(/\/\/.*$/gm, '')             // Комментарии //
    .replace(/\/\*[\s\S]*?\*\//g, '')     // Комментарии /* */
    .replace(/,\s*(?=[}\]])/g, '')        // Висящие запятые перед } и ]
    .replace(/"\s*"/g, '')                // Склейка длинных строк. Пример: "очень " "длинная " "строка". Части строки можно переносить на новую строку (для удобства)
  );
}
// Legacy - парсим нестрогий json

async function initPage() 
{
// Legacy. UserGroups: Читаем юзер-группы и инвертируем их в объект юзеров	- begin
    USERS = {};
    try {
      const res = await fetch(chrome.runtime.getURL('groups.json'));
      if (!res.ok) return;
      const groups = parseLooseJSON(await res.text());
      if (groups && typeof groups === 'object')
        for (const [group, info] of Object.entries(groups)) {
          const arr = Array.isArray(info.users) ? info.users : (info.users || '').split(/\s+/).filter(Boolean);    // Если строка - превращаем в массив
          for (const user of arr) {
            USERS[user] = { group };
            if (info.ignore) USERS[user].ignore = true;
            if (info.color)  USERS[user].color  = info.color;
          }
		}
    } catch { console.log('Файл юзер-групп отсутствует или содержит невалидный json'); }
// Legacy. UserGroups: Читаем юзер-группы и инвертируем их в объект юзеров	- end

    await loadConfig();
    await addConfigMenu();

    if(CONFIG.privat_mail_type == 'avatar_rkm')
    {
        CONTEXT_MENU.user_actions.push({label: 'Написать в личку', action: toPrivatMail});
    }


    if(filtered_nik_name)
    {
        createCancelFilterElem();
    }

    const currentUser = getCurrentUser();
    let isCurrentUser = false;
    if(CONFIG.reduce_ad_block) reduceRightCol();

    const postArea = getPostArea();

    if(postArea)
    {   
        renderSmilesTable();
    }

    let entryTabs = document.querySelectorAll('table[id^=entry]');
    if(!( entryTabs && entryTabs.length > 0)) 
    {
        return;
    }

    for(let i = 0, len = entryTabs.length; i < len; i++ )
    {   
        let userLabel, toPrivate, citate_part, reply, report, editLink, ratingValue, 
            postRank, userStatus, nikname, online, userPic, img, msgDate, href_to_post, 
            nikhref, current_nik_name;

// Legacy. UserGroups: Определяем юзер-группу - begin
        let userGroup = {};
// Legacy. UserGroups: Определяем юзер-группу - end

        let rows = entryTabs[i].rows;
        let row = getRow( rows, 'userInfo' );

        if(row)
        { 
            let isGuest = false;

            online = row.querySelector('span.red-circle') || row.querySelector('.green-circle');
            if(online)
            {
                online.classList.add('user-online');
            }
            else //гость
            {
                online = document.createElement('span');
                online.innerHTML = '👤';
                isGuest = true;
            }

            nikname = row.querySelector('span.normalname') || row.querySelector('span.unreg');
            if(nikname)
            {   
// Legacy. UserGroups: Игнорируем посты юзеров из игнор-листа - begin
                userGroup = USERS[nikname.innerText.trim()] || {};
                if (userGroup.ignore) {
					row.closest('table').style.display = 'none';
                    continue;
                }
// Legacy. UserGroups: Игнорируем посты юзеров из игнор-листа - end

                nikhref = nikname.querySelector('a');
                if(nikhref)
                {
                    nikname.title = nikhref.title;
                    nikname.innerText = nikhref.innerText.trim();//намеренно удаляю ссылку
                    if(nikhref.innerHTML.startsWith('<s>'))
                    {
                        nikname.style.textDecoration = 'line-through';
                    }
                    isCurrentUser = nikname.innerText == currentUser;
                    nikname.style.paddingRight = '.5em';
                    if(!isCurrentUser)
                    {
                        nikname.style.cursor = 'pointer';
                        nikname.addEventListener('click', mentionUser);
                    }
                }
                current_nik_name = nikname.innerText.trim();
            }

//debugger; //обусловлено аццкой версткой
            userPic = row.querySelector('a');
            if(userPic) userPic.title = "";
           
            img = userPic ? userPic.querySelector('img') : null;

            if(!userPic || !img )
            {
                userPic = row.querySelector('div.extended');
                img = userPic ? userPic.querySelector('img') : null;
            }

            if(!userPic || !img )
            {
                userPic = row.querySelector('div.comment-left');
                userPic.classList.remove('comment-left');
                img = userPic ? userPic.querySelector('img') : null;
            }

            if(img)
            {
                let newHW = scaleHW( CONFIG.user_pic_size, parseInt(img.getAttribute('height')), parseInt(img.getAttribute('width')));
                img.setAttribute('height', newHW.h);
                img.setAttribute('width', newHW.w);
                img.classList.add('user-img');
            }
            else if(nikhref)
            {
                let noAvatar = document.createElement('a');
                noAvatar.href = nikhref;
                 
                img = document.createElement('img');
                img.setAttribute('height', CONFIG.user_pic_size);
                img.setAttribute('width', CONFIG.user_pic_size);
                img.src = "//www.yaplakal.com/html/static/noavatar.svg";
                img.title = 'Профиль';
                img.classList.add('user-img');
                noAvatar.append(img);
                userPic.append(noAvatar);
            }

            prepare4ContextMenu(img, 'user_actions');

            msgDate = row.querySelector('a.anchor');
            let dateSpan = document.createElement('span');
            dateSpan.innerText = msgDate.innerText;
            dateSpan.classList.add('msg-date');
            msgDate.innerHTML = dateSpan.outerHTML;

            ratingValue =  row.querySelector('div.rating-value'); 
            if(ratingValue) ratingValue = ratingValue.parentElement;
             
            userLabel =  row.querySelector('span.badge-author'); 
            toPrivate = row.querySelector('a.pm-icon');

            if(toPrivate) 
            {
                msgMenuSettings( toPrivate, 'pm', 'личка' );
                if(CONFIG.privat_mail_type == 'avatar_rkm') 
                {
                    toPrivate.classList.add('hidden');
                    toPrivate.classList.add('search_pm');
                }  
            }

            if(row.querySelector('a.quote-icon') || isCurrentUser ) 
            {
                citate_part = document.createElement('a');
                citate_part.href = '#';
                citate_part.title = 'Для вставки цитаты предварительно выделите текст мышью.';
                citate_part.setAttribute('table_id', entryTabs[i].id);
                msgMenuSettings( citate_part, 'quote', 'цитата' );
                citate_part.addEventListener('click', insertCitatePart );

                if(postArea || true)
                {
                    href_to_post = document.createElement('span');
                    href_to_post.innerHTML = '▼';
                    href_to_post.classList.add('href-to-post');
                    href_to_post.style.display = 'none';
                    href_to_post.style.paddingLeft = '.25em';
                    href_to_post.style.paddingRight = '.25em';
                    href_to_post.style.cursor = 'pointer';
                    href_to_post.style.color = 'darkblue';
                    href_to_post.style.fontSize = '.9em';
                    href_to_post.addEventListener('click', beforeToPost );
                }
            }

            if(postArea || true)
            {
                reply = row.querySelector('a.reply-icon');
                if(reply)
                {
                    msgMenuSettings( reply, 'reply', 'ответить' );
                }
            }

            report = row.querySelector('a.report-icon');
            if(report)
            {
                msgMenuSettings( report, 'report', '911' );
                report.classList.add('report911');
            }

            postRank = row.querySelector('div[id^=p_rank]');
            userStatus = row.querySelector('div.postdetails');
            let newStatus = '';
            let s = userStatus.innerHTML ? userStatus.innerHTML : '';
            if(s && s.match(/.+•/))
            {
                newStatus = s.match(/.+•/)[0].replace('•', '').trim();
            }

            if(CONFIG.show_date_or_age == 'age' && s)
            {
                if(s.match(/сайте\s\d+.+/))
                {
                    newStatus += (newStatus ? '<br/>' : '') + 'На сайте: ' + s.match(/сайте \d+.+/)[0].substring(6).trim();
                }
            }

            s = nikname.getAttribute('title');

            if(CONFIG.show_date_or_age == 'date' && s)
            {
                const dateReg = s.match(/\d{1,2}\.\d{2}\.(\d{2}|\d{4})/);
                if(dateReg)
                {
                    newStatus += (newStatus ? '<br/>' : '') + dateReg[0];
                }
            }

            if(s && s.match(/ний:\s.+/))
            {
                let mtch = s.match(/ний:\s.+/)[0].match(/\d+/g);
                newStatus += (newStatus ? '<br/>' : '') + (mtch && mtch.length ? mtch.join('') : 0) + ' сообщ.';
            }
// Legacy. UserGroups: Название группы - begin
            if (userGroup.group) newStatus += (newStatus ? '<br/>' : '') + 'Группа: ' + userGroup.group;
// Legacy. UserGroups: Название группы - end
            if(newStatus)
            {
                userStatus.innerHTML = newStatus;
            }
        }
        else
        {
            isCurrentUser = false;
        }


        row = getRow( rows, 'postHeader' );
        if(row)
        { 
            editLink = row.querySelector('a.edit-icon');
            if(editLink)
            {
                msgMenuSettings( editLink, 'edit', 'правка' );
            }
        }

        row = getRow( rows, 'userMsg' );

        let msg = row ? row.cells[0] : null; 
        if(msg) 
        {
            msg.classList.add('user-msg');
            msg.style.background = CONFIG.message_bg_color;
            if(msg.innerHTML.match(/QuoteE?Begin|QuoteE?End/) || msg.innerHTML.match(/(?:\s*<br\s*\/?>\s*){3,}/))
            {
                msg.innerHTML = normalizeMsgContent(msg.innerHTML);
            }
        }

        let newTable = document.createElement('table');
        newTable.id = entryTabs[i].id;
        newTable.style.width = '100%';
        newTable.classList.add('comment-table');
        newTable.classList.add('entry-table');

        let row_1 = newTable.insertRow();
        row_1.classList.add('collapsebox');
        row_1.classList.add('title-msg-row');
        if(CONFIG.title_bg_color) row_1.style.background = CONFIG.title_bg_color;
        if(CONFIG.hor_separate_border) row_1.style.borderTop = CONFIG.hor_separate_border;

        let newCell = row_1.insertCell(); 
        newCell.classList.add('entry-column1');
        newCell.setAttribute('rowspan', 2);
        newCell.style.width = CONFIG.left_col_width;
        newCell.style.minWidth = CONFIG.left_col_width;
        newCell.style.maxWidth = CONFIG.left_col_width;
        newCell.style.overflowX = 'auto';
        newCell.style.borderRight = CONFIG.left_col_right_border;
        newCell.style.background = CONFIG.title_bg_color;

// Legacy. UserGroups: Выделение цветом юзеров из групп - begin
        if (userGroup.color) newCell.style.background = userGroup.color;
// Legacy. UserGroups: Выделение цветом юзеров из групп - end

        let userWrapper = document.createElement('div');
        newCell.append(userWrapper);
         
        let nikWrapper = document.createElement('div');
        nikWrapper.style.display = 'block';
        nikWrapper.style.whiteSpace = 'nowrap';

        let div = document.createElement('div');
        div.classList.add('user-nik');

        if(nikname) 
        {
            if(isCurrentUser && (CONFIG.self_highlight_bg || CONFIG.self_highlight_border))
            {
                userWrapper.classList.add('user-wrapper'); 
                if(CONFIG.self_highlight_bg) userWrapper.style.background = CONFIG.self_highlight_bg;
                if(CONFIG.self_highlight_border) userWrapper.style.border = CONFIG.self_highlight_border;
            }

            nikWrapper.append(nikname);
        }

        if(online) nikWrapper.append(online);
        div.append(nikWrapper);

        if(CONFIG.nik_on_top)
        {
            div.style.paddingBottom = '.5em';
            if(nikname) userWrapper.append(div);
            if(userPic) userWrapper.append(userPic);
        }
        else
        {
            if(userPic) userWrapper.append(userPic);
            div.style.paddingTop = '.5em';
            if(nikname) userWrapper.append(div);
        }

        if(userStatus) userWrapper.append(userStatus);

        if( userLabel )
        {       
            userWrapper.append( document.createElement('br') );
            userWrapper.append( userLabel );
            
        }        

        let newCell2 = row_1.insertCell(); 
        newCell2.setAttribute('colspan', 2);
        newCell2.classList.add('entry-column2');
        newCell2.style.verticalAlign = 'middle';
        newCell2.style.height = '1.2em';
        newCell2.style.maxHeight = '1.2em';

        let wrapTable = document.createElement('table');
        wrapTable.style.width = '100%';
        wrapTable.style.borderCollapse = 'collapse';
        let wrapRow = wrapTable.insertRow();
        let wrapCell1 = wrapRow.insertCell();
        wrapCell1.style.paddingLeft = '.5em';
        let wrapCell2 = wrapRow.insertCell();
        newCell2.append(wrapTable);

        if(msgDate) wrapCell1.append(msgDate);

        /*if(editLink)
        {
            let editSpan = document.createElement('span');
            editSpan.classList.add('edit-msg');
            wrapCell1.append(editSpan);
            editSpan.append(editLink);
        }*/

        let div2 = document.createElement('div');
        div2.style.float = 'right';
        div2.style.display = 'inline';

        if(editLink) div2.append(editLink);
        if(toPrivate) div2.append(toPrivate);
        if(citate_part) div2.append(citate_part);
        if(href_to_post) div2.append(href_to_post);
        if(reply) div2.append(reply);
        if(report) div2.append(report);

        if(postRank) 
        {
            postRank.style.paddingLeft = '1em';
            div2.append(postRank);
        }

        if(ratingValue) 
        {
            let ratingWrapper = document.createElement('div');
            ratingWrapper.style.marginLeft = '2em';
            ratingWrapper.style.display = 'inline';
            ratingWrapper.append(ratingValue);
            div2.append(ratingWrapper);
        }

        wrapCell2.appendChild(div2);
        
        let row_2 = newTable.insertRow();
        if(msg) 
        {
            let quotedTd = msg.querySelectorAll('td[id^=QUOT]');
            for(let i = 0, l = quotedTd.length; i < l; i++)
            {
                quotedTd[i].style.background = CONFIG.citate_bg_color;
                quotedTd[i].classList.add('citate');
                quotedTd[i].removeAttribute('id'); //иначе стиль фиг победить
            }
            row_2.appendChild(msg);
        }

        let cell4link = row_2.insertCell();
        if(i > 0)
        {
            cell4link.style.verticalAlign = 'bottom';
            cell4link.style.paddingRight = '.5em';
            let scrollTop = document.createElement('a');
            scrollTop.href='#';
            scrollTop.classList.add('title');
            scrollTop.innerText = '▲';
            scrollTop.style.fontSize = '.9em';
            scrollTop.style.textDecoration = 'none';
            let wrapper = document.createElement('div');
            wrapper.style.paddingBottom = '.5em';
            wrapper.append(scrollTop)
            cell4link.style.background = CONFIG.message_bg_color;
            cell4link.append(wrapper);
        }
        else
        {
            cell4link.style.minWidth = '1em';
            cell4link.style.background = CONFIG.message_bg_color;
        }

        if(current_nik_name)
        {
            newTable.setAttribute('data-nik-name', current_nik_name);
        }

        if(filtered_nik_name && current_nik_name && filtered_nik_name != current_nik_name)
        {
            newTable.classList.add('hidden');
        }

        entryTabs[i].replaceWith(newTable);
    }

    const bottomFirstDiv = document.querySelector('div.row4');
    if(bottomFirstDiv) bottomFirstDiv.style.borderTop = CONFIG.hor_separate_border;

    document.body.classList.add('plugin-ready');

    if(CONFIG.response_form == 'toggle')
    {
        /*==== код от Mooniz чуть правленный ====*/
        //const fbo = document.getElementById('REPLIER');
        if (fbo && postArea) 
        {          
            let tbls = document.querySelectorAll('table.row3');
            if(tbls && tbls.length)
            {
                let row = tbls[tbls.length - 1].rows[0];
                let firstCellIsEmpty = row.cells[0].innerText == '';
                let cell = row.insertCell(1);
                if(firstCellIsEmpty) 
                {
                    cell.style.width = '50%';
                    cell.style.textAlign = 'right';
                }
                else
                {
                    cell.style.textAlign = 'center';
                }
                
                cell.innerHTML = '<button id="toggleFBO" type="button">Скрыть</button>';
            }
            else
            {
                fbo.insertAdjacentHTML('beforebegin', '<button id="toggleFBO" type="button" style="margin:10px 0">Скрыть</button>');
            }

            //const toggleFBO = fbo.previousElementSibling;
            const toggleFBO = document.querySelector('#toggleFBO');

            function updateBtn() {
              toggleFBO.textContent = (fbo.style.display === 'none') ? 'Показать ФБО' : 'Скрыть ФБО';
            }
            function checkFBO() {
              fbo.style.display = postArea.value.trim() ? '' : 'none'; updateBtn();
            }
            toggleFBO.addEventListener('click', () => {
              fbo.style.display = (fbo.style.display === 'none') ? '' : 'none'; updateBtn();
            });
            postArea.addEventListener('input', checkFBO);
            window.checkFBO = checkFBO;
            checkFBO();
        }
        /*==== код от Mooniz ====*/
    }

/*
const rating = document.querySelector('[rel="rating"]');
const newTopicBtn = [...document.querySelectorAll('a')]
  .find(a => a.textContent.includes('НОВАЯ ТЕМА'));

if (rating && newTopicBtn) {
console.log(rating.innerHTML);
  const container = newTopicBtn.closest('td.bottommenu');
  const clone = rating.cloneNode(true);

  container.appendChild(clone);
}
*/


//повторяем скроллинг по якорю, если он тут нужен, так как изменен top элементов 
    if (location.hash) 
    {
        var targetId = location.hash.slice(1);
        var targetEl = document.getElementById(targetId);
        if(targetEl) 
        {
            targetEl.scrollIntoView();
        }
    }


    var savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition)
    {
        if (performance.getEntriesByType("navigation")[0].type === 'reload')
        {
            window.scrollTo(0, parseInt(savedPosition));
            localStorage.removeItem('scrollPosition');
        }
    }

    adjustScrollTopElem(); 
    doOldFeature();
    setBetterCopyMessageLink();
    setUserFilter4citates();
    //citateHandler();
}

function setBetterCopyMessageLink()
{
    const msgDateLinks = document.querySelectorAll('a.anchor');

    for(let i = 0, l = msgDateLinks.length; i < l; i++)
    {
        msgDateLinks[i].addEventListener('click', function (e) 
            {                  
                let elem = e.target.tagName != 'A' ? e.target.closest('a.anchor') : e.target;
                e.preventDefault();
                e.stopImmediatePropagation();

//              navigator.clipboard.writeText(elem.href);
                navigator.clipboard.writeText(elem.href + '\n' + elem.closest('table.entry-table').dataset.nikName + ' - ');

                showToastMessage('✔ Ссылка скопирована в буфер обмена.');
           }, true);
    }
}


function getRow( rows, msgType )
{
    for(let i = 0, l = rows.length; i < l; i++ )
    {
        if(msgType == 'userInfo' && (rows[i].querySelector('span.normalname') || rows[i].querySelector('span.unreg')))
        {
            return rows[i];
        }
        else if(msgType == 'userMsg' && rows[i].querySelector('div.postcolor'))
        {
            return rows[i];
        }
        else  if(msgType == 'postHeader' && rows[i].querySelector('div.post-header'))
        {
            return rows[i];
        }
        else  if(msgType == 'userTools' && rows[i].querySelector('div.post-tools'))
        {
            return rows[i];
        }
    }
    return null;
}

function scaleHW( size, h, w )
{
    divider = h > w ? h : w;
    let k = size / divider;
    if( h > w )
    {
        return { h: parseInt(size), w: parseInt(w * k) };
    }
    else
    {
        return { h: parseInt(h * k), w: parseInt(size) };
    }
}

function getCurrentUser()
{
    let curUser = document.querySelector('div.user-name>a');
    return curUser ? curUser.innerText : null;
}

function getPostArea()
{
    return document.querySelector('#Post');
}

function cleanEmptyGarbage(areaElem)
{
    if (!areaElem.value.trim()) areaElem.value = ''; 
}


function reduceRightCol()
{              
    let rc = document.querySelector('#right-column');
    if(rc)
    {
        let w = rc.getAttribute('width');
        if(w)
        {
            w = parseInt(w);
            w = parseInt(w - 0.2 * w);
        }
        rc.style.minWidth = 0;
        rc.style.maxWidth = w + 'px';
        rc.style.overflowX = 'hidden';
        let cn = rc.querySelectorAll('center');
        if(cn) for(let i = 0, l = cn.length; i < l; i++ )
        {
            cn[i].style.transform = 'scale(0.8)';
            cn[i].style.transformOrigin = 'top center'; 
        }

        let ifrm = rc.querySelectorAll('iframe');
        if(ifrm) for(let i = 0, l = ifrm.length; i < l; i++ )
        {
            if(ifrm[i])
            {
                ifrm[i].style.transform = 'scale(0.8)';
                ifrm[i].style.transformOrigin = 'top left'; 
            }
        }
    }
}

function insertCitatePart(e) {
    // 1. Fallback для старых браузеров
    if (e.preventDefault) e.preventDefault(); 
    else e.returnValue = false;

    // Вспомогательная: поиск предка (замена closest)
    function findParent(el, selector) {
        while (el && el !== document.body) {
            var matchFn = el.matches || el.webkitMatchesSelector || el.msMatchesSelector;
            if (matchFn && matchFn.call(el, selector)) return el;
            el = el.parentElement || el.parentNode;
        }
        return null;
    }

    // Вспомогательная: проверка класса (замена classList.contains для IE9/10)
    function hasClass(el, cls) {
        return el.classList ? el.classList.contains(cls) : (' ' + el.className + ' ').indexOf(' ' + cls + ' ') > -1;
    }

/*==== код Mooniz ===*/
    function getSelectionInfo() {
       var sel = window.getSelection();
       if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
       var text = sel.toString().trim();
       var range = sel.getRangeAt(0);
       var bbcode = htmlToBBCode(range.cloneContents());
       var container = range.commonAncestorContainer;
       if (container.nodeType === Node.TEXT_NODE) container = container.parentElement || document.body;
       var block = findParent(container, 'p, div, td, th, li, blockquote, h1, h2, h3, h4, h5, h6, article, section');
       var element = block || container || document.body;
       var ownerTable = findParent(container, 'table.entry-table');
       return { text, bbcode, element, ownerTable };
    }

    function htmlToBBCode(root) 
    {
        function walk(n) 
        {
            if (n.nodeType === Node.TEXT_NODE) return n.nodeValue || '';
            if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) return walkChildren(n);
            if (n.nodeType !== Node.ELEMENT_NODE) return '';
            const tag = n.tagName.toLowerCase();
            if (tag === 'table') return parseQuoteTable(n);
            if (tag === 'a') 
            {
                const href = n.getAttribute('href') || '';
                return "[url=" + href + "]" + walkChildren(n) + "[/url]";
            }
            if (tag === 'img') 
            {
                let src = n.getAttribute('src') || n.getAttribute('data-src') || n.getAttribute('data-original') || '';
                if (!src) return '';
                if (src.startsWith('//')) src = 'https:' + src;
                return "[img]" + src + "[/img]";
            }
            if (tag === 'b' || tag === 'strong') return "[b]" + walkChildren(n) + "[/b]";
            if (tag === 'i' || tag === 'em')     return "[i]" + walkChildren(n) + "[/i]";
            if (tag === 'u')                     return "[u]" + walkChildren(n) + "[/u]";
            if (tag === 'br')                    return '\n';
            if (tag === 'div' || tag === 'p')    return walkChildren(n) + '\n';
            return String(walkChildren(n));
        }

        function walkChildren(n) 
        {
            let out = '';
            for (let i = 0; i < n.childNodes.length; i++) out += walk(n.childNodes[i]);
            return out;
        }

        function parseQuoteTable(table) 
        {
            let author = '';
            let contentCell = null;
            const rows = table.querySelectorAll('tr');
            if (rows.length >= 2) 
            {
              const headerText = rows[0].innerText || '';
              const m = headerText.match(/Цитата\s*\(([^)]+)\)/);
              if (m) author = m[1];
              contentCell = rows[1].querySelector('td');
            }
            let content = '';
            if (contentCell) content = walkChildren(contentCell).replace(/<!--Quote(E|B)[^>]*-->/g, '').replace(/\n{3,}/g, '\n\n').trim(); 
            return String("[quote=" + author + "]\n" + content + "\n[/quote]\n");
        }

        return walk(root).replace(/\n{3,}/g, '\n\n').trim();

    }
/*==== код Mooniz ===*/


    /*function getSelectionInfo() {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

        var text = sel.toString().trim();
        if (!text) return null;

        var range = sel.getRangeAt(0);
        var container = range.commonAncestorContainer;

        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentElement || document.body;
        }

        var block = findParent(container, 'p, div, td, th, li, blockquote, h1, h2, h3, h4, h5, h6, article, section');
        var ownerTable = findParent(container, 'table.entry-table');
        var targetElement = block || container;

        return { text: text, element: targetElement, ownerTable: ownerTable };
    }*/

    function getFirstTdInPreviousRow(td) {
        var tr = findParent(td, 'tr');
        if (!tr) return null;
        var prevTr = tr.previousElementSibling || (function() {
            var s = tr.previousSibling;
            while (s && s.nodeType !== 1) s = s.previousSibling;
            return s;
        })();
        if (!prevTr || prevTr.tagName !== 'TR') return null;
        return prevTr.cells[0] || null;
    }

    var info = getSelectionInfo();
  
    if (!info) {
        alert(e.target.title || 'Ничего не выделено!');
        return;
    }

    if (!info.ownerTable) {
        alert('Выделенный текст не принадлежит сообщению ленты!');
        return false;
    }

    if (info.ownerTable.id !== (e.target.getAttribute('table_id') || '')) {
        alert('Выделенный текст не принадлежит цитируемому сообщению!');
        return false;
    }

    var userName, msgDate, citateTitle;

    if (info.element.tagName === 'DIV' && hasClass(info.element, 'postcolor')) {
        var nameEl = info.ownerTable.querySelector('span.normalname');
        var dateEl = info.ownerTable.querySelector('span.msg-date');
        userName = nameEl ? nameEl.innerText || nameEl.textContent : '';
        msgDate = dateEl ? dateEl.innerText || dateEl.textContent : '';
        citateTitle = userName + ' @ ' + msgDate;

        const prefix = '\u{1F517}'; // Префикс перед телом цитаты. В данном случае - эмодзи Link

        //info.text = '[url=' + dateEl.parentElement.href + ']' + prefix + '[/url] ' + info.text
/*==== код Mooniz ====*/
       const prefixURL = '[url=' + dateEl.parentElement.href + ']' + prefix + '[/url] ';
       if (!info.bbcode.trim().startsWith('[quote')) 
           info.bbcode = prefixURL + info.bbcode;
       else 
       {
           let lastClose = info.bbcode.lastIndexOf('[/quote]');
           if (lastClose !== -1) 
               info.bbcode = info.bbcode.slice(0, lastClose + 8) + prefixURL + info.bbcode.slice(lastClose + 8).trim();
           else                  
               info.bbcode = prefixURL + info.bbcode;
       }
/*==== код Mooniz ====*/

    }
    else if (info.element.tagName === 'TD' && info.element.id === 'QUOTE') {
        var autorTd = getFirstTdInPreviousRow(info.element);
        if (autorTd) {
            var mtch = (autorTd.innerText || autorTd.textContent || '').match(/\(([^)]+)\)/);
            citateTitle = mtch ? mtch[1].trim() : '[i]Цитируемый не был указан ранее[/i]';
        } 
    }
    else 
        citateTitle = '[color=red][i]Цитируемый не найден![/i][/color]';

    //const insertedCitate = '[quote' + (citateTitle ? '=' + citateTitle : '') + ']' + info.text + '[/quote]';
/*==== код Mooniz ====*/
    const insertedCitate = '[quote' + (citateTitle ? '=' + citateTitle : '') + ']' + info.bbcode + '[/quote]';
/*==== код Mooniz ====*/

    const postArea = getPostArea();

    if(postArea) 
    {
        postArea.value += (postArea.value && !postArea.value.endsWith('\n') ? '\n' : '') + insertedCitate + '\n';
        if(CONFIG.response_form == 'toggle')
        {
            /*==== код от Mooniz ====*/
            window.checkFBO && window.checkFBO();
            /*==== код от Mooniz ====*/
        }
        let href_to_post = e.target.nextElementSibling;
        if(href_to_post) 
        {
            href_to_post.style.display = 'inline';
        }
    }
    else 
    {
        alert('Не найдена форма быстрого ответа (включите её в настройках профиля).'); 
    }
}

function beforeToPost(e)
{
    const hrefsToPost = document.querySelectorAll('span.href-to-post');
    for(let i = 0, l = hrefsToPost.length; i < l; i++) hrefsToPost[i].style.display = 'none';

    const postArea = getPostArea();
    if(!postArea) return;

    cleanEmptyGarbage(postArea);

    postArea.focus();
    const len = postArea.value.length;
    postArea.selectionStart = postArea.selectionEnd = len;
}

/*function mentionUser(e)
{
    const postArea = getPostArea();
    if(!postArea) return;

    cleanEmptyGarbage(postArea);
    if(postArea.value && !postArea.value.endsWith('\n')) postArea.value += '\n';
    postArea.value += '[b]' + e.target.innerText.trim() + '[/b]\n';
    postArea.focus();
    const len = postArea.value.length;
    postArea.selectionStart = postArea.selectionEnd = len;
}*/

function mentionUser(e)
{
   const text = e.target.innerText.trim();
   if (!e.ctrlKey) 
   { 
       navigator.clipboard.writeText(text); 
       showToastMessage('✔ Ник скопирован в буфер обмена.');
       return; 
   }    // Если с Ctrl - копируем в буфер
   const postArea = getPostArea();
   if(!postArea) return;
   cleanEmptyGarbage(postArea);
   if(postArea.value && !postArea.value.endsWith('\n')) postArea.value += '\n';
   postArea.value += '[b]' + text + '[/b]\n';
   fbo.style.display = ''; // Показываем ФБО
   const toggleFBO = document.querySelector('#toggleFBO');
   if(toggleFBO) toggleFBO.textContent = 'Скрыть ФБО';

   postArea.focus();
   const len = postArea.value.length;
   postArea.selectionStart = postArea.selectionEnd = len;
}

function msgMenuSettings( elem, iconType, text )
{
    elem.className = '';
    elem.classList.add('msg-menu-item');
    if( CONFIG.msg_menu_type == 'text' )
    {
        elem.classList.add('msg-menu-text');
        elem.innerText = text;
    }
    else
    {
        elem.classList.add('msg-menu-icon');
        elem.classList.add('icon-' + iconType);
        elem.innerText = '';
    }
}

function adjustScrollTopElem()
{     
    if(!CONFIG.origin_scroll_top) return;
    
    let st_elem = document.querySelector('#scrollTop');
    if( !st_elem ) return;

    if(CONFIG.origin_scroll_top == 'hide')
    {
        st_elem.classList.add('hidden');
        return;
    }

    let adjust_tbl = document.querySelector('table.entry-table').closest('table');
    if( !adjust_tbl ) return;

    st_elem.style.left = parseInt(adjust_tbl.getBoundingClientRect().right) + 8 + 'px';
    //st_elem.innerHTML = 'Наверх ⬆️';
}

function doOldFeature()
{                   
//    let reply_form = document.querySelector('form#REPLIER');
    if(!fbo) return;

    if(fbo.querySelector('input[name=FILE_UPLOAD]')) return;

    let reply_tbl = fbo.querySelector('table');
    if(!reply_tbl) return;

    let idx = reply_tbl.rows.length - 1;
    if(idx < 0) idx = 0;
    let row = reply_tbl.insertRow(idx);
    let feature = row.insertCell();
    feature.style.background = "whitesmoke";
    feature.style.borderTop = "1px solid gainsboro";

    feature.innerHTML = '\
          <div class="reply-form">\
            <div class="reply-form-synteticleft-block"></div>\
            <div class="reply-form-textarea-wrap">\
              <b style="padding-right:.5em;">Закачать картинку:</b>\
              <input type="hidden" name="MAX_FILE_SIZE" value="3145728">\
              <input class="textinput" type="file" size="30" name="FILE_UPLOAD"><br>\
              <input type="checkbox" name="enabletag" id="enabletag" class="checkbox" value="1" checked="checked">\
                <label for="enabletag"><strong>Включить</strong> добавление логотипа сайта</label>\
            </div>\
           <div class="reply-form-right-block" style="vertical-align:middle;text-align:center;">\
             <img id="imghaha_up" src="//www.yaplakal.com/html/emoticons/brake.gif"><br/>\
             <img id="imghaha_bot" src="//www.yaplakal.com/html/emoticons/rulez.gif">\
           </div>\
          </div>';                                 
    let textarea = document.querySelector('textarea#Post');
    if(textarea) textarea.addEventListener('click', hidehaha);
}

function hidehaha()
{   
    function hide_img(id){document.getElementById(id).style.display = 'none';}

    let order = Math.random() < 0.5;

    setTimeout(hide_img, 500, order ? 'imghaha_up' : 'imghaha_bot');
    setTimeout(hide_img, 1000, order ? 'imghaha_bot' : 'imghaha_up');
}

function normalizeMsgContent(s) 
{
/*console.log('---');
console.log('До:');
console.log(s);*/

    s = s.replace(/(<!--QuoteE?Begin-->)(?:\s*<br\s*\/?>\s*)+/gi, '$1')
        .replace(/(?:\s*<br\s*\/?>\s*)+(<!--QuoteE?End-->)/gi, '$1')
        .replace(/(<!--QuoteE?End-->)(?:\s*<br\s*\/?>\s*)+/gi, '$1')
        .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br><br>')
        .replace(/(<!--ec\d-->)(?:\s*<br\s*\/?>)/gi, '$1');
/*console.log('После:');
console.log(s);
console.log('---');*/

    return s;
}

function prepare4ContextMenu(elem, contextMenuName)
{
    if(!CONFIG.apply_context_menu) return;
    elem.setAttribute('ctxm', contextMenuName);
    elem.classList.add('has-context-menu');
    elem.style.cursor = 'default';
}

function createCancelFilterElem()
{
    if(document.getElementById('cancel_user_filter'))
    {
        cancelFilterDiv.innerHTML = 'Фильтр: ' + filtered_nik_name + '<hr/>Сбросить';
        cancelFilterDiv.classList.remove('hidden');
    }
    else
    {
        let cancelFilterDiv = document.createElement('div');
        cancelFilterDiv.id = 'cancel_user_filter';
        cancelFilterDiv.innerHTML = 'Фильтр: ' + filtered_nik_name + '<hr/>Сбросить';
        cancelFilterDiv.addEventListener('click', canselUserFilter);
        document.getElementById('content').append(cancelFilterDiv);
    }
}

function canselUserFilter(e)
{
    localStorage.removeItem('filtered_nik_name');
    document.getElementById('cancel_user_filter').classList.add('hidden');
    let tabs = document.querySelectorAll('table[id^=entry].hidden');
    if(tabs)
    {
        for(let i = 0, l = tabs.length; i < l; i++ )
        {
            tabs[i].classList.remove('hidden');
        }
    } 
}

/*function setUserFilter4citates()
{
    let citates = document.querySelectorAll('td.citate');
    if(!citates) return;

    for(let i = 0, l = citates.length; i < l; i++)
    {
        let td = citates[i].parentElement.previousElementSibling.firstChild;
        if(td && td.innerText)
        {
            let nik = td.innerText.match(/(?<=\().+?(?= @)/);
            if(nik && nik.length)
            {
                prepare4ContextMenu(td, 'user_filter_only');    
            }
        }
    }
}*/

function setUserFilter4citates()
{
   if(!CONFIG.apply_context_menu) return;                // если включено в конфиге
   let citates = document.querySelectorAll('td.citate');
   for(let i = 0, l = citates.length; i < l; i++)
   {
       let td = citates[i].parentElement.previousElementSibling.firstElementChild;  // лучше не firstChild, а firstElementChild
       if (td && td.innerText.match(/(?<=\().+?(?= @)/))                            // проверка наличия ника
       {
// Mooniz: навешиваем класс на содержимое - begin
           let span = document.createElement('span');
           while (td.firstChild) span.appendChild(td.firstChild);
           td.appendChild(span);
// Mooniz: навешиваем класс на содержимое - end
           prepare4ContextMenu(span, 'user_filter_only');                           // не td, а span
       }
   }
}

// MutationObserver для отмены скрытия постов -10 (с защитой от падения на старых браузерах)
(() => {
    try {
        // === 1. Проверка поддержки (фактори) ===
        if (!window.MutationObserver || !document.body) {
            throw new Error('MutationObserver not supported');
        }

        // === 2. Вспомогательные функции ===
        const isTarget = (el) => {
            if (!el?.tagName) return false;
            const tag = el.tagName.toUpperCase();
            if (tag === 'TR' && el.className?.includes('collapsebox')) return true;
            if (el.id?.startsWith('pr_')) return true;
            if (el.id?.startsWith('pb_')) return true;
            return false;
        };

        const getDisplay = (tag) => {
            const t = tag.toUpperCase();
            if (t === 'TR') return 'table-row';
            if (['TBODY','THEAD','TFOOT'].includes(t)) return 'table-header-group';
            if (['TD','TH'].includes(t)) return 'table-cell';
            if (['SPAN','A','B','STRONG'].includes(t)) return 'inline';
            return ''; // сброс к CSS по умолчанию
        };

        // === 3. Основной обработчик ===
        const handleMutations = (mutations) => {
            const toRestore = [];

            for (const m of mutations) {
                if (m.type !== 'attributes') continue;
                const el = m.target;
                if (!isTarget(el)) continue;

                const computed = window.getComputedStyle?.(el, null) || {};
                if (computed.display === 'none') {
                    toRestore.push(el);
                }
            }

            if (toRestore.length > 0) {
                // Защита от рекурсии
                observer?.disconnect();

                for (const node of toRestore) {
                    node.style.display = getDisplay(node.tagName);
                    console.log?.('🔓 Restored:', node.tagName, node.id || node.className?.split(' ')[0]);
                }

                // Возобновление через кадр
                requestAnimationFrame?.(() => {
                    observer?.observe?.(document.body, {
                        attributes: true,
                        attributeFilter: ['style', 'class'],
                        subtree: true
                    });
                });
            }
        };

        // === 4. Запуск наблюдателя ===
        const observer = new MutationObserver(handleMutations);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });

        console.log?.('🛡️ [Extension] Anti-collapse observer active.');

    } catch (err) {
        // === 5. Graceful degradation ===
        // Если что-то пошло не так — просто логируем и выходим
        // Расширение продолжает работать, просто без авто-восстановления постов
        console.warn?.('⚠️ [Extension] Observer module skipped:', err?.message || err);
    }
})();

function addSmail(imgElement) {
  const textarea = getPostArea();
  if (!textarea) {
    console.warn('❌ Элемент <textarea id="Post"> не найден на странице.');
    return;
  }

  const smileCode = ' ' + imgElement.getAttribute('equalText');
  if (!smileCode) return;

  // Текущие позиции курсора и выделения
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  const text = textarea.value;

  // Вставляем код смайла в нужное место
  textarea.value = text.substring(0, startPos) + smileCode + text.substring(endPos);

  // Перемещаем курсор сразу после вставленного текста
  const newPos = startPos + smileCode.length; 
  textarea.selectionStart = textarea.selectionEnd = newPos;

  // Возвращаем фокус в поле ввода
  textarea.focus();

  // 🔥 Важно: сообщаем браузеру и сторонним скриптам, что значение изменилось
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Генерирует таблицу смайлов внутри <details> и добавляет в указанный элемент
 */
function renderSmilesTable() 
{
    function findElem4insertSmilies()
    {
        let layoutElem = null;
        let isSimpleForm = true;

        let leftBlocks = document.querySelectorAll('div.reply-form-left-block');
        if(leftBlocks && leftBlocks.length)
        {
            isSimpleForm = !document.querySelector('div.bbcode');    

            if(isSimpleForm)
            {
                if(leftBlocks[0]) 
                {
                    layoutElem = leftBlocks[0];
                }
            }
            else if(leftBlocks[1])
            {
                layoutElem = leftBlocks[1];
            }
        }
        else 
        {
            layoutElem = document.querySelector('td.pformleft');
            isSimpleForm = false;
        }

        if(layoutElem) 
        {
            layoutElem.innerHTML = '';
            layoutElem.style.verticalAlign = 'top';
            layoutElem.style.textAlign = 'left';
        }

        return CONFIG.smilies_show_all == 'always' || (isSimpleForm && CONFIG.smilies_show_all == 'simple') ? 
            { elem: layoutElem, isSimpleForm: isSimpleForm } : null;
    }
    
    if(!CONFIG.smilies_show_all) return;
    let layout = findElem4insertSmilies();
    if(!layout || !layout.elem) return;

    const smilies = [
      {"code": ":-P", "src": "//www.yaplakal.com/html/emoticons/tongue.gif"},
      {"code": ":-D", "src": "//www.yaplakal.com/html/emoticons/biggrin.gif"},
      {"code": "B-)", "src": "//www.yaplakal.com/html/emoticons/cool.gif"},
      {"code": ":rolleyes:", "src": "//www.yaplakal.com/html/emoticons/rolleyes.gif"},
      {"code": ":-)", "src": "//www.yaplakal.com/html/emoticons/smile.gif"},
      {"code": ":wub:", "src": "//www.yaplakal.com/html/emoticons/wub.gif"},
      {"code": ":angry:", "src": "//www.yaplakal.com/html/emoticons/mad.gif"},
      {"code": ":sad:", "src": "//www.yaplakal.com/html/emoticons/sad.gif"},
      {"code": ":blink:", "src": "//www.yaplakal.com/html/emoticons/blink.gif"},
      {"code": ":agree:", "src": "//www.yaplakal.com/html/emoticons/agree.gif"},
      {"code": ":alik:", "src": "//www.yaplakal.com/html/emoticons/alik.gif"},
      {"code": ":alk:", "src": "//www.yaplakal.com/html/emoticons/alk.gif"},
      {"code": ":alkash:", "src": "//www.yaplakal.com/html/emoticons/alkash.gif"},
      {"code": ":ass:", "src": "//www.yaplakal.com/html/emoticons/ass.gif"},
      {"code": ":beer:", "src": "//www.yaplakal.com/html/emoticons/beer.gif"},
      {"code": ":bow:", "src": "//www.yaplakal.com/html/emoticons/bow.gif"},
      {"code": ":cranky:", "src": "//www.yaplakal.com/html/emoticons/cranky.gif"},
      {"code": ":cry:", "src": "//www.yaplakal.com/html/emoticons/cry.gif"},
      {"code": ":dead:", "src": "//www.yaplakal.com/html/emoticons/dead.gif"},
      {"code": ":deal:", "src": "//www.yaplakal.com/html/emoticons/deal.gif"},
      {"code": ":deg:", "src": "//www.yaplakal.com/html/emoticons/deg.gif"},
      {"code": ":disgust:", "src": "//www.yaplakal.com/html/emoticons/disgust.gif"},
      {"code": ":dont:", "src": "//www.yaplakal.com/html/emoticons/dont.gif"},
      {"code": ":figa:", "src": "//www.yaplakal.com/html/emoticons/figa.gif"},
      {"code": ":fight:", "src": "//www.yaplakal.com/html/emoticons/fight.gif"},
      {"code": ":fingal:", "src": "//www.yaplakal.com/html/emoticons/fingal.gif"},
      {"code": ":fuck:", "src": "//www.yaplakal.com/html/emoticons/fuck.gif"},
      {"code": ":fucking:", "src": "//www.yaplakal.com/html/emoticons/fucking.gif"},
      {"code": ":ganja:", "src": "//www.yaplakal.com/html/emoticons/ganja.gif"},
      {"code": ";-)", "src": "//www.yaplakal.com/html/emoticons/gentel.gif"},
      {"code": ":gigigi:", "src": "//www.yaplakal.com/html/emoticons/gigi.gif"},
      {"code": ":hi:", "src": "//www.yaplakal.com/html/emoticons/hi.gif"},
      {"code": ":hz:", "src": "//www.yaplakal.com/html/emoticons/hz.gif"},
      {"code": ":idea:", "src": "//www.yaplakal.com/html/emoticons/idea.gif"},
      {"code": ":kruto:", "src": "//www.yaplakal.com/html/emoticons/kruto.gif"},
      {"code": ":lol:", "src": "//www.yaplakal.com/html/emoticons/lol.gif"},
      {"code": ":kill:", "src": "//www.yaplakal.com/html/emoticons/moderator.gif"},
      {"code": ":moral:", "src": "//www.yaplakal.com/html/emoticons/moral.gif"},
      {"code": ":protest:", "src": "//www.yaplakal.com/html/emoticons/no.gif"},
      {"code": ":poke:", "src": "//www.yaplakal.com/html/emoticons/poke.gif"},
      {"code": ":pray:", "src": "//www.yaplakal.com/html/emoticons/pray.gif"},
      {"code": ":vomit:", "src": "//www.yaplakal.com/html/emoticons/puke.gif"},
      {"code": ":ugar:", "src": "//www.yaplakal.com/html/emoticons/rulez.gif"},
      {"code": ":rupor:", "src": "//www.yaplakal.com/html/emoticons/rupor.gif"},
      {"code": ":shit:", "src": "//www.yaplakal.com/html/emoticons/shit.gif"},
      {"code": ":spy:", "src": "//www.yaplakal.com/html/emoticons/spy.gif"},
      {"code": ":eban:", "src": "//www.yaplakal.com/html/emoticons/ueban.gif"},
      {"code": ":upset:", "src": "//www.yaplakal.com/html/emoticons/upset.gif"},
      {"code": ":why:", "src": "//www.yaplakal.com/html/emoticons/why.gif"},
      {"code": ":zomb:", "src": "//www.yaplakal.com/html/emoticons/zombie.gif"},
      {"code": ":smoka:", "src": "//www.yaplakal.com/html/emoticons/smoka.gif"},
      {"code": ":up:", "src": "//www.yaplakal.com/html/emoticons/up.gif"},
      {"code": ":dn:", "src": "//www.yaplakal.com/html/emoticons/dn.gif"},
      {"code": ":disco:", "src": "//www.yaplakal.com/html/emoticons/disco.gif"},
      {"code": ":shum_lol:", "src": "//www.yaplakal.com/html/emoticons/shum_lol.gif"},
      {"code": ":umnik:", "src": "//www.yaplakal.com/html/emoticons/umnik.gif"},
      {"code": ":banan:", "src": "//www.yaplakal.com/html/emoticons/banan.gif"},
      {"code": ":behead:", "src": "//www.yaplakal.com/html/emoticons/behead.gif"},
      {"code": ":bud:", "src": "//www.yaplakal.com/html/emoticons/bud.gif"},
      {"code": ":cheesy:", "src": "//www.yaplakal.com/html/emoticons/cheesy.gif"},
      {"code": ":condom:", "src": "//www.yaplakal.com/html/emoticons/condom.gif"},
      {"code": ":deg_girl:", "src": "//www.yaplakal.com/html/emoticons/deg_girl.gif"},
      {"code": ":devil:", "src": "//www.yaplakal.com/html/emoticons/devil.gif"},
      {"code": ":gi:", "src": "//www.yaplakal.com/html/emoticons/gi.gif"},
      {"code": ":hat:", "src": "//www.yaplakal.com/html/emoticons/hat.gif"},
      {"code": ":invalid:", "src": "//www.yaplakal.com/html/emoticons/inv.gif"},
      {"code": ":kosyak:", "src": "//www.yaplakal.com/html/emoticons/kosyak.gif"},
      {"code": ":maniak:", "src": "//www.yaplakal.com/html/emoticons/maniac.gif"},
      {"code": ":nigger:", "src": "//www.yaplakal.com/html/emoticons/niger.gif"},
      {"code": ":rap:", "src": "//www.yaplakal.com/html/emoticons/rap.gif"},
      {"code": ":repa:", "src": "//www.yaplakal.com/html/emoticons/repa.gif"},
      {"code": ":sucks:", "src": "//www.yaplakal.com/html/emoticons/sucks.gif"},
      {"code": ":super:", "src": "//www.yaplakal.com/html/emoticons/super.gif"},
      {"code": ":surprise:", "src": "//www.yaplakal.com/html/emoticons/surprise.gif"},
      {"code": ":tango:", "src": "//www.yaplakal.com/html/emoticons/tango.gif"},
      {"code": ":umn:", "src": "//www.yaplakal.com/html/emoticons/umn.gif"},
      {"code": ":vilka:", "src": "//www.yaplakal.com/html/emoticons/vilka.gif"},
      {"code": ":wc-smoker:", "src": "//www.yaplakal.com/html/emoticons/wc-smoker.gif"},
      {"code": ":wc:", "src": "//www.yaplakal.com/html/emoticons/wc.gif"},
      {"code": ":horror:", "src": "//www.yaplakal.com/html/emoticons/horror.gif"},
      {"code": ":hacker:", "src": "//www.yaplakal.com/html/emoticons/hacker.gif"},
      {"code": ":bravo:", "src": "//www.yaplakal.com/html/emoticons/bravo.gif"},
      {"code": ":bayan:", "src": "//www.yaplakal.com/html/emoticons/bayan.gif"},
      {"code": ":blin:", "src": "//www.yaplakal.com/html/emoticons/blin.gif"},
      {"code": ":broil:", "src": "//www.yaplakal.com/html/emoticons/broil.gif"},
      {"code": ":divide:", "src": "//www.yaplakal.com/html/emoticons/divide.gif"},
      {"code": ":dontshoot:", "src": "//www.yaplakal.com/html/emoticons/dontshoot.gif"},
      {"code": ":flipa:", "src": "//www.yaplakal.com/html/emoticons/flipa.gif"},
      {"code": ":goodbye:", "src": "//www.yaplakal.com/html/emoticons/goodbye.gif"},
      {"code": ":iq0:", "src": "//www.yaplakal.com/html/emoticons/iq0.gif"},
      {"code": ":kruger:", "src": "//www.yaplakal.com/html/emoticons/kruger.gif"},
      {"code": ":lalala:", "src": "//www.yaplakal.com/html/emoticons/lalala.gif"},
      {"code": ":lamo:", "src": "//www.yaplakal.com/html/emoticons/lamo.gif"},
      {"code": ":murdered:", "src": "//www.yaplakal.com/html/emoticons/murdered.gif"},
      {"code": ":fucknark:", "src": "//www.yaplakal.com/html/emoticons/nonark.gif"},
      {"code": ":oob:", "src": "//www.yaplakal.com/html/emoticons/oob.gif"},
      {"code": ":pop:", "src": "//www.yaplakal.com/html/emoticons/pop.gif"},
      {"code": ":rip:", "src": "//www.yaplakal.com/html/emoticons/rip.gif"},
      {"code": ":rofl:", "src": "//www.yaplakal.com/html/emoticons/rofl.gif"},
      {"code": ":scary:", "src": "//www.yaplakal.com/html/emoticons/scary.gif"},
      {"code": ":shot:", "src": "//www.yaplakal.com/html/emoticons/shoot.gif"},
      {"code": ":slavarossii:", "src": "//www.yaplakal.com/html/emoticons/slava.gif"},
      {"code": ":sterva:", "src": "//www.yaplakal.com/html/emoticons/sterva.gif"},
      {"code": ":lupa:", "src": "//www.yaplakal.com/html/emoticons/lupa.gif"},
      {"code": ":cow:", "src": "//www.yaplakal.com/html/emoticons/cow.gif"},
      {"code": ":degny:", "src": "//www.yaplakal.com/html/emoticons/degny.gif"},
      {"code": ":ny:", "src": "//www.yaplakal.com/html/emoticons/genthny.gif"},
      {"code": ":inna:", "src": "//www.yaplakal.com/html/emoticons/cheer.gif"},
      {"code": ":brake:", "src": "//www.yaplakal.com/html/emoticons/brake.gif"},
      {"code": ":rusdeg:", "src": "//www.yaplakal.com/html/emoticons/rusdeg.gif"},
      {"code": ":elka:", "src": "//www.yaplakal.com/html/emoticons/elka.gif"},
      {"code": ":uho:", "src": "//www.yaplakal.com/html/emoticons/doff.gif"},
      {"code": ":fear:", "src": "//www.yaplakal.com/html/emoticons/fear.gif"},
      {"code": ":fecal:", "src": "//www.yaplakal.com/html/emoticons/fecal.gif"},
      {"code": ":inlove:", "src": "//www.yaplakal.com/html/emoticons/inlove.gif"},
      {"code": ":off:", "src": "//www.yaplakal.com/html/emoticons/off.gif"},
      {"code": ":prevedsmilie:", "src": "//www.yaplakal.com/html/emoticons/prevedsmilie.gif"},
      {"code": ":sheep:", "src": "//www.yaplakal.com/html/emoticons/sheep.gif"},
      {"code": ":smoker:", "src": "//www.yaplakal.com/html/emoticons/smoker.gif"},
      {"code": ":cool:", "src": "//www.yaplakal.com/html/emoticons/sm_biggrin.gif"},
      {"code": ":yad:", "src": "//www.yaplakal.com/html/emoticons/yad.gif"},
      {"code": ":stol:", "src": "//www.yaplakal.com/html/emoticons/stol.gif"},
      {"code": ":tits:", "src": "//www.yaplakal.com/html/emoticons/tits.gif"},
      {"code": ":green:", "src": "//www.yaplakal.com/html/emoticons/green.gif"},
      {"code": ":kashak:", "src": "//www.yaplakal.com/html/emoticons/koshka.gif"},
      {"code": ":kot_obormot:", "src": "//www.yaplakal.com/html/emoticons/kot.gif"},
      {"code": ":suicide:", "src": "//www.yaplakal.com/html/emoticons/suicide.gif"},
      {"code": ":ktulhu:", "src": "//www.yaplakal.com/html/emoticons/ktulhu.gif"},
      {"code": ":rayonneg:", "src": "//www.yaplakal.com/html/emoticons/gopnek.gif"},
      {"code": ":simpa:", "src": "//www.yaplakal.com/html/emoticons/star.gif"},
      {"code": ":fekaloid:", "src": "//www.yaplakal.com/html/emoticons/fekaloid.gif"},
      {"code": ":flirt:", "src": "//www.yaplakal.com/html/emoticons/stp.gif"},
      {"code": ":sleepboobs:", "src": "//www.yaplakal.com/html/emoticons/sleepboobs.gif"},
      {"code": ":toper:", "src": "//www.yaplakal.com/html/emoticons/toper.gif"},
      {"code": ":bdsm:", "src": "//www.yaplakal.com/html/emoticons/bdsm.gif"},
      {"code": ":michael:", "src": "//www.yaplakal.com/html/emoticons/mike.gif"},
      {"code": ":old:", "src": "//www.yaplakal.com/html/emoticons/old.gif"},
      {"code": ":popcorn:", "src": "//www.yaplakal.com/html/emoticons/popcorn.gif"},
      {"code": ":facepalm:", "src": "//www.yaplakal.com/html/emoticons/faceoff.gif"}
    ];

    let cols = parseInt(CONFIG.smilies_columns);
    if(!cols || cols < 2 || cols > 5) cols = 2;

    const details = document.createElement('details');
    details.className = 'smilies-details';
    details.style.width = '100%';

    const summary = document.createElement('summary');
    summary.textContent = 'Смайлики';
    summary.style.fontSize = '.9em';
    summary.style.cursor = 'pointer';
    summary.style.paddingBottom = '.25em';
    details.appendChild(summary);

    // Создаём таблицу
    const table = document.createElement('table');
    table.className = 'smilies-table';
    table.cellSpacing = '0';
    table.cellPadding = '0';
    table.style.borderCollapse = 'collapse';

    let row = null;

    smilies.forEach((smile, index) => {
      // Новая строка каждые `cols` элементов
      if (index % cols === 0) {
        row = document.createElement('tr');
        table.appendChild(row);
      }

      // Ячейка таблицы
      const cell = document.createElement('td');
      cell.className = 'smile-cell';
      cell.align = 'center';
      cell.valign = 'top';
      cell.style.padding = '4px 0px';

      // Изображение смайла
      const img = document.createElement('img');
      img.src = smile.src;
      img.alt = smile.code;
      img.setAttribute('equalText', smile.code);
      img.onclick = function() { addSmail(this); };
      img.style.cursor = 'pointer';
      img.style.border = 'none';
      img.style.verticalAlign = 'middle';

      cell.appendChild(img);

      // Текст смайла под картинкой (если нужно)
      if(CONFIG.smilies_text == 'title')
      {
           img.title = smile.code;
      }
      else if(CONFIG.smilies_text == 'bottom')
      {
          const codeDiv = document.createElement('div');
          codeDiv.className = 'smile-code';
          codeDiv.textContent = smile.code;
          codeDiv.style.fontSize = '11px';
          codeDiv.style.color = '#555';
          codeDiv.style.marginTop = '4px';
          codeDiv.style.lineHeight = '1.2';
          cell.appendChild(codeDiv);
      }

      row.appendChild(cell);
    });

    const smiliesDiv = document.createElement('div');
    smiliesDiv.style.overflowY = 'scroll';
    smiliesDiv.style.height = layout.isSimpleForm ? '18em' : '27em';
    smiliesDiv.appendChild(table);
    details.appendChild(smiliesDiv)
    layout.elem.appendChild(details);

    return details; // возвращаем ссылку для дальнейшего управления
}


function showToastMessage(text) 
{
    toast = document.querySelector('#ext-toast');
    if(!toast)
    {
        toast = document.createElement('div');
        toast.id = 'ext-toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.append(toast);
     }

    if(typeof toastTimer != 'undefined') clearTimeout(toastTimer);
    toast.innerHTML = text;
    toast.classList.add('show');

    toastTimer = setTimeout(() => {toast.classList.remove('show');}, 1750); // окно исчезнет через 2 секунды
}

function citateHandler()
{
/*    let td_citate = document.querySelectorAll('td.citate');
    for(let i = 0, l = td_citate.length; i < l; i++)
    {
        let tab = td_citate[i].closest('table');
        if(tab) tab.classList.add('table-citate');
    }*/
/*
  document.querySelectorAll('td.citate').forEach(td => {
        td.addEventListener('mouseenter', function(e) {
            // Применяем стиль только к элементу, на который навели
            if (e.currentTarget === e.target.closest('td.citate')) {
                this.dataset.hover = 'true';
                this.style.background = 'OldLace';
            }
        });
        
        td.addEventListener('mouseleave', function(e) {
            if (e.currentTarget === e.target.closest('td.citate')) {
                delete this.dataset.hover;
                this.style.background = 'citate_bg_color'; // сброс к стилю из CSS
            }
        });
    });*/
}