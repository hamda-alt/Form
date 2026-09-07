import { keyOf } from './fieldTypes';

// Map submitted answers onto a task — the JS twin of ClickUp's automation.
// Used by the atomic submit route so submission + task stay consistent.
export function buildTaskFromAnswers(form, fields, answers) {
  const tt = form.task_template || {};
  let name = '';
  let description = tt.description || '';
  let status = form.default_status || 'todo';
  let priority = form.default_priority || null;
  let assignee = form.auto_assign_name || null;
  let due = null;
  let tags = Array.isArray(tt.tags) ? [...tt.tags] : [];
  const custom = {};

  for (const f of fields) {
    if (!f.task_property) continue;
    const raw = answers[keyOf(f)];
    const val = Array.isArray(raw) ? raw : (raw == null ? '' : String(raw));
    const tp = f.task_property;
    if (tp === 'task_name') { if (val) name = val; }
    else if (tp === 'description') { if (val) description = (description ? description + '\n\n' : '') + val; }
    else if (tp === 'assignee') { if (val) assignee = val; }
    else if (tp === 'priority') { if (val) priority = val; }
    else if (tp === 'status') { if (val) status = val; }
    else if (tp === 'due_date') { if (val) due = String(val).slice(0, 10); } // YYYY-MM-DD
    else if (tp === 'tags') { if (Array.isArray(raw)) tags = tags.concat(raw); else if (val) tags.push(val); }
    else if (tp.startsWith('custom:')) custom[tp.slice(7)] = Array.isArray(raw) ? raw.join(', ') : val;
  }

  if (!name) name = `${form.name} — new submission`;
  return { name, description: description || null, status, priority, assignee, due, tags, custom };
}
