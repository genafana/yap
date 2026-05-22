export interface MenuViewportInput {
  x: number;
  y: number;
  viewportW: number;
  viewportH: number;
  menuW: number;
  menuH: number;
  padding?: number;
}

export interface MenuPosition {
  left: number;
  top: number;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
}

export type ContextMenuConfig = Record<string, ContextMenuItem[]>;

const OVERLAY_ID = 'ctxm-overlay';
const TOOLTIP_ID = 'ext-ctx-tooltip';
const TARGET_CLASS = 'has-context-menu';

export function calculateMenuPosition(input: MenuViewportInput): MenuPosition {
  const padding = input.padding ?? 5;

  let left = input.x + padding;
  let top = input.y + padding;

  if (left + input.menuW > input.viewportW) {
    left = input.x - input.menuW - padding;
  }

  if (top + input.menuH > input.viewportH) {
    top = input.y - input.menuH - padding;
  }

  return {
    left: Math.max(padding, Math.min(left, input.viewportW - input.menuW - padding)),
    top: Math.max(padding, Math.min(top, input.viewportH - input.menuH - padding))
  };
}

export function attachContextMenus(
  config: ContextMenuConfig,
  doc: Document = document,
  win: Window = window
): void {
  if (doc.getElementById(OVERLAY_ID) == null) {
    const overlay = doc.createElement('div');
    overlay.className = 'ctxm-overlay';
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', () => hideAllMenus(doc));
    overlay.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      hideAllMenus(doc);
    });
    doc.body.append(overlay);
  }

  if (doc.getElementById(TOOLTIP_ID) == null) {
    const tooltip = doc.createElement('div');
    tooltip.id = TOOLTIP_ID;
    tooltip.className = 'ext-ctx-tooltip';
    tooltip.textContent = 'ПКМ';
    tooltip.style.opacity = '0';
    doc.body.append(tooltip);

    let activeElement: HTMLElement | null = null;
    doc.addEventListener('mouseover', (event) => {
      const target =
        ((event.target as HTMLElement | null)?.closest?.(`.${TARGET_CLASS}`) as HTMLElement | null) ??
        null;
      if (target !== activeElement) {
        activeElement = target;
        tooltip.style.opacity = target == null ? '0' : '1';
      }
    });
    doc.addEventListener('mouseout', (event) => {
      const nextTarget =
        (event.relatedTarget as HTMLElement | null)?.closest?.(`.${TARGET_CLASS}`) ?? null;
      if (activeElement != null && nextTarget == null) {
        activeElement = null;
        tooltip.style.opacity = '0';
      }
    });
    doc.addEventListener('mousemove', (event) => {
      if (activeElement == null) {
        return;
      }

      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY}px`;
    });
  }

  let ctxTarget: HTMLElement | null = null;

  doc.addEventListener('contextmenu', (event) => {
    const target = event.target as HTMLElement | null;
    const ctxElement = target?.closest<HTMLElement>('[ctxm]');
    const menuType = ctxElement?.getAttribute('ctxm') ?? '';

    if (ctxElement == null || config[menuType] == null) {
      return;
    }

    ctxTarget = ctxElement;
    event.preventDefault();
    event.stopPropagation();
    hideAllMenus(doc);
    showMenu(menuType, ctxTarget, event.clientX, event.clientY, config, doc, win);
  });
}

function showMenu(
  menuType: string,
  ctxTarget: HTMLElement,
  x: number,
  y: number,
  config: ContextMenuConfig,
  doc: Document,
  win: Window
): void {
  let menu = doc.getElementById(`ctxm-${menuType}`);
  if (menu == null) {
    menu = createMenuElement(menuType, ctxTarget, config, doc);
    doc.body.append(menu);
  } else {
    rebuildMenuElement(menu, menuType, ctxTarget, config, doc);
  }

  const { left, top } = calculateMenuPosition({
    x,
    y,
    viewportW: win.innerWidth,
    viewportH: win.innerHeight,
    menuW: (menu as HTMLElement).offsetWidth || 220,
    menuH: (menu as HTMLElement).offsetHeight || 100
  });

  (menu as HTMLElement).style.left = `${left}px`;
  (menu as HTMLElement).style.top = `${top}px`;
  (menu as HTMLElement).style.display = 'block';

  const overlay = doc.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (overlay != null) {
    overlay.style.display = 'block';
  }
}

function createMenuElement(
  menuType: string,
  ctxTarget: HTMLElement,
  config: ContextMenuConfig,
  doc: Document
): HTMLElement {
  const menu = doc.createElement('div');
  menu.id = `ctxm-${menuType}`;
  menu.className = 'ctxm-menu';
  rebuildMenuElement(menu, menuType, ctxTarget, config, doc);
  return menu;
}

function rebuildMenuElement(
  menu: Element,
  menuType: string,
  ctxTarget: HTMLElement,
  config: ContextMenuConfig,
  doc: Document
): void {
  menu.replaceChildren();

  for (const item of config[menuType]) {
    if (item.separator) {
      const separator = doc.createElement('div');
      separator.className = 'ctxm-separator';
      menu.append(separator);
    }

    const element = doc.createElement('div');
    element.className = 'ctxm-item';
    element.textContent = item.label;
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      hideAllMenus(doc);
      item.action.call(ctxTarget);
    });
    menu.append(element);
  }
}

export function hideAllMenus(doc: Document = document): void {
  doc.querySelectorAll<HTMLElement>('.ctxm-menu').forEach((menu) => {
    menu.style.display = 'none';
  });

  const overlay = doc.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (overlay != null) {
    overlay.style.display = 'none';
  }
}
