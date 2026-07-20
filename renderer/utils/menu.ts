export type MenuItem = {
  label?: string;
  type?: string;
  role?: string;
  checked?: boolean;
  enabled?: boolean;
  visible?: boolean;
  accelerator?: string;
  icon?: string;
  submenu?: MenuItem[];
  subMenu?: MenuItem[];
  separator?: boolean;
  click?: () => any;
};

export const popupMenu = async (template: MenuItem[], options: Record<string, any> = {}) => {
  let nextId = 0;
  const callbacks = new Map<string, () => any>();
  const serialize = (items: MenuItem[]): any[] => items.map(item => {
    if (item.separator) {
      return {type: 'separator'};
    }

    const {click, submenu, subMenu, ...rest} = item;
    const selectionId = click ? String(++nextId) : undefined;
    const children = submenu ?? subMenu ?? [];
    if (selectionId && click) {
      callbacks.set(selectionId, click);
    }

    return {
      ...rest,
      selectionId,
      submenu: children.length > 0 ? serialize(children) : undefined
    };
  });

  const selection = await window.kap.menu.popup(serialize(template), options);
  if (selection) {
    await callbacks.get(selection)?.();
  }
};
