import 'server-only';
import { query, asJson } from './db';

const bool = (v) => v === 1 || v === true || v === '1';

function hydrateForm(row) {
  if (!row) return null;
  return {
    ...row,
    is_public: bool(row.is_public),
    recaptcha_enabled: bool(row.recaptcha_enabled),
    branding_enabled: bool(row.branding_enabled),
    task_template: asJson(row.task_template, {}),
  };
}
function hydrateField(row) {
  return { ...row, required: bool(row.required), options: asJson(row.options, []), config: asJson(row.config, {}) };
}
function hydrateTask(row) {
  return { ...row, tags: asJson(row.tags, []), custom_fields: asJson(row.custom_fields, {}) };
}

export async function listForms() {
  const rows = await query('SELECT * FROM forms ORDER BY created_at DESC');
  return rows.map(hydrateForm);
}

export async function getFormById(id) {
  const rows = await query('SELECT * FROM forms WHERE id = ? LIMIT 1', [id]);
  return hydrateForm(rows[0]);
}

export async function getFormByPublicId(publicId) {
  const rows = await query('SELECT * FROM forms WHERE public_id = ? LIMIT 1', [publicId]);
  return hydrateForm(rows[0]);
}

export async function getFields(formId) {
  const rows = await query('SELECT * FROM form_fields WHERE form_id = ? ORDER BY position ASC', [formId]);
  return rows.map(hydrateField);
}

// Spaces with their nested lists, for the location picker + sidebar.
export async function getSpacesTree() {
  const spaces = await query('SELECT * FROM spaces ORDER BY created_at ASC');
  const lists = await query('SELECT * FROM lists ORDER BY created_at ASC');
  return spaces.map((s) => ({ ...s, lists: lists.filter((l) => l.space_id === s.id) }));
}

export async function getListById(id) {
  const rows = await query('SELECT * FROM lists WHERE id = ? LIMIT 1', [id]);
  const row = rows[0];
  return row ? { ...row, statuses: asJson(row.statuses, ['todo', 'in_progress', 'complete']) } : null;
}

export async function getTasks({ listId, formId } = {}) {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (listId) { sql += ' AND list_id = ?'; params.push(listId); }
  if (formId) { sql += ' AND form_id = ?'; params.push(formId); }
  sql += ' ORDER BY created_at DESC';
  const rows = await query(sql, params);
  return rows.map(hydrateTask);
}

export async function locationLabel(form) {
  try {
    if (form.list_id) {
      const l = (await query('SELECT * FROM lists WHERE id=?', [form.list_id]))[0];
      if (l) { const s = (await query('SELECT name FROM spaces WHERE id=?', [l.space_id]))[0]; return `${s?.name || '?'} / ${l.name} · List`; }
    }
    if (form.folder_id) {
      const fo = (await query('SELECT * FROM folders WHERE id=?', [form.folder_id]))[0];
      if (fo) { const s = (await query('SELECT name FROM spaces WHERE id=?', [fo.space_id]))[0]; return `${s?.name || '?'} / ${fo.name} · Folder`; }
    }
    if (form.space_id) {
      const s = (await query('SELECT name FROM spaces WHERE id=?', [form.space_id]))[0];
      if (s) return `${s.name} · Space`;
    }
  } catch { /* ignore */ }
  return 'Unknown location';
}
