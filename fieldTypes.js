// Shared field-type registry + Task Property mappings (no React — safe on
// both server and client).

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

export const slug = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';

export const keyOf = (f) => f.field_key || slug(f.label) || f.id;

export const FIELD_TYPES = [
  { type: 'short_text', label: 'Short text', icon: 'type', hint: 'Single line' },
  { type: 'long_text', label: 'Long text', icon: 'align', hint: 'Paragraph' },
  { type: 'email', label: 'Email', icon: 'mail', hint: 'Validated email' },
  { type: 'phone', label: 'Phone', icon: 'phone', hint: 'Phone number' },
  { type: 'number', label: 'Number', icon: 'hash', hint: 'Numeric' },
  { type: 'dropdown', label: 'Dropdown', icon: 'chevSquare', hint: 'Pick one' },
  { type: 'multi_select', label: 'Multiple choice', icon: 'checks', hint: 'Pick many' },
  { type: 'checkbox', label: 'Checkbox', icon: 'checkbox', hint: 'Yes / no' },
  { type: 'date', label: 'Date', icon: 'cal', hint: 'Date picker' },
  { type: 'rating', label: 'Rating', icon: 'star', hint: '1–5 stars' },
  { type: 'file_upload', label: 'File upload', icon: 'clip', hint: 'Attachment' },
  { type: 'signature', label: 'Signature', icon: 'pen', hint: 'Draw to sign' },
  { type: 'info_block', label: 'Information Block', icon: 'align', hint: 'Text / heading (no input)' },
];

export const TASK_PROPERTIES = [
  { property: 'task_name', label: 'Task Name', icon: 'list', fieldType: 'short_text' },
  { property: 'description', label: 'Description', icon: 'align', fieldType: 'long_text' },
  { property: 'assignee', label: 'Assignee', icon: 'user', fieldType: 'short_text' },
  { property: 'priority', label: 'Priority', icon: 'flag', fieldType: 'dropdown',
    options: [{ label: 'Urgent', value: 'urgent' }, { label: 'High', value: 'high' }, { label: 'Normal', value: 'normal' }, { label: 'Low', value: 'low' }] },
  { property: 'due_date', label: 'Due Date', icon: 'clock', fieldType: 'date' },
  { property: 'tags', label: 'Tags', icon: 'tag', fieldType: 'multi_select' },
  { property: 'status', label: 'Status', icon: 'circle', fieldType: 'dropdown',
    options: [{ label: 'To Do', value: 'todo' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Complete', value: 'complete' }] },
  { property: 'custom', label: 'Custom Field', icon: 'braces', fieldType: 'short_text' },
];

export const PRIORITIES = {
  urgent: { label: 'Urgent', color: '#E5484D' },
  high: { label: 'High', color: '#F5A524' },
  normal: { label: 'Normal', color: '#3B82F6' },
  low: { label: 'Low', color: '#8b8b96' },
};

export const STATUSES = ['todo', 'in_progress', 'complete'];
export const STATUS_LABEL = { todo: 'TO DO', in_progress: 'IN PROGRESS', complete: 'COMPLETE' };
export const STATUS_DOT = { todo: '#8b95a5', in_progress: '#5B7FFF', complete: '#10B981' };

export const iconFor = (t) => (FIELD_TYPES.find((f) => f.type === t) || {}).icon || 'type';
export const labelFor = (t) => (FIELD_TYPES.find((f) => f.type === t) || {}).label || t;

export function makeField(type) {
  const meta = FIELD_TYPES.find((f) => f.type === type) || FIELD_TYPES[0];
  const opts = type === 'dropdown' || type === 'multi_select';
  return {
    id: uid(), field_key: '', field_type: type, label: meta.label, placeholder: '', help_text: '',
    required: false,
    options: opts ? [{ label: 'Option 1', value: 'option_1' }, { label: 'Option 2', value: 'option_2' }, { label: 'Option 3', value: 'option_3' }] : [],
    config: type === 'rating' ? { scale: 5 } : type === 'file_upload' ? { accept: '', maxSizeMb: 10 } : {},
    task_property: null,
  };
}

export function makeTP(property) {
  const meta = TASK_PROPERTIES.find((t) => t.property === property) || TASK_PROPERTIES[0];
  const f = makeField(meta.fieldType);
  f.label = meta.label === 'Custom Field' ? 'Custom field' : meta.label;
  f.task_property = property === 'custom' ? 'custom:Custom field' : property;
  if (meta.options) f.options = meta.options.map((o) => ({ ...o }));
  if (property === 'task_name' || property === 'description') f.required = true;
  return f;
}

// Assign stable unique field_keys from labels.
export function computeKeys(fields) {
  const seen = new Set();
  return fields.map((f, i) => {
    let base = f.field_key || slug(f.label); let key = base; let n = 2;
    while (seen.has(key)) key = `${base}_${n++}`;
    seen.add(key);
    return { ...f, field_key: key, position: i };
  });
}
