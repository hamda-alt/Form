// Seeds a Space + List + a PUBLISHED "Project Intake" form (with fields) so the
// running app has something to show. Prints the created ids as JSON.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of env.split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
} catch { /* ignore */ }

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
const spaceId = randomUUID(), listId = randomUUID(), formId = randomUUID(), publicId = randomUUID();

await conn.query('INSERT INTO spaces (id,name,color) VALUES (?,?,?)', [spaceId, 'Team Space', '#7B68EE']);
await conn.query('INSERT INTO lists (id,space_id,name,statuses) VALUES (?,?,?,?)', [listId, spaceId, 'Incoming', JSON.stringify(['todo', 'in_progress', 'complete'])]);
await conn.query(
  'INSERT INTO forms (id,public_id,space_id,list_id,name,description,template_key,status,primary_color,default_status,default_priority) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  [formId, publicId, spaceId, listId, 'Project Intake', 'Submit a new project request to the team.', 'project_intake', 'published', '#7B68EE', 'todo', 'normal'],
);

const fields = [
  ['project_name', 'short_text', 'Project name', 1, [], 'task_name'],
  ['project_brief', 'long_text', 'Project brief', 0, [], 'description'],
  ['priority', 'dropdown', 'Priority', 0, [{ label: 'Urgent', value: 'urgent' }, { label: 'High', value: 'high' }, { label: 'Normal', value: 'normal' }, { label: 'Low', value: 'low' }], 'priority'],
  ['target_due_date', 'date', 'Target due date', 0, [], 'due_date'],
  ['requested_by', 'short_text', 'Requested by', 0, [], 'custom:Requested by'],
  ['estimated_budget_usd', 'number', 'Estimated budget (USD)', 0, [], 'custom:Budget'],
];
let pos = 0;
for (const [key, type, label, req, opts, tp] of fields) {
  await conn.query(
    'INSERT INTO form_fields (id,form_id,field_key,field_type,label,required,options,config,task_property,position) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [randomUUID(), formId, key, type, label, req, JSON.stringify(opts), JSON.stringify({}), tp, pos++],
  );
}

// One example task so the board isn't empty on first look.
const exId = randomUUID();
await conn.query(
  'INSERT INTO tasks (id,space_id,list_id,form_id,name,description,status,priority,assignee_name,tags,custom_fields) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  [exId, spaceId, listId, formId, 'Marketing site refresh', 'Example task.', 'in_progress', 'high', 'Alex Rivera', JSON.stringify(['intake', 'web']), JSON.stringify({ 'Requested by': 'Sam Lee', Budget: '8000' })],
);

console.log(JSON.stringify({ spaceId, listId, formId, publicId }));
await conn.end();
