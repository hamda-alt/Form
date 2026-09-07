'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction, asJson } from './db';
import { uid, computeKeys } from './fieldTypes';
import { instantiateTemplate } from './templates';

const FIELD_COLS = ['field_key', 'field_type', 'label', 'placeholder', 'help_text', 'required', 'options', 'config', 'task_property', 'position'];
const DEFAULT_STATUSES = ['todo', 'in_progress', 'complete'];

async function insertFieldsTx(conn, formId, fields) {
  const keyed = computeKeys(fields);
  for (const f of keyed) {
    await conn.query(
      `INSERT INTO form_fields (id, form_id, field_key, field_type, label, placeholder, help_text, required, options, config, task_property, position)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uid(), formId, f.field_key, f.field_type, f.label, f.placeholder || null, f.help_text || null,
       f.required ? 1 : 0, JSON.stringify(f.options || []), JSON.stringify(f.config || {}), f.task_property || null, f.position],
    );
  }
}

// Create Space / Folder / List as needed, then the form + its template fields.
export async function createFormFromTemplate(input) {
  const { templateKey, spaceId, newSpaceName, folderId, newFolderName, listId, newListName } = input;
  const t = instantiateTemplate(templateKey);

  const result = await withTransaction(async (conn) => {
    let sId = spaceId;
    if (!sId || sId === '__new__') {
      sId = uid();
      await conn.query('INSERT INTO spaces (id, name) VALUES (?, ?)', [sId, (newSpaceName || 'My Workspace').trim()]);
    }
    let foId = null;
    if (folderId === '__new__') { foId = uid(); await conn.query('INSERT INTO folders (id, space_id, name) VALUES (?,?,?)', [foId, sId, (newFolderName || 'Folder').trim()]); }
    else if (folderId) foId = folderId;

    let lId = null;
    if (listId === '__new__') { lId = uid(); await conn.query('INSERT INTO lists (id, space_id, folder_id, name, statuses) VALUES (?,?,?,?,?)', [lId, sId, foId, (newListName || 'List').trim(), JSON.stringify(DEFAULT_STATUSES)]); }
    else if (listId) lId = listId;

    const formId = uid();
    await conn.query(
      `INSERT INTO forms (id, public_id, space_id, folder_id, list_id, name, description, template_key, primary_color)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [formId, uid(), sId, foId, lId, t.name, t.description || null, t.template_key, t.primary_color || '#7B68EE'],
    );
    await insertFieldsTx(conn, formId, t.fields || []);
    return formId;
  });

  revalidatePath('/forms');
  return { id: result };
}

// Save form settings + replace all fields.
export async function saveForm(id, patch, fields) {
  await withTransaction(async (conn) => {
    await conn.query(
      `UPDATE forms SET name=?, description=?, theme=?, primary_color=?, submit_label=?, success_message=?,
        redirect_url=?, recaptcha_enabled=?, branding_enabled=?, auto_assign_name=?, default_status=?, default_priority=?, task_template=?
       WHERE id=?`,
      [patch.name, patch.description || null, patch.theme, patch.primary_color, patch.submit_label,
       patch.success_message || null, patch.redirect_url || null, patch.recaptcha_enabled ? 1 : 0, patch.branding_enabled ? 1 : 0,
       patch.auto_assign_name || null, patch.default_status, patch.default_priority || null, JSON.stringify(patch.task_template || {}), id],
    );
    await conn.query('DELETE FROM form_fields WHERE form_id=?', [id]);
    await insertFieldsTx(conn, id, fields || []);
  });
  revalidatePath(`/forms/${id}`);
  revalidatePath('/forms');
  return { ok: true };
}

export async function setPublish(id, status) {
  await query('UPDATE forms SET status=? WHERE id=?', [status, id]);
  revalidatePath(`/forms/${id}`);
  revalidatePath('/forms');
  return { ok: true };
}

export async function deleteForm(id) {
  await query('DELETE FROM forms WHERE id=?', [id]);
  revalidatePath('/forms');
  return { ok: true };
}

export async function moveTask(id, status) {
  await query('UPDATE tasks SET status=? WHERE id=?', [status, id]);
  return { ok: true };
}

// Create a task directly on the board ("+ Add Task").
export async function createTask({ listId = null, formId = null, status = 'todo', name }) {
  const id = uid();
  let space_id = null, folder_id = null;
  if (listId) {
    const rows = await query('SELECT space_id, folder_id FROM lists WHERE id=?', [listId]);
    if (rows[0]) { space_id = rows[0].space_id; folder_id = rows[0].folder_id; }
  }
  await query(
    'INSERT INTO tasks (id, space_id, folder_id, list_id, form_id, name, status) VALUES (?,?,?,?,?,?,?)',
    [id, space_id, folder_id, listId, formId, name, status],
  );
  return { ok: true, id };
}

// Persist the list's status columns ("+ Add group" / rename / delete group).
// `statuses` is an array of { key, label, color } objects so custom group names
// and colors survive a reload (legacy string-key arrays are still read fine).
export async function updateListStatuses(listId, statuses) {
  if (!listId) return { ok: false };
  await query('UPDATE lists SET statuses=? WHERE id=?', [JSON.stringify(statuses), listId]);
  revalidatePath(`/board/${listId}`);
  revalidatePath(`/list/${listId}`);
  return { ok: true };
}

// Update a task's name / priority / status (used by the board context menu).
export async function updateTask(id, patch) {
  const cols = [], vals = [];
  if ('name' in patch) { cols.push('name=?'); vals.push(patch.name); }
  if ('status' in patch) { cols.push('status=?'); vals.push(patch.status); }
  if ('priority' in patch) { cols.push('priority=?'); vals.push(patch.priority || null); }
  if (!cols.length) return { ok: true };
  vals.push(id);
  await query(`UPDATE tasks SET ${cols.join(', ')} WHERE id=?`, vals);
  return { ok: true };
}

export async function deleteTask(id) {
  await query('DELETE FROM tasks WHERE id=?', [id]);
  return { ok: true };
}

export async function duplicateTask(id) {
  const rows = await query('SELECT * FROM tasks WHERE id=? LIMIT 1', [id]);
  const t = rows[0];
  if (!t) return { ok: false };
  const newId = uid();
  await query(
    `INSERT INTO tasks (id, space_id, folder_id, list_id, form_id, name, description, status, priority, assignee_name, due_date, tags, custom_fields, position)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, t.space_id, t.folder_id, t.list_id, t.form_id, t.name + ' (copy)', t.description, t.status, t.priority, t.assignee_name, t.due_date, JSON.stringify(asJson(t.tags, [])), JSON.stringify(asJson(t.custom_fields, {})), t.position],
  );
  return { ok: true, id: newId };
}
