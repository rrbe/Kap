export const flags = {
  get: (key: 'backgroundEditorConversion' | 'editorDragTooltip') => window.kap.flags.get(key),
  set: (key: 'backgroundEditorConversion' | 'editorDragTooltip', value: boolean) => window.kap.flags.set(key, value)
};
