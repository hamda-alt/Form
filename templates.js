import { makeField, makeTP } from './fieldTypes';

const f = (type, label, extra = {}) => Object.assign(makeField(type), { label }, extra);
const tp = (prop, label, extra = {}) => Object.assign(makeTP(prop), label ? { label } : {}, extra);
const withPos = (fields) => fields.map((fl, i) => ({ ...fl, position: i }));

export const TEMPLATES = [
  { key: 'feedback', name: 'Feedback Form', desc: 'Survey and collect feedback', icon: 'align', accent: '#14B8A6',
    build: () => ({ name: 'Feedback Form', description: 'We would love to hear your thoughts.', primary_color: '#14B8A6', fields: withPos([
      tp('task_name', 'Your name', { placeholder: 'Jane Doe', required: true }),
      f('email', 'Email', { required: true }),
      f('rating', 'How satisfied are you?', { required: true, task_property: 'custom:Satisfaction', config: { scale: 5 } }),
      f('dropdown', 'Feedback about?', { task_property: 'tags', options: [{ label: 'Product', value: 'product' }, { label: 'Support', value: 'support' }, { label: 'Billing', value: 'billing' }] }),
      tp('description', 'Tell us more', { label: 'Your feedback', placeholder: 'What can we improve?' }),
    ]) }) },
  { key: 'project_intake', name: 'Project Intake', desc: 'Streamline new project requests', icon: 'list', accent: '#EC4899',
    build: () => ({ name: 'Project Intake', description: 'Submit a new project request to the team.', primary_color: '#7B68EE', fields: withPos([
      tp('task_name', 'Project name', { placeholder: 'Website redesign', required: true }),
      tp('description', 'Project brief', { placeholder: 'Goals, scope, context…' }),
      tp('priority', 'Priority'),
      tp('due_date', 'Target due date'),
      f('short_text', 'Requested by', { task_property: 'custom:Requested by' }),
      f('number', 'Estimated budget (USD)', { task_property: 'custom:Budget' }),
    ]) }) },
  { key: 'order_form', name: 'Order Form', desc: 'Capture and process client orders', icon: 'cart', accent: '#8B5CF6',
    build: () => ({ name: 'Order Form', description: 'Place your order below.', primary_color: '#8B5CF6', fields: withPos([
      tp('task_name', 'Customer name', { required: true }),
      f('email', 'Email', { required: true }),
      f('dropdown', 'Product', { required: true, task_property: 'custom:Product', options: [{ label: 'Starter — $29', value: 'starter' }, { label: 'Pro — $79', value: 'pro' }, { label: 'Enterprise', value: 'enterprise' }] }),
      f('number', 'Quantity', { required: true, task_property: 'custom:Quantity' }),
      f('long_text', 'Shipping address', { required: true, task_property: 'custom:Shipping address' }),
    ]) }) },
  { key: 'job_application', name: 'Job Application', desc: 'Accept and review applications for open roles', icon: 'user', accent: '#F97316',
    build: () => ({ name: 'Job Application', description: 'Apply to join our team.', primary_color: '#F97316', fields: withPos([
      tp('task_name', 'Full name', { required: true }),
      f('email', 'Email', { required: true }),
      f('phone', 'Phone', { required: true }),
      f('dropdown', 'Position', { required: true, task_property: 'tags', options: [{ label: 'Engineering', value: 'engineering' }, { label: 'Design', value: 'design' }, { label: 'Sales', value: 'sales' }] }),
      f('file_upload', 'Resume / CV', { required: true, task_property: 'custom:Resume', config: { accept: '.pdf,.doc,.docx', maxSizeMb: 10 } }),
      tp('description', 'Cover letter', { label: 'Why are you a great fit?' }),
    ]) }) },
  { key: 'it_request', name: 'IT Requests', desc: 'Triage and prioritize IT service requests', icon: 'list', accent: '#3B82F6',
    build: () => ({ name: 'IT Requests', description: 'Report an issue or request access.', primary_color: '#3B82F6', fields: withPos([
      tp('task_name', 'Summary', { required: true }),
      f('short_text', 'Your name', { required: true, task_property: 'assignee' }),
      f('dropdown', 'Request type', { required: true, task_property: 'tags', options: [{ label: 'Hardware', value: 'hardware' }, { label: 'Software', value: 'software' }, { label: 'Access', value: 'access' }] }),
      tp('priority', 'Priority'),
      tp('description', 'Describe the issue', { required: true }),
    ]) }) },
  { key: 'scratch', name: 'Start from scratch', desc: '', icon: 'plus', accent: '#6b7280',
    build: () => ({ name: 'Untitled form', primary_color: '#7B68EE', fields: [] }) },
];

export function instantiateTemplate(key) {
  const t = TEMPLATES.find((x) => x.key === key) || TEMPLATES[0];
  return { template_key: t.key, ...t.build() };
}
