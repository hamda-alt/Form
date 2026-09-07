-- ============================================================================
-- ClickUp-style Form Builder — MySQL schema
-- Hierarchy: spaces -> folders -> lists -> tasks
-- A form always targets a Space, Folder or List (never isolated).
-- A submission atomically creates a form_submissions row AND a tasks row.
-- ============================================================================
-- Run:  mysql -u root -p < db/schema.sql     (or: npm run db:init)
-- ----------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS clickup_forms
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clickup_forms;

-- 1. SPACES ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spaces (
  id          CHAR(36) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  color       VARCHAR(16) DEFAULT '#7B68EE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. FOLDERS (space -> folder) ----------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id          CHAR(36) PRIMARY KEY,
  space_id    CHAR(36) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_folders_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. LISTS (space -> [folder] -> list) --------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id          CHAR(36) PRIMARY KEY,
  space_id    CHAR(36) NOT NULL,
  folder_id   CHAR(36) NULL,
  name        VARCHAR(255) NOT NULL,
  -- Kanban columns; first entry is the default landing status.
  statuses    JSON NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lists_space  FOREIGN KEY (space_id)  REFERENCES spaces(id)  ON DELETE CASCADE,
  CONSTRAINT fk_lists_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. FORMS (must target a space, folder OR list) ----------------------------
CREATE TABLE IF NOT EXISTS forms (
  id                CHAR(36) PRIMARY KEY,
  public_id         CHAR(36) NOT NULL UNIQUE,     -- public URL token
  space_id          CHAR(36) NULL,
  folder_id         CHAR(36) NULL,
  list_id           CHAR(36) NULL,
  name              VARCHAR(255) NOT NULL DEFAULT 'Untitled form',
  description       TEXT NULL,
  template_key      VARCHAR(64) NULL,
  status            VARCHAR(16) NOT NULL DEFAULT 'draft',   -- draft | published
  is_public         TINYINT(1) NOT NULL DEFAULT 1,
  -- styling
  theme             VARCHAR(8)  NOT NULL DEFAULT 'light',   -- light | dark
  primary_color     VARCHAR(16) NOT NULL DEFAULT '#7B68EE',
  -- submission behaviour
  submit_label      VARCHAR(64)  NOT NULL DEFAULT 'Submit',
  success_message   TEXT NULL,
  redirect_url      TEXT NULL,
  recaptcha_enabled TINYINT(1) NOT NULL DEFAULT 0,
  branding_enabled  TINYINT(1) NOT NULL DEFAULT 1,
  -- task automation
  auto_assign_name  VARCHAR(255) NULL,
  default_status    VARCHAR(64) NOT NULL DEFAULT 'todo',
  default_priority  VARCHAR(16) NULL,
  task_template     JSON NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_forms_space  FOREIGN KEY (space_id)  REFERENCES spaces(id)  ON DELETE CASCADE,
  CONSTRAINT fk_forms_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  CONSTRAINT fk_forms_list   FOREIGN KEY (list_id)   REFERENCES lists(id)   ON DELETE CASCADE,
  -- "A form cannot exist in isolation"
  CONSTRAINT chk_forms_location CHECK (space_id IS NOT NULL OR folder_id IS NOT NULL OR list_id IS NOT NULL)
) ENGINE=InnoDB;
CREATE INDEX idx_forms_list ON forms (list_id);

-- 5. FORM_FIELDS (dynamic schema) -------------------------------------------
CREATE TABLE IF NOT EXISTS form_fields (
  id            CHAR(36) PRIMARY KEY,
  form_id       CHAR(36) NOT NULL,
  field_key     VARCHAR(64) NOT NULL,
  field_type    VARCHAR(32) NOT NULL,
  label         VARCHAR(255) NOT NULL,
  placeholder   VARCHAR(255) NULL,
  help_text     VARCHAR(500) NULL,
  required      TINYINT(1) NOT NULL DEFAULT 0,
  options       JSON NULL,
  config        JSON NULL,
  -- task_name | description | assignee | priority | due_date | tags | status | custom:<Label>
  task_property VARCHAR(96) NULL,
  position      INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_fields_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
  CONSTRAINT uq_field_key UNIQUE (form_id, field_key)
) ENGINE=InnoDB;
CREATE INDEX idx_fields_form ON form_fields (form_id, position);

-- 6. FORM_SUBMISSIONS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_submissions (
  id               CHAR(36) PRIMARY KEY,
  form_id          CHAR(36) NOT NULL,
  task_id          CHAR(36) NULL,
  answers          JSON NOT NULL,
  respondent_name  VARCHAR(255) NULL,
  respondent_email VARCHAR(255) NULL,
  meta             JSON NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_sub_form ON form_submissions (form_id, created_at);

-- 7. TASKS (generated in the target list/folder/space) ----------------------
CREATE TABLE IF NOT EXISTS tasks (
  id            CHAR(36) PRIMARY KEY,
  space_id      CHAR(36) NULL,
  folder_id     CHAR(36) NULL,
  list_id       CHAR(36) NULL,
  form_id       CHAR(36) NULL,
  submission_id CHAR(36) NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  status        VARCHAR(64) NOT NULL DEFAULT 'todo',
  priority      VARCHAR(16) NULL,
  assignee_name VARCHAR(255) NULL,
  due_date      DATETIME NULL,
  tags          JSON NULL,
  custom_fields JSON NULL,
  position      INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_sub  FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_tasks_list ON tasks (list_id, status, position);
CREATE INDEX idx_tasks_form ON tasks (form_id);

-- Close the loop: submission -> task (added after tasks exists).
ALTER TABLE form_submissions
  ADD CONSTRAINT fk_sub_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
