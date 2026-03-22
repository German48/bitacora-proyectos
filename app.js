const STORAGE_KEY = 'bitacora-proyectos-v5';
const LEGACY_STORAGE_KEYS = ['bitacora-proyectos-v4', 'bitacora-proyectos-v3', 'bitacora-proyectos-v2'];
const THEME_STORAGE_KEY = 'bitacora-proyectos-theme';

const PROJECT_STATES = ['borrador', 'activo', 'en pausa', 'cerrado'];
const PROGRESS_TYPES = ['reunión', 'tarea realizada', 'decisión', 'incidencia', 'propuesta', 'revisión', 'cierre parcial'];
const DIARY_TYPES = ['actuación realizada', 'seguimiento', 'incidencia', 'propuesta', 'coordinación', 'material preparado', 'revisión'];
const TASK_STATES = ['pendiente', 'en proceso', 'hecha', 'bloqueada'];
const TASK_PRIORITIES = ['baja', 'media', 'alta'];
const DOCUMENT_TYPES = ['acta', 'borrador', 'memoria parcial', 'recurso', 'presupuesto', 'enlace OneDrive', 'otro'];
const THEME_OPTIONS = ['auto', 'claro', 'oscuro'];

const state = {
  projects: loadProjects(),
  selectedProjectId: null,
  activeView: 'project',
  deferredInstallPrompt: null,
  theme: loadThemePreference(),
  systemThemeMedia: window.matchMedia('(prefers-color-scheme: dark)'),
  diaryFilters: {
    participant: '',
    type: '',
    from: '',
    to: ''
  },
  importPreview: null,
  mergeDecisions: {}
};

const el = {
  projectList: document.getElementById('project-list'),
  projectView: document.getElementById('project-view'),
  emptyState: document.getElementById('empty-state'),
  projectDialog: document.getElementById('project-dialog'),
  projectForm: document.getElementById('project-form'),
  entryDialog: document.getElementById('entry-dialog'),
  entryForm: document.getElementById('entry-form'),
  entryFields: document.getElementById('entry-fields'),
  reportOutput: document.getElementById('report-output'),
  reportFeedback: document.getElementById('report-feedback'),
  globalReportOutput: document.getElementById('global-report-output'),
  globalReportFeedback: document.getElementById('global-report-feedback'),
  statusSelect: document.getElementById('project-status-select'),
  projectSection: document.getElementById('project-section'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
  sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
  globalView: document.getElementById('global-view'),
  showProjectViewBtn: document.getElementById('show-project-view-btn'),
  showGlobalViewBtn: document.getElementById('show-global-view-btn'),
  installAppBtn: document.getElementById('install-app-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  recentProgressList: document.getElementById('recent-progress-list'),
  recentProgressToggle: document.getElementById('recent-progress-toggle'),
  recentProgressChevron: document.getElementById('recent-progress-chevron'),
  participantDiaryCount: document.getElementById('participant-diary-count'),
  participantDiaryFilterParticipant: document.getElementById('participant-diary-filter-participant'),
  participantDiaryFilterType: document.getElementById('participant-diary-filter-type'),
  participantDiaryFilterFrom: document.getElementById('participant-diary-filter-from'),
  participantDiaryFilterTo: document.getElementById('participant-diary-filter-to'),
  participantDiaryClearFiltersBtn: document.getElementById('participant-diary-clear-filters-btn'),
  closingSummary: document.getElementById('closing-summary'),
  closingHelperText: document.getElementById('closing-helper-text'),
  closingStatusBadge: document.getElementById('closing-status-badge'),
  projectClosingCard: document.getElementById('project-closing-card'),
  exportProjectReportTxtBtn: document.getElementById('export-project-report-txt-btn'),
  exportProjectReportMdBtn: document.getElementById('export-project-report-md-btn'),
  exportGlobalReportTxtBtn: document.getElementById('export-global-report-txt-btn'),
  exportGlobalReportMdBtn: document.getElementById('export-global-report-md-btn'),
  exportBackupBtn: document.getElementById('export-backup-btn'),
  importBackupBtn: document.getElementById('import-backup-btn'),
  importBackupInput: document.getElementById('import-backup-input'),
  importPreviewPanel: document.getElementById('import-preview-panel'),
  importPreviewSummary: document.getElementById('import-preview-summary'),
  importPreviewProjects: document.getElementById('import-preview-projects'),
  importPreviewProgress: document.getElementById('import-preview-progress'),
  importPreviewTasks: document.getElementById('import-preview-tasks'),
  importPreviewDocuments: document.getElementById('import-preview-documents'),
  importPreviewList: document.getElementById('import-preview-list'),
  importPreviewWarning: document.getElementById('import-preview-warning'),
  importCompareNewProjects: document.getElementById('import-compare-new-projects'),
  importCompareExistingProjects: document.getElementById('import-compare-existing-projects'),
  importCompareDuplicateProjects: document.getElementById('import-compare-duplicate-projects'),
  importCompareChangedProjects: document.getElementById('import-compare-changed-projects'),
  importCompareSummary: document.getElementById('import-compare-summary'),
  confirmImportBtn: document.getElementById('confirm-import-btn'),
  cancelImportPreviewBtn: document.getElementById('cancel-import-preview-btn'),
  replaceAllImportBtn: document.getElementById('replace-all-import-btn'),
  importMergePanel: document.getElementById('import-merge-panel'),
  importMergeList: document.getElementById('import-merge-list'),
  importMergeHint: document.getElementById('import-merge-hint'),
  importMergeUseImportedBtn: document.getElementById('import-merge-use-imported-btn')
};

// Arranque: cargar desde Supabase
sbLoad().then((row) => {
  if (row && Array.isArray(row.data) && row.data.length > 0) {
    state.projects = normalizeProjects(row.data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    if (state.projects.length > 0) state.selectedProjectId = state.projects[0].id;
    sbLastUpdatedAt = row.updated_at;
    renderAll();
  }
  // Arrancar auto-sync cada 30s
  sbStartAutoSync((remoteProjects) => {
    state.projects = normalizeProjects(remoteProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    ensureSelectedProjectStillExists();
    renderAll();
  });
}).catch(() => {
  sbStartAutoSync((remoteProjects) => {
    state.projects = normalizeProjects(remoteProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    ensureSelectedProjectStillExists();
    renderAll();
  });
});

init();

function init() {
  fillSelect(document.getElementById('status'), PROJECT_STATES);
  fillSelect(el.statusSelect, PROJECT_STATES);

  document.getElementById('new-project-btn').addEventListener('click', () => openProjectDialog());
  document.getElementById('edit-project-btn').addEventListener('click', () => {
    const project = getSelectedProject();
    if (project) openProjectDialog(project);
  });
  document.getElementById('generate-report-btn').addEventListener('click', renderReport);
  document.getElementById('copy-report-btn').addEventListener('click', () => copyTextWithFeedback(el.reportOutput.value, el.reportFeedback, 'Borrador copiado al portapapeles.'));
  el.exportProjectReportTxtBtn.addEventListener('click', () => exportProjectReport('txt'));
  el.exportProjectReportMdBtn.addEventListener('click', () => exportProjectReport('md'));
  document.getElementById('export-project-btn').addEventListener('click', exportSelectedProject);
  document.getElementById('generate-global-report-btn').addEventListener('click', renderGlobalReport);
  document.getElementById('copy-global-report-btn').addEventListener('click', () => copyTextWithFeedback(el.globalReportOutput.value, el.globalReportFeedback, 'Memoria global copiada al portapapeles.'));
  el.exportGlobalReportTxtBtn.addEventListener('click', () => exportGlobalReport('txt'));
  el.exportGlobalReportMdBtn.addEventListener('click', () => exportGlobalReport('md'));
  document.getElementById('export-global-btn').addEventListener('click', exportGlobalData);
  el.exportBackupBtn.addEventListener('click', exportGlobalData);
  el.importBackupBtn.addEventListener('click', () => el.importBackupInput.click());
  el.importBackupInput.addEventListener('change', importGlobalData);
  el.confirmImportBtn.addEventListener('click', confirmImportPreview);
  el.cancelImportPreviewBtn.addEventListener('click', clearImportPreview);
  el.replaceAllImportBtn.addEventListener('click', replaceAllImport);
  el.importMergeUseImportedBtn.addEventListener('click', useAllImportedMerge);
  document.getElementById('edit-closing-btn').addEventListener('click', () => openEntryDialog('closing'));
  el.showProjectViewBtn.addEventListener('click', () => setActiveView('project'));
  el.showGlobalViewBtn.addEventListener('click', () => setActiveView('global'));
  document.getElementById('back-to-project-btn').addEventListener('click', () => setActiveView('project'));
  el.installAppBtn.addEventListener('click', installPwa);
  el.projectForm.addEventListener('submit', saveProjectFromForm);
  el.entryForm.addEventListener('submit', saveEntryFromForm);
  el.sidebarToggleBtn.addEventListener('click', openSidebar);
  el.sidebarCloseBtn.addEventListener('click', closeSidebar);
  el.statusSelect.addEventListener('change', updateSelectedProjectStatus);
  el.statusSelect.addEventListener('change', updateStatusSelectColor);
  el.themeToggleBtn.addEventListener('click', toggleTheme);
  el.participantDiaryFilterParticipant.addEventListener('change', handleDiaryFilterChange);
  el.participantDiaryFilterType.addEventListener('change', handleDiaryFilterChange);
  el.participantDiaryFilterFrom.addEventListener('change', handleDiaryFilterChange);
  el.participantDiaryFilterTo.addEventListener('change', handleDiaryFilterChange);
  el.participantDiaryClearFiltersBtn.addEventListener('click', clearDiaryFilters);
  el.recentProgressToggle.addEventListener('click', toggleRecentProgress);


  document.querySelectorAll('[data-open-form]').forEach((button) => {
    if (button.id === 'edit-closing-btn') return;
    button.addEventListener('click', () => openEntryDialog(button.dataset.openForm));
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close());
  });

  state.systemThemeMedia.addEventListener('change', () => {
    if (state.theme === 'auto') applyTheme();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    el.installAppBtn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    el.installAppBtn.classList.add('hidden');
    showFeedback(el.globalReportFeedback, 'La aplicación se ha instalado correctamente.');
  });

  // Backup y restaurar
  const backupBtn = document.getElementById('backup-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const restoreInput = document.getElementById('restore-input');

  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      try {
        const payload = buildBackupPayload();
        const date = new Date().toISOString().slice(0, 10);
        downloadJson(payload, 'bitacora-backup-' + date + '.json');
      } catch(err) {
        window.alert('Error al generar el backup: ' + err.message);
      }
    });
  }

  if (restoreBtn && restoreInput) {
    restoreBtn.addEventListener('click', () => {
      restoreInput.value = '';
      restoreInput.click();
    });
    restoreInput.addEventListener('change', async (e) => {
      const [file] = e.target.files || [];
      if (!file) return;
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const projects = normalizeImportedProjects(parsed);
        if (!projects.length) { window.alert('El archivo no contiene proyectos validos.'); return; }
        if (!window.confirm('Restaurar ' + projects.length + ' proyecto(s) desde "' + file.name + '"? Se sustituiran los datos actuales.')) return;
        state.projects = projects;
        state.selectedProjectId = projects[0]?.id || null;
        persist();
        renderAll();
        window.alert('Restauracion completada correctamente.');
      } catch(err) {
        window.alert('Error al leer el archivo: ' + err.message);
      }
    });
  }

  // Dropdown de proyectos
  const dropdownBtn = document.getElementById('projects-dropdown-btn');
  const dropdownPanel = document.getElementById('projects-dropdown-panel');
  if (dropdownBtn && dropdownPanel) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdownBtn.getAttribute('aria-expanded') === 'true';
      dropdownBtn.setAttribute('aria-expanded', String(!open));
      dropdownPanel.hidden = open;
    });
    document.addEventListener('click', () => {
      dropdownBtn.setAttribute('aria-expanded', 'false');
      dropdownPanel.hidden = true;
    });
    dropdownPanel.addEventListener('click', (e) => e.stopPropagation());
  }

  registerServiceWorker();
  applyTheme();

  if (state.projects.length > 0) {
    state.selectedProjectId = state.projects[0].id;
  }

  renderAll();
  initAccordions();
}

function initAccordions() {
  document.querySelectorAll('.accordion-toggle').forEach((btn) => {
    // Avoid double-binding
    btn.removeEventListener('click', handleAccordionClick);
    btn.addEventListener('click', handleAccordionClick);
  });
}

function handleAccordionClick(e) {
  // Don't toggle if clicked inside .accordion-toggle-actions (child buttons)
  if (e.target.closest('.accordion-toggle-actions') && e.target !== this) return;
  const btn = this;
  const targetId = btn.dataset.target;
  if (!targetId) return;
  const body = document.getElementById(targetId);
  if (!body) return;
  const isOpen = !body.hidden;
  body.hidden = isOpen;
  btn.setAttribute('aria-expanded', String(!isOpen));
  const chevron = btn.querySelector('.chevron');
  if (chevron) chevron.classList.toggle('chevron--up', !isOpen);
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return seedProjects();
    return normalizeProjects(JSON.parse(raw));
  } catch {
    return seedProjects();
  }
}

function loadThemePreference() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(saved) ? saved : 'auto';
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
  sbSave(state.projects); // guardar en Supabase (async, sin bloquear)
}

function persistThemePreference() {
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
}

function applyTheme() {
  const resolvedTheme = state.theme === 'auto'
    ? (state.systemThemeMedia.matches ? 'oscuro' : 'claro')
    : state.theme;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme === 'oscuro' ? 'dark' : 'light';
  updateThemeMeta(resolvedTheme);

  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    sunIcon.style.display = resolvedTheme === 'oscuro' ? 'none' : 'block';
    moonIcon.style.display = resolvedTheme === 'oscuro' ? 'block' : 'none';
  }
}

function updateThemeMeta(resolvedTheme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', resolvedTheme === 'oscuro' ? '#0f172a' : '#1d4ed8');
}

function toggleTheme() {
  const cycle = ['auto', 'claro', 'oscuro'];
  const next = cycle[(cycle.indexOf(state.theme) + 1) % cycle.length];
  state.theme = next;
  persistThemePreference();
  applyTheme();
}


function seedProjects() {
  return normalizeProjects([
    {
      title: 'Aulas 24 y 25 · Aula recreativa y espacio de convivencia',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho',
      owner: 'Nieves',
      participants: 'Juan Carlos, Álvaro, Daniel, Nicolás, Germán',
      startDate: '2026-02-19',
      endDate: '',
      status: 'activo',
      summary: 'Proyecto de mejora del entorno educativo mediante la conversión de las aulas 24 y 25 en aula recreativa y espacio de convivencia.',
      goal: 'Mejorar el entorno educativo y adecuar el mobiliario de las aulas 24 y 25 para un uso más funcional y convivencial.',
      generalNotes: 'Actuaciones previstas: nuevas tarimas, estanterías, mesas, asientos y adecuación general del mobiliario. Proyecto recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se prevé desarrollo con coordinación interna y participación del profesorado implicado.', difficulties: '', nextStep: 'Definir planificación concreta de actuaciones, calendario y reparto de tareas.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    },
    {
      title: 'Embarcación Ambulancia',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho',
      owner: 'Jonás',
      participants: 'Juan Carlos, Álvaro, Daniel, Nicolás',
      startDate: '2026-02-19', endDate: '', status: 'activo',
      summary: 'Continuación del proyecto técnico vinculado al desarrollo y acondicionamiento de la embarcación denominada Ambulancia.',
      goal: 'Dar continuidad a una actuación singular del departamento mediante el desarrollo y acondicionamiento técnico de la embarcación Ambulancia.',
      generalNotes: 'Proyecto recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se plantea su continuidad como actuación singular del departamento.', difficulties: '', nextStep: 'Revisar estado actual del proyecto y definir tareas pendientes del trimestre.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    },
    {
      title: 'Aula 27 · Mesas para equipos informáticos',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho', owner: 'Germán', participants: 'Juan Carlos, Álvaro, Daniel, Nicolás', startDate: '2026-02-19', endDate: '', status: 'activo',
      summary: 'Diseño, fabricación e instalación de mesas específicas para los puestos informáticos del aula 27.',
      goal: 'Mejorar la funcionalidad y la ergonomía del aula 27 mediante nuevas mesas para equipos informáticos.',
      generalNotes: 'Proyecto recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se contempla diseño, fabricación e instalación en el propio periodo de liberación horaria.', difficulties: '', nextStep: 'Definir medidas, necesidades del aula y secuencia de fabricación.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    },
    {
      title: 'Talleres 7 y 8 · Nuevas taquillas en baños',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho', owner: 'Germán', participants: 'Juan Carlos, Álvaro, Daniel, Nicolás', startDate: '2026-02-19', endDate: '', status: 'activo',
      summary: 'Instalación de nuevas taquillas en los baños de los talleres 7 y 8.',
      goal: 'Mejorar el almacenaje del alumnado y la organización de los espacios comunes de taller.',
      generalNotes: 'Proyecto recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se plantea como actuación de mejora de espacios comunes.', difficulties: '', nextStep: 'Definir número de taquillas, ubicación exacta y necesidades de instalación.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    },
    {
      title: 'Hilando Sostenibilidad',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho', owner: 'Saskia', participants: 'Juan Carlos, Álvaro, Nicolás, Laura', startDate: '2026-02-19', endDate: '', status: 'activo',
      summary: 'Proyecto de innovación educativa centrado en sostenibilidad y reutilización de materiales.',
      goal: 'Desarrollar una actuación de innovación educativa con impacto transversal vinculada a sostenibilidad y reutilización.',
      generalNotes: 'Proyecto interdisciplinar recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se plantea como proyecto de innovación educativa de carácter transversal.', difficulties: '', nextStep: 'Definir actuaciones concretas, coordinación interdisciplinar y materiales implicados.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    },
    {
      title: 'Aula Polivalente · Estructura ligera junto al Taller 7',
      scope: 'Tercer trimestre 2025-2026 · Departamento de Madera, Mueble y Corcho', owner: 'Germán', participants: 'Juan Carlos, Álvaro, Daniel, Nicolás', startDate: '2026-02-19', endDate: '', status: 'activo',
      summary: 'Fase inicial de colocación de base estructural para un nuevo espacio polivalente junto al Taller 7.',
      goal: 'Iniciar la creación de un espacio polivalente para usos educativos y organizativos del departamento.',
      generalNotes: 'Proyecto recogido en la planificación departamental de febrero de 2026.',
      progress: [{
        date: '2026-02-19', author: 'Departamento de Madera, Mueble y Corcho', type: 'propuesta', done: 'Se incorpora este proyecto a la planificación departamental del tercer trimestre 2025-2026.', agreements: 'Se plantea colaboración en la fase inicial de base estructural.', difficulties: '', nextStep: 'Definir alcance inicial, necesidades materiales y planificación de la estructura base.'
      }],
      tasks: [], documents: [], participantDiary: [], closing: createEmptyClosing()
    }
  ]);
}

function normalizeProjects(projects = []) {
  return projects.map((project) => ({
    ...project,
    id: project.id || crypto.randomUUID(),
    progress: (project.progress || []).map((entry) => ({ ...entry, id: entry.id || crypto.randomUUID() })),
    tasks: (project.tasks || []).map((entry) => ({ ...entry, id: entry.id || crypto.randomUUID() })),
    documents: (project.documents || []).map((entry) => ({ ...entry, id: entry.id || crypto.randomUUID() })),
    participantDiary: (project.participantDiary || []).map((entry) => ({ ...entry, id: entry.id || crypto.randomUUID() })),
    closing: normalizeClosing(project.closing)
  }));
}

function createEmptyClosing() {
  return {
    closeDate: '',
    finalAssessment: '',
    achievedResults: '',
    difficultiesFound: '',
    improvementProposals: '',
    finalNotes: ''
  };
}

function normalizeClosing(closing = {}) {
  return { ...createEmptyClosing(), ...(closing || {}) };
}

function hasClosingData(project) {
  const closing = normalizeClosing(project?.closing);
  return Object.values(closing).some((value) => String(value || '').trim());
}

function isClosingComplete(project) {
  const closing = normalizeClosing(project?.closing);
  return Boolean(
    closing.closeDate && closing.finalAssessment && closing.achievedResults && closing.difficultiesFound && closing.improvementProposals && closing.finalNotes
  );
}

function renderAll() {
  ensureSelectedProjectStillExists();
  renderFilters();
  renderDashboard();
  renderProjectList();
  renderSelectedProject();
  renderGlobalReport();
  renderImportPreview();
  renderView();
}

function ensureSelectedProjectStillExists() {
  if (state.selectedProjectId && getSelectedProject()) return;
  state.selectedProjectId = state.projects[0]?.id || null;
}

function setActiveView(view) {
  state.activeView = view;
  renderView();
  if (view === 'global') {
    renderGlobalReport();
  }
}

function openSidebar() {
  el.sidebar.classList.add('sidebar--open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  el.sidebar.classList.remove('sidebar--open');
  document.body.style.overflow = '';
}

function toggleRecentProgress() {
  const list = el.recentProgressList;
  const chevron = el.recentProgressChevron;
  const isCollapsed = list.classList.toggle('collapsed');
  chevron.classList.toggle('chevron--up', !isCollapsed);
  chevron.classList.toggle('chevron--down', isCollapsed);
  el.recentProgressToggle.setAttribute('aria-expanded', String(!isCollapsed));
}

function renderView() {
  const isProject = state.activeView === 'project';
  el.projectSection.classList.toggle('hidden', !isProject);
  el.projectView.classList.toggle('hidden', !isProject);
  el.globalView.classList.toggle('hidden', isProject);
  el.sidebar.classList.toggle('hidden', !isProject);
  document.querySelector('.layout').classList.toggle('layout--full', !isProject);
  // showProjectViewBtn is now hidden; showGlobalViewBtn is in the header
  el.showGlobalViewBtn.classList.toggle('primary', !isProject);
}

function renderFilters() {
  // No hay filtros en el lateral.
}

function fillFilterSelect(select, options, value, allLabel, labelMap = null) {
  const getLabel = (opt) => (labelMap && labelMap[opt] !== undefined) ? labelMap[opt] : opt;
  select.innerHTML = [`<option value="">${escapeHtml(allLabel)}</option>`, ...options.map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(getLabel(option))}</option>`)].join('');
  select.value = options.includes(value) ? value : '';
}

function getFilteredProjects() {
  return state.projects;
}

function closeProjectsDropdown() {
  const btn = document.getElementById('projects-dropdown-btn');
  const panel = document.getElementById('projects-dropdown-panel');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (panel) panel.hidden = true;
}

function buildProjectItem(project, collapsed = false) {
  const wrap = document.createElement('div');
  wrap.className = `project-item-row ${project.id === state.selectedProjectId ? 'active' : ''} ${collapsed ? 'project-item--collapsed' : ''} ${project.status === 'cerrado' ? 'project-item--closed' : ''}`;
  wrap.dataset.status = slug(project.status);
  wrap.innerHTML = `
    <button class="project-item-select" data-id="${escapeAttribute(project.id)}">
      <h3>${escapeHtml(project.title)}</h3>
      <span class="badge status-${slug(project.status)}">${escapeHtml(project.status)}</span>
    </button>
    <button class="project-item-delete danger" data-id="${escapeAttribute(project.id)}" title="Eliminar proyecto">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    </button>
  `;
  wrap.querySelector('.project-item-select').addEventListener('click', () => {
    state.selectedProjectId = project.id;
    setActiveView('project');
    renderProjectList();
    renderSelectedProject();
    closeSidebar();
    closeProjectsDropdown();
  });
  wrap.querySelector('.project-item-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteProject(project.id);
  });
  return wrap;
}

function deleteProject(projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return;
  if (!window.confirm(`¿Eliminar el proyecto "${project.title}"? Esta acción no se puede deshacer.`)) return;
  state.projects = state.projects.filter((p) => p.id !== projectId);
  if (state.selectedProjectId === projectId) {
    state.selectedProjectId = state.projects[0]?.id || null;
  }
  persist();
  renderAll();
}

function renderProjectList() {
  const projects = getFilteredProjects();
  el.projectList.innerHTML = '';

  if (!projects.length) {
    el.projectList.innerHTML = '<p class="muted">No hay proyectos que coincidan.</p>';
    return;
  }

  // Todos los proyectos directamente, seleccionado primero
  const selectedProject = projects.find(p => p.id === state.selectedProjectId);
  const rest = projects.filter(p => p.id !== selectedProject?.id);
  const ordered = selectedProject ? [selectedProject, ...rest] : projects;

  ordered.forEach((project) => {
    el.projectList.appendChild(buildProjectItem(project));
  });
}

function toggleRecentProgress() {
  const list = el.recentProgressList;
  const chevron = el.recentProgressChevron;
  const isCollapsed = list.classList.toggle('collapsed');
  chevron.classList.toggle('chevron--up', !isCollapsed);
  chevron.classList.toggle('chevron--down', isCollapsed);
  el.recentProgressToggle.setAttribute('aria-expanded', String(!isCollapsed));
}

function renderDashboard() {
  const activeProjects = state.projects.filter((p) => p.status === 'activo').length;
  const closedProjects = state.projects.filter((p) => p.status === 'cerrado').length;
  const draftProjects = state.projects.filter((p) => p.status === 'borrador').length;
  const pausedProjects = state.projects.filter((p) => p.status === 'en pausa').length;

  document.getElementById('stat-active-projects').textContent = activeProjects;
  document.getElementById('stat-closed-projects').textContent = closedProjects;
  const draftEl = document.getElementById('stat-draft-projects');
  const pausedEl = document.getElementById('stat-paused-projects');
  if (draftEl) draftEl.textContent = draftProjects;
  if (pausedEl) pausedEl.textContent = pausedProjects;

  const recentProgress = state.projects
    .flatMap((project) => ([...(project.progress || []).map((entry) => ({ ...entry, projectTitle: project.title, sourceLabel: entry.type || 'avance', sourceText: entry.done })), ...(project.participantDiary || []).map((entry) => ({ ...entry, projectTitle: project.title, sourceLabel: `${entry.type || 'diario'} · ${entry.participant || 'sin participante'}`, sourceText: entry.whatDid }))]))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  el.recentProgressList.innerHTML = recentProgress.length ? '' : '<p class="muted">Todavía no hay avances recientes.</p>';

  recentProgress.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'mini-entry';
    article.innerHTML = `
      <h4>${escapeHtml(item.projectTitle)}</h4>
      <p><strong>${formatDate(item.date)}</strong> · ${escapeHtml(item.sourceLabel || 'avance')}</p>
      <p class="muted">${escapeHtml(trimText(item.sourceText || 'Sin detalle', 90))}</p>
    `;
    el.recentProgressList.appendChild(article);
  });
}

function renderSelectedProject() {
  const project = getSelectedProject();
  const hasProject = Boolean(project);
  el.emptyState.classList.toggle('hidden', hasProject);
  el.projectView.classList.toggle('hidden', !hasProject);
  if (!project) {
    el.reportOutput.value = '';
    renderDiaryFilters([]);
    return;
  }

  document.getElementById('project-title').textContent = project.title;
  document.getElementById('project-meta').textContent = `${project.scope || 'Sin ámbito'} · Responsable: ${project.owner || 'No indicado'} · Inicio: ${formatDate(project.startDate)} · Cierre previsto: ${formatDate(project.endDate)}`;
  document.getElementById('project-description').textContent = project.summary || '—';
  document.getElementById('project-goal').textContent = project.goal || '—';
  document.getElementById('project-participants').textContent = project.participants || '—';
  document.getElementById('project-notes').textContent = project.generalNotes || '—';
  el.statusSelect.value = project.status;
  updateStatusSelectColor();
  el.reportFeedback.textContent = '';

  renderProgress(project.progress || []);
  renderTasks(project.tasks || []);
  renderDocuments(project.documents || []);
  renderParticipantDiary(project.participantDiary || []);
  renderClosing(project);
  renderReport();
  initAccordions();
}

function renderProgress(items) {
  const container = document.getElementById('progress-list');
  container.innerHTML = items.length ? '' : '<p class="muted">Todavía no hay avances registrados.</p>';

  [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((item) => {
    container.appendChild(renderEntry('progress', item, `
      <h4>${escapeHtml(item.type)} · ${formatDate(item.date)}</h4>
      <p><strong>Autor:</strong> ${escapeHtml(item.author || '—')}</p>
      <p><strong>Realizado:</strong> ${escapeHtml(item.done || '—')}</p>
      <p><strong>Acuerdos:</strong> ${escapeHtml(item.agreements || '—')}</p>
      <p><strong>Dificultades:</strong> ${escapeHtml(item.difficulties || '—')}</p>
      <p><strong>Siguiente paso:</strong> ${escapeHtml(item.nextStep || '—')}</p>
    `));
  });
}

function renderTasks(items) {
  const container = document.getElementById('tasks-list');
  container.innerHTML = items.length ? '' : '<p class="muted">Todavía no hay tareas registradas.</p>';

  [...items].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).forEach((item) => {
    container.appendChild(renderEntry('tasks', item, `
      <h4>${escapeHtml(item.title)}</h4>
      <p>
        <span class="badge task-${slug(item.status)}">${escapeHtml(item.status)}</span>
        <span class="badge priority-${slug(item.priority)}">${escapeHtml(item.priority)}</span>
      </p>
      <p><strong>Responsable:</strong> ${escapeHtml(item.owner || '—')}</p>
      <p><strong>Fecha prevista:</strong> ${formatDate(item.dueDate)}</p>
      <p><strong>Notas:</strong> ${escapeHtml(item.notes || '—')}</p>
    `));
  });
}

function renderDocuments(items) {
  const container = document.getElementById('documents-list');
  container.innerHTML = items.length ? '' : '<p class="muted">Todavía no hay documentos registrados.</p>';

  [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((item) => {
    const link = item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">Abrir enlace</a>` : 'Sin enlace';
    container.appendChild(renderEntry('documents', item, `
      <h4>${escapeHtml(item.name)}</h4>
      <p><strong>Tipo:</strong> ${escapeHtml(item.type || '—')}</p>
      <p><strong>Fecha:</strong> ${formatDate(item.date)}</p>
      <p><strong>Descripción:</strong> ${escapeHtml(item.description || '—')}</p>
      <p>${link}</p>
    `));
  });
}

function renderParticipantDiary(items) {
  const container = document.getElementById('participant-diary-list');
  const totalCount = items.length;
  const filteredItems = getFilteredDiaryItems(items);

  renderDiaryFilters(items);

  if (el.participantDiaryCount) {
    el.participantDiaryCount.textContent = filteredItems.length === totalCount
      ? `${totalCount} ${totalCount === 1 ? 'entrada' : 'entradas'}`
      : `${filteredItems.length} de ${totalCount} entradas`;
  }

  container.innerHTML = filteredItems.length
    ? ''
    : `<p class="muted empty-inline-message">${totalCount ? 'No hay entradas que coincidan con los filtros actuales.' : 'Todavía no hay entradas en el diario.'}</p>`;

  [...filteredItems].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((item) => {
    container.appendChild(renderEntry('participantDiary', item, `
      <h4>${formatDate(item.date)} · ${escapeHtml(item.participant || 'Sin participante')}</h4>
      <p><span class="badge diary-${slug(item.type)}">${escapeHtml(item.type || 'Sin tipo')}</span>${item.location ? ` <span class="badge info-badge">📍 ${escapeHtml(item.location)}</span>` : ''}</p>
      <p><strong>Qué hizo:</strong> ${escapeHtml(item.whatDid || '—')}</p>
      <p><strong>Observaciones:</strong> ${escapeHtml(item.observations || '—')}</p>
      <p><strong>Dificultades:</strong> ${escapeHtml(item.difficulties || '—')}</p>
      <p><strong>Siguiente paso:</strong> ${escapeHtml(item.nextStep || '—')}</p>
    `));
  });
}

function handleDiaryFilterChange() {
  state.diaryFilters.participant = el.participantDiaryFilterParticipant.value;
  state.diaryFilters.type = el.participantDiaryFilterType.value;
  state.diaryFilters.from = el.participantDiaryFilterFrom.value;
  state.diaryFilters.to = el.participantDiaryFilterTo.value;
  const project = getSelectedProject();
  if (project) renderParticipantDiary(project.participantDiary || []);
}

function clearDiaryFilters() {
  state.diaryFilters = { participant: '', type: '', from: '', to: '' };
  el.participantDiaryFilterParticipant.value = '';
  el.participantDiaryFilterType.value = '';
  el.participantDiaryFilterFrom.value = '';
  el.participantDiaryFilterTo.value = '';
  const project = getSelectedProject();
  if (project) renderParticipantDiary(project.participantDiary || []);
}

function renderDiaryFilters(items) {
  const participants = [...new Set(items.map((item) => item.participant?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const types = [...new Set(items.map((item) => item.type?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  fillFilterSelect(el.participantDiaryFilterParticipant, participants, state.diaryFilters.participant, 'Todos');
  fillFilterSelect(el.participantDiaryFilterType, types, state.diaryFilters.type, 'Todos');
  el.participantDiaryFilterFrom.value = state.diaryFilters.from;
  el.participantDiaryFilterTo.value = state.diaryFilters.to;
  
  const filtersActive = Boolean(state.diaryFilters.participant || state.diaryFilters.type || state.diaryFilters.from || state.diaryFilters.to);
  el.participantDiaryClearFiltersBtn.disabled = !filtersActive;
}

function getFilteredDiaryItems(items) {
  return items.filter((item) => {
    const matchesParticipant = !state.diaryFilters.participant || (item.participant || '') === state.diaryFilters.participant;
    const matchesType = !state.diaryFilters.type || (item.type || '') === state.diaryFilters.type;
    const matchesFrom = !state.diaryFilters.from || (item.date >= state.diaryFilters.from);
    const matchesTo = !state.diaryFilters.to || (item.date <= state.diaryFilters.to);
    return matchesParticipant && matchesType && matchesFrom && matchesTo;
  });
}

function renderClosing(project) {
  if (!el.closingSummary) return;

  const closing = normalizeClosing(project.closing);
  const projectClosed = project.status === 'cerrado';
  const complete = isClosingComplete(project);
  const started = hasClosingData(project);

  el.projectClosingCard.classList.toggle('closing-card--closed', projectClosed);
  el.projectClosingCard.classList.toggle('closing-card--missing', projectClosed && !complete);

  el.closingStatusBadge.textContent = projectClosed
    ? (complete ? 'Cierre documentado' : 'Proyecto cerrado · pendiente de documentar')
    : (started ? 'Cierre en preparación' : 'Cierre opcional');

  el.closingStatusBadge.className = `badge ${projectClosed ? (complete ? 'closing-badge--complete' : 'closing-badge--warning') : 'info-badge'}`;

  el.closingHelperText.textContent = projectClosed
    ? 'Este proyecto está cerrado. Conviene dejar documentado su cierre para completar bien la memoria.'
    : 'Completa este bloque cuando el proyecto termine o entre en fase final.';

  const items = [
    ['Fecha de cierre', formatDate(closing.closeDate)],
    ['Valoración final', closing.finalAssessment || 'Pendiente'],
    ['Resultados alcanzados', closing.achievedResults || 'Pendiente'],
    ['Dificultades encontradas', closing.difficultiesFound || 'Pendiente'],
    ['Propuestas de mejora', closing.improvementProposals || 'Pendiente'],
    ['Observaciones finales', closing.finalNotes || 'Pendiente']
  ];

  el.closingSummary.innerHTML = `
    <div class="closing-grid">
      ${items.map(([label, value]) => `<div class="closing-item"><h4>${escapeHtml(label)}</h4><p>${escapeHtml(value)}</p></div>`).join('')}
    </div>
  `;
}

function renderEntry(kind, item, html) {
  const article = document.createElement('article');
  article.className = 'entry-item';
  article.innerHTML = `
    ${html}
    <div class="entry-actions">
      <button type="button" data-entry-edit="${kind}" data-entry-id="${escapeAttribute(item.id)}">Editar</button>
      <button type="button" class="danger" data-entry-delete="${kind}" data-entry-id="${escapeAttribute(item.id)}">Borrar</button>
    </div>
  `;

  article.querySelector('[data-entry-edit]').addEventListener('click', () => openEntryDialog(kind, item.id));
  article.querySelector('[data-entry-delete]').addEventListener('click', () => deleteEntry(kind, item.id));
  return article;
}

function openProjectDialog(project = null) {
  document.getElementById('project-form-title').textContent = project ? 'Editar proyecto' : 'Nuevo proyecto';
  const fields = ['project-id', 'title', 'scope', 'owner', 'participants', 'startDate', 'endDate', 'status', 'summary', 'goal', 'generalNotes'];
  fields.forEach((field) => {
    const input = document.getElementById(field);
    input.value = project ? (project[mapProjectField(field)] || '') : (field === 'status' ? 'borrador' : '');
  });
  if (project) document.getElementById('project-id').value = project.id;
  el.projectDialog.showModal();
}

function mapProjectField(field) {
  return {
    'project-id': 'id', title: 'title', scope: 'scope', owner: 'owner', participants: 'participants', startDate: 'startDate', endDate: 'endDate', status: 'status', summary: 'summary', goal: 'goal', generalNotes: 'generalNotes'
  }[field];
}

function saveProjectFromForm(event) {
  event.preventDefault();
  const projectId = document.getElementById('project-id').value;
  const payload = {
    id: projectId || crypto.randomUUID(),
    title: document.getElementById('title').value.trim(),
    scope: document.getElementById('scope').value.trim(),
    owner: document.getElementById('owner').value.trim(),
    participants: document.getElementById('participants').value.trim(),
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    status: document.getElementById('status').value,
    summary: document.getElementById('summary').value.trim(),
    goal: document.getElementById('goal').value.trim(),
    generalNotes: document.getElementById('generalNotes').value.trim(),
  };

  if (!payload.title) return;

  const existing = state.projects.findIndex((project) => project.id === payload.id);
  if (existing >= 0) {
    payload.progress = state.projects[existing].progress || [];
    payload.tasks = state.projects[existing].tasks || [];
    payload.documents = state.projects[existing].documents || [];
    payload.participantDiary = state.projects[existing].participantDiary || [];
    payload.closing = normalizeClosing(state.projects[existing].closing);
    state.projects[existing] = payload;
  } else {
    payload.progress = [];
    payload.tasks = [];
    payload.documents = [];
    payload.participantDiary = [];
    payload.closing = createEmptyClosing();
    state.projects.unshift(payload);
  }

  state.selectedProjectId = payload.id;
  persist();
  el.projectDialog.close();
  el.projectForm.reset();
  renderAll();
}

function openEntryDialog(kind, entryId = null) {
  const project = getSelectedProject();
  if (!project) return;

  const entry = kind === 'closing'
    ? normalizeClosing(project.closing)
    : (entryId ? findEntry(project, kind, entryId) : null);

  document.getElementById('entry-kind').value = kind;
  document.getElementById('entry-project-id').value = project.id;
  document.getElementById('entry-id').value = entry?.id || '';
  document.getElementById('entry-form-title').textContent = {
    progress: entry ? 'Editar avance' : 'Nuevo avance',
    tasks: entry ? 'Editar tarea' : 'Nueva tarea',
    documents: entry ? 'Editar documento' : 'Nuevo documento',
    participantDiary: entry ? 'Editar entrada del diario' : 'Nueva entrada del diario',
    closing: 'Cierre del proyecto'
  }[kind];

  const templateId = {
    progress: 'progress-fields-template',
    tasks: 'task-fields-template',
    documents: 'document-fields-template',
    participantDiary: 'participant-diary-fields-template',
    closing: 'closing-fields-template'
  }[kind];

  el.entryFields.innerHTML = '';
  el.entryFields.appendChild(document.getElementById(templateId).content.cloneNode(true));

  if (kind === 'progress') fillSelect(el.entryFields.querySelector('select[name="type"]'), PROGRESS_TYPES);
  if (kind === 'tasks') {
    fillSelect(el.entryFields.querySelector('select[name="status"]'), TASK_STATES);
    fillSelect(el.entryFields.querySelector('select[name="priority"]'), TASK_PRIORITIES);
  }
  if (kind === 'documents') fillSelect(el.entryFields.querySelector('select[name="type"]'), DOCUMENT_TYPES);
  if (kind === 'participantDiary') fillSelect(el.entryFields.querySelector('select[name="type"]'), DIARY_TYPES);

  if (entry) {
    populateEntryFields(entry);
  } else {
    const dateField = el.entryFields.querySelector('input[name="date"]');
    if (dateField) dateField.value = new Date().toISOString().slice(0, 10);
  }

  if (kind === 'closing' && !entry.closeDate) {
    const closeDateField = el.entryFields.querySelector('input[name="closeDate"]');
    if (closeDateField && project.status === 'cerrado') closeDateField.value = new Date().toISOString().slice(0, 10);
  }

  el.entryDialog.showModal();
}

function populateEntryFields(entry) {
  Object.entries(entry).forEach(([key, value]) => {
    const field = el.entryFields.querySelector(`[name="${key}"]`);
    if (field) field.value = value || '';
  });
}

function saveEntryFromForm(event) {
  event.preventDefault();
  const kind = document.getElementById('entry-kind').value;
  const project = getSelectedProject();
  if (!project) return;

  const payload = Object.fromEntries(new FormData(el.entryForm).entries());

  if (kind === 'closing') {
    project.closing = normalizeClosing(payload);
  } else {
    payload.id = document.getElementById('entry-id').value || crypto.randomUUID();
    const collection = getProjectCollection(project, kind);
    const existingIndex = collection.findIndex((item) => item.id === payload.id);
    if (existingIndex >= 0) collection[existingIndex] = payload;
    else collection.unshift(payload);
  }

  persist();
  el.entryDialog.close();
  el.entryForm.reset();
  renderAll();
}

function deleteEntry(kind, entryId) {
  const project = getSelectedProject();
  if (!project) return;

  const labels = {
    progress: 'este avance', tasks: 'esta tarea', documents: 'este documento', participantDiary: 'esta entrada del diario'
  };

  if (!window.confirm(`¿Seguro que quieres borrar ${labels[kind]}?`)) return;

  const collection = getProjectCollection(project, kind);
  const index = collection.findIndex((item) => item.id === entryId);
  if (index < 0) return;
  collection.splice(index, 1);
  persist();
  renderAll();
}

function findEntry(project, kind, entryId) {
  return getProjectCollection(project, kind).find((item) => item.id === entryId) || null;
}

function getProjectCollection(project, kind) {
  if (kind === 'progress') return project.progress || (project.progress = []);
  if (kind === 'tasks') return project.tasks || (project.tasks = []);
  if (kind === 'documents') return project.documents || (project.documents = []);
  if (kind === 'participantDiary') return project.participantDiary || (project.participantDiary = []);
  return [];
}

function updateStatusSelectColor() {
  const val = el.statusSelect.value || '';
  el.statusSelect.dataset.status = slug(val);
}

function updateSelectedProjectStatus() {
  const project = getSelectedProject();
  if (!project) return;
  project.status = el.statusSelect.value;
  if (project.status === 'cerrado' && !project.closing?.closeDate) {
    project.closing = normalizeClosing(project.closing);
  }
  persist();
  renderAll();
}

function renderReport() {
  const project = getSelectedProject();
  if (!project) {
    el.reportOutput.value = '';
    return;
  }

  const progress = [...(project.progress || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const tasks = project.tasks || [];
  const documents = project.documents || [];
  const diaryEntries = [...(project.participantDiary || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const closing = normalizeClosing(project.closing);
  const closingReady = hasClosingData(project);

  const chronology = progress.length
    ? progress.map((item) => `- ${formatDate(item.date)} · ${item.type} · ${item.author}: ${item.done}`).join('\n')
    : '- Sin hitos registrados todavía.';

  const actions = tasks.length
    ? tasks.map((item) => `- ${item.title} (${item.status}, prioridad ${item.priority})${item.owner ? ` · Responsable: ${item.owner}` : ''}`).join('\n')
    : '- No hay tareas definidas.';

  const incidents = [
    ...progress.filter((item) => item.difficulties).map((item) => `- ${formatDate(item.date)} · ${item.difficulties}`),
    ...diaryEntries.filter((item) => item.difficulties).map((item) => `- ${formatDate(item.date)} · ${item.participant || 'Sin participante'}: ${item.difficulties}`),
    ...(closing.difficultiesFound ? [`- Cierre del proyecto: ${closing.difficultiesFound}`] : [])
  ].join('\n') || '- No se han registrado incidencias relevantes.';

  const results = [
    tasks.some((item) => item.status === 'hecha') ? `- ${tasks.filter((item) => item.status === 'hecha').length} tareas marcadas como hechas.` : '- Aún no hay tareas cerradas.',
    documents.length ? `- ${documents.length} documentos/enlaces asociados al proyecto.` : '- No hay documentos asociados todavía.',
    diaryEntries.length ? `- ${diaryEntries.length} entradas del diario de participantes para trazabilidad individual.` : '- Todavía no hay seguimiento individual de participantes.',
    ...(closing.achievedResults ? [`- Síntesis de cierre: ${closing.achievedResults}`] : [])
  ].join('\n');

  const improvements = [
    ...progress.filter((item) => item.nextStep).map((item) => `- ${item.nextStep}`),
    ...diaryEntries.filter((item) => item.nextStep).map((item) => `- ${item.participant || 'Participante no indicado'}: ${item.nextStep}`),
    ...(closing.improvementProposals ? [`- ${closing.improvementProposals}`] : [])
  ].join('\n') || '- Definir próximos pasos y propuestas de mejora en nuevos avances.';

  const participantContribution = diaryEntries.length
    ? diaryEntries.map((item) => `- ${formatDate(item.date)} · ${item.participant || 'Sin participante'} · ${item.type || 'seguimiento'}: ${item.whatDid || 'Sin detalle'}${item.observations ? ` | Observaciones: ${item.observations}` : ''}`).join('\n')
    : '- No hay entradas en el diario de participantes para este proyecto.';

  const closingSection = closingReady
    ? `Cierre del proyecto\n- Fecha de cierre: ${formatDate(closing.closeDate)}\n- Valoración final: ${closing.finalAssessment || 'Pendiente'}\n- Resultados alcanzados: ${closing.achievedResults || 'Pendiente'}\n- Dificultades encontradas: ${closing.difficultiesFound || 'Pendiente'}\n- Propuestas de mejora: ${closing.improvementProposals || 'Pendiente'}\n- Observaciones finales: ${closing.finalNotes || 'Pendiente'}`
    : `Cierre del proyecto\n- Todavía no se ha documentado el cierre de este proyecto.${project.status === 'cerrado' ? ' Conviene completarlo para cerrar bien la memoria.' : ''}`;

  const conclusion = closing.finalNotes || closing.finalAssessment || project.summary || 'Proyecto en seguimiento. Completar con una valoración final al cierre.';

  el.reportOutput.value = `MEMORIA FINAL · BORRADOR AUTOMÁTICO\n\nIdentificación del proyecto\n- Título: ${project.title}\n- Curso / ámbito: ${project.scope || 'No indicado'}\n- Responsable principal: ${project.owner || 'No indicado'}\n- Estado actual: ${project.status}\n- Fechas: ${formatDate(project.startDate)} a ${formatDate(project.endDate)}\n\nObjetivo\n${project.goal || 'Pendiente de completar.'}\n\nParticipantes\n${project.participants || 'Pendiente de completar.'}\n\nDesarrollo cronológico\n${chronology}\n\nActuaciones principales\n${actions}\n\nSeguimiento individual y contribución de participantes\n${participantContribution}\n\nIncidencias y dificultades\n${incidents}\n\nResultados\n${results}\n\nPropuestas de mejora\n${improvements}\n\n${closingSection}\n\nConclusión final\n${conclusion}`;
}

function renderGlobalReport() {
  const totals = getGlobalTotals();
  const activeProjects = state.projects.filter((p) => p.status === 'activo');
  const projects = (activeProjects.length ? activeProjects : [...state.projects])
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));

  if (!projects.length) {
    el.globalReportOutput.value = 'MEMORIA GLOBAL\n\nTodavía no hay proyectos cargados en la aplicación.';
    return;
  }

  // Indicar en el informe si se filtra solo por activos
  const filteredNote = activeProjects.length
    ? `Este informe incluye únicamente los ${activeProjects.length} proyectos activos.`
    : 'No hay proyectos activos; se muestran todos los proyectos registrados.';

  const contextScopes = [...new Set(projects.map((project) => project.scope).filter(Boolean))];
  const ownerList = [...new Set(projects.map((project) => project.owner).filter(Boolean))];
  const developedProjects = projects.map((project, index) => `${index + 1}. ${project.title} (${project.status})`).join('\n');

  const perProjectSummary = projects.map((project) => {
    const projectProgress = [...(project.progress || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const diaryEntries = [...(project.participantDiary || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const taskCount = (project.tasks || []).length;
    const doneTasks = (project.tasks || []).filter((item) => item.status === 'hecha').length;
    const docCount = (project.documents || []).length;
    const lastProgress = projectProgress.at(-1);
    const diaryParticipants = [...new Set(diaryEntries.map((item) => item.participant).filter(Boolean))];
    const closing = normalizeClosing(project.closing);

    return [
      `- ${project.title}`,
      `  Responsable: ${project.owner || 'No indicado'} · Estado: ${project.status}`,
      `  Objetivo: ${project.goal || project.summary || 'Pendiente de completar.'}`,
      `  Avances registrados: ${projectProgress.length} · Tareas: ${doneTasks}/${taskCount} hechas · Documentos: ${docCount}`,
      `  Diario de participantes: ${diaryEntries.length} entradas${diaryParticipants.length ? ` · Participantes con seguimiento: ${diaryParticipants.join(', ')}` : ''}`,
      `  Cierre: ${hasClosingData(project) ? (closing.finalAssessment || closing.achievedResults || 'Documentado parcialmente') : 'No documentado todavía'}`,
      `  Último hito: ${lastProgress ? `${formatDate(lastProgress.date)} · ${lastProgress.done}` : 'Sin hitos adicionales registrados.'}`
    ].join('\n');
  }).join('\n\n');

  const mainActions = collectGlobalBullets(projects.flatMap((project) => [
    ...(project.tasks || []).map((task) => `${project.title}: ${task.title} (${task.status}${task.owner ? ` · ${task.owner}` : ''})`),
    ...(project.progress || []).filter((item) => item.done).map((item) => `${project.title}: ${item.done}`),
    ...(project.participantDiary || []).filter((item) => item.whatDid).map((item) => `${project.title}: ${item.participant || 'Sin participante'} · ${item.whatDid}`)
  ]), '- No hay actuaciones detalladas todavía.', 14);

  const incidents = collectGlobalBullets(projects.flatMap((project) => [
    ...(project.progress || []).filter((item) => item.difficulties).map((item) => `${project.title}: ${item.difficulties}`),
    ...(project.participantDiary || []).filter((item) => item.difficulties).map((item) => `${project.title} · ${item.participant || 'Sin participante'}: ${item.difficulties}`),
    ...(project.closing?.difficultiesFound ? [`${project.title}: ${project.closing.difficultiesFound}`] : [])
  ]), '- No se han registrado incidencias relevantes de forma global.', 12);

  const participantTrace = collectGlobalBullets(projects.flatMap((project) =>
    (project.participantDiary || []).map((item) => `${project.title}: ${item.participant || 'Sin participante'} · ${item.type || 'seguimiento'} · ${item.whatDid || 'Sin detalle'}`)
  ), '- Todavía no hay referencias individuales suficientes en el diario de participantes.', 12);

  const results = [
    `- ${totals.totalProjects} proyectos registrados en total, con ${totals.states.activo || 0} activos, ${totals.states['en pausa'] || 0} en pausa, ${totals.states.borrador || 0} en borrador y ${totals.states.cerrado || 0} cerrados.`,
    `- ${totals.totalProgress} avances documentados, ${totals.totalTasksDone} tareas completadas de ${totals.totalTasks} registradas y ${totals.totalDocuments} documentos o enlaces asociados.`,
    `- ${totals.totalDiaryEntries} entradas del diario de participantes y ${totals.totalDiaryParticipants} participantes con trazabilidad individual registrada.`,
    `- ${totals.totalProjectsWithClosing} proyectos cuentan ya con cierre documentado y ${totals.totalClosedWithoutClosing} proyectos cerrados siguen pendientes de completarlo.`,
    ownerList.length ? `- Participación de ${ownerList.length} responsables principales: ${ownerList.join(', ')}.` : '- No hay responsables principales definidos todavía.'
  ].join('\n');

  const improvements = collectGlobalBullets(projects.flatMap((project) => [
    ...(project.progress || []).filter((item) => item.nextStep).map((item) => `${project.title}: ${item.nextStep}`),
    ...(project.tasks || []).filter((item) => item.status !== 'hecha' && item.title).map((item) => `${project.title}: completar ${item.title}`),
    ...(project.participantDiary || []).filter((item) => item.nextStep).map((item) => `${project.title} · ${item.participant || 'Sin participante'}: ${item.nextStep}`),
    ...(project.closing?.improvementProposals ? [`${project.title}: ${project.closing.improvementProposals}`] : [])
  ]), '- Consolidar próximos pasos y criterios de cierre por proyecto.', 14);

  const closingOverview = collectGlobalBullets(projects
    .filter((project) => hasClosingData(project))
    .map((project) => `${project.title}: ${project.closing.finalAssessment || project.closing.achievedResults || 'Cierre registrado sin síntesis breve.'}`), '- Aún no hay cierres de proyecto incorporados a la memoria global.', 10);

  const conclusion = buildGlobalConclusion(totals, ownerList.length);

  el.globalReportOutput.value = `MEMORIA GLOBAL · BORRADOR AUTOMÁTICO\n\n${filteredNote}\n\n1. Contexto general\nLa presente memoria global reúne la información registrada en Bitácora de Proyectos para facilitar una visión conjunta del periodo de trabajo del departamento. ${contextScopes.length ? `Los ámbitos actualmente reflejados son: ${contextScopes.join(' | ')}.` : 'Todavía no se han definido ámbitos comunes en todos los proyectos.'}\n\n2. Relación de proyectos desarrollados\n${developedProjects}\n\n3. Resumen por proyecto\n${perProjectSummary}\n\n4. Actuaciones principales\n${mainActions}\n\n5. Seguimiento de participación docente o individual\n${participantTrace}\n\n6. Incidencias y dificultades\n${incidents}\n\n7. Resultados globales\n${results}\n\n8. Propuestas de mejora\n${improvements}\n\n9. Cierres de proyecto aprovechables\n${closingOverview}\n\n10. Conclusión final conjunta\n${conclusion}`;
}

function getGlobalTotals() {
  const states = state.projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  const diaryParticipants = new Set(
    state.projects.flatMap((project) => (project.participantDiary || []).map((entry) => entry.participant).filter(Boolean))
  );

  return {
    totalProjects: state.projects.length,
    totalProgress: state.projects.reduce((total, project) => total + (project.progress || []).length, 0),
    totalTasks: state.projects.reduce((total, project) => total + (project.tasks || []).length, 0),
    totalTasksDone: state.projects.reduce((total, project) => total + (project.tasks || []).filter((task) => task.status === 'hecha').length, 0),
    totalDocuments: state.projects.reduce((total, project) => total + (project.documents || []).length, 0),
    totalDiaryEntries: state.projects.reduce((total, project) => total + (project.participantDiary || []).length, 0),
    totalDiaryParticipants: diaryParticipants.size,
    totalProjectsWithClosing: state.projects.filter((project) => hasClosingData(project)).length,
    totalClosedWithoutClosing: state.projects.filter((project) => project.status === 'cerrado' && !hasClosingData(project)).length,
    states,
  };
}

function buildGlobalConclusion(totals, ownerCount) {
  if (!totals.totalProjects) {
    return 'No existen proyectos cargados, por lo que aún no se puede emitir una valoración conjunta.';
  }

  return `En conjunto, la bitácora refleja una base de trabajo útil para seguimiento real, con ${totals.totalProjects} proyectos documentados, ${totals.totalProgress} avances registrados y ${totals.totalDiaryEntries} aportaciones individuales anotadas en el diario de participantes. Esta iteración mejora además el cierre documental, con ${totals.totalProjectsWithClosing} proyectos que ya aportan información final reutilizable para memoria individual y global. Aun así, conviene seguir cerrando tareas pendientes y completar el cierre de los proyectos marcados como cerrados para disponer de una visión final más sólida y homogénea. ${ownerCount ? `La distribución actual del trabajo entre ${ownerCount} responsables principales aporta una referencia operativa suficiente para la validación de esta iteración.` : ''}`.trim();
}

function collectGlobalBullets(items, fallback, limit = 10) {
  const cleanItems = [...new Set(items.map((item) => normalizeSentence(item)).filter(Boolean))].slice(0, limit);
  return cleanItems.length ? cleanItems.map((item) => `- ${item}`).join('\n') : fallback;
}

function normalizeSentence(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

async function copyTextWithFeedback(text, feedbackElement, successMessage) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showFeedback(feedbackElement, successMessage);
  } catch {
    showFeedback(feedbackElement, 'No se pudo copiar automáticamente. Puedes copiar el texto manualmente.');
  }
}

function showFeedback(element, message) {
  if (element) element.textContent = message;
}

function exportSelectedProject() {
  const project = getSelectedProject();
  if (!project) return;
  downloadJson(project, `${slug(project.title || 'proyecto')}.json`);
  showFeedback(el.reportFeedback, 'Datos del proyecto exportados en JSON.');
}

function exportProjectReport(format) {
  const project = getSelectedProject();
  if (!project) return;
  renderReport();
  const extension = format === 'md' ? 'md' : 'txt';
  const content = extension === 'md' ? convertPlainTextReportToMarkdown(el.reportOutput.value) : el.reportOutput.value;
  downloadFile(content, `${slug(project.title || 'memoria-proyecto')}-memoria.${extension}`, extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
  showFeedback(el.reportFeedback, `Memoria del proyecto exportada en ${extension.toUpperCase()}.`);
}

function exportGlobalReport(format) {
  renderGlobalReport();
  const extension = format === 'md' ? 'md' : 'txt';
  const content = extension === 'md' ? convertPlainTextReportToMarkdown(el.globalReportOutput.value) : el.globalReportOutput.value;
  downloadFile(content, `bitacora-proyectos-memoria-global.${extension}`, extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
  showFeedback(el.globalReportFeedback, `Memoria global exportada en ${extension.toUpperCase()}.`);
}

function exportGlobalData() {
  const payload = buildBackupPayload();
  downloadJson(payload, 'bitacora-proyectos-backup.json');
  showFeedback(el.globalReportFeedback, 'Copia de seguridad exportada en JSON.');
}

async function importGlobalData(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const preview = buildImportPreview(parsed, file.name);

    if (!preview.projects.length) {
      window.alert('El archivo no contiene proyectos válidos para importar.');
      return;
    }

    state.importPreview = preview;
    setActiveView('global');
    renderImportPreview();
    showFeedback(el.globalReportFeedback, `Archivo analizado: ${preview.projects.length} proyecto(s) listo(s) para revisar antes de importar.`);
  } catch {
    clearImportPreview();
    window.alert('No se pudo importar el archivo. Revisa que sea un JSON de copia de seguridad válido.');
  }
}

function normalizeImportedProjects(payload) {
  if (Array.isArray(payload)) return normalizeProjects(payload);
  if (Array.isArray(payload?.projects)) return normalizeProjects(payload.projects);
  return [];
}

function buildImportPreview(payload, fileName = 'archivo.json') {
  const projects = normalizeImportedProjects(payload);
  const metadata = {
    source: fileName,
    app: String(payload?.app || '').trim(),
    version: payload?.version ?? null,
    exportedAt: payload?.exportedAt || ''
  };
  const totals = getTotalsFromProjects(projects);
  const warnings = [];

  if (payload && !Array.isArray(payload) && !Array.isArray(payload?.projects)) {
    warnings.push('El JSON no sigue exactamente la estructura esperada de copia de seguridad, aunque contiene datos aprovechables.');
  }

  if (metadata.version && Number(metadata.version) < 5) {
    warnings.push(`La copia parece venir de una versión anterior (${metadata.version}). Se intentará adaptar automáticamente.`);
  }

  if (!metadata.app) {
    warnings.push('El archivo no indica la aplicación de origen. Conviene revisar bien el contenido antes de confirmar.');
  }

  const comparison = compareImportedProjectsWithCurrent(projects, state.projects);

  if (comparison.duplicateTitles.length) {
    warnings.push(`Se han detectado ${comparison.duplicateTitles.length} posible(s) duplicado(s) por título.`);
  }

  const sampleProjects = projects.slice(0, 5).map((project) => {
    const titleKey = normalizeCompareText(project.title);
    const matchedCurrent = comparison.currentByTitle.get(titleKey);
    const changed = matchedCurrent ? hasProjectMeaningfulChanges(project, matchedCurrent) : false;

    return {
      title: project.title || 'Proyecto sin título',
      owner: project.owner || 'Sin responsable',
      status: project.status || 'Sin estado',
      progressCount: project.progress?.length || 0,
      tasksCount: project.tasks?.length || 0,
      documentsCount: project.documents?.length || 0,
      compareLabel: !matchedCurrent ? 'nuevo' : changed ? 'cambios detectados' : 'ya existente'
    };
  });

  // Build per-project merge details
  const mergeDetails = projects.map((project) => {
    // Primary: match by id (stable identifier)
    const matchedById = project.id ? comparison.currentById.get(project.id) : null;
    // Fallback: match by title
    const titleKey = normalizeCompareText(project.title);
    const matchedCurrent = matchedById || comparison.currentByTitle.get(titleKey) || null;
    return buildProjectMergeDetails(project, matchedCurrent, matchedById !== null);
  });

  return { projects, metadata, totals, warnings, sampleProjects, comparison, mergeDetails };
}

function buildProjectMergeDetails(importedProject, currentProject, wasMatchedById = false) {
  const isNew = !currentProject;
  const hasChanges = currentProject ? hasProjectMeaningfulChanges(importedProject, currentProject) : false;
  const matchedById = wasMatchedById;

  const diffTags = [];
  const fieldDiffs = [];

  const pushFieldDiff = (label, local, imported) => {
    if (String(local || '') !== String(imported || '')) {
      fieldDiffs.push({ label, local: local || '—', imported: imported || '—' });
      diffTags.push(label);
    }
  };

  const localProgress = currentProject?.progress?.length || 0;
  const importedProgress = importedProject.progress?.length || 0;
  const localTasks = currentProject?.tasks?.length || 0;
  const importedTasks = importedProject.tasks?.length || 0;
  const localDocs = currentProject?.documents?.length || 0;
  const importedDocs = importedProject.documents?.length || 0;
  const localDiary = currentProject?.participantDiary?.length || 0;
  const importedDiary = importedProject.participantDiary?.length || 0;

  pushFieldDiff('Título', currentProject?.title, importedProject.title);
  pushFieldDiff('Ámbito', currentProject?.scope, importedProject.scope);
  pushFieldDiff('Responsable', currentProject?.owner, importedProject.owner);
  pushFieldDiff('Participantes', currentProject?.participants, importedProject.participants);
  pushFieldDiff('Estado', currentProject?.status, importedProject.status);

  const localProgressDone = currentProject ? (currentProject.progress || []).filter(p => p.done).length : 0;
  const importedProgressDone = (importedProject.progress || []).filter(p => p.done).length;
  if (localProgress !== importedProgress) {
    diffTags.push(`Avances: ${localProgress}→${importedProgress}`);
  } else if (importedProgress > 0) {
    diffTags.push(`Avances: ${importedProgress}`);
  }
  if (localTasks !== importedTasks) diffTags.push(`Tareas: ${localTasks}→${importedTasks}`);
  else if (importedTasks > 0) diffTags.push(`Tareas: ${importedTasks}`);
  if (localDocs !== importedDocs) diffTags.push(`Docs: ${localDocs}→${importedDocs}`);
  else if (importedDocs > 0) diffTags.push(`Docs: ${importedDocs}`);
  if (localDiary !== importedDiary) diffTags.push(`Diario: ${localDiary}→${importedDiary}`);
  else if (importedDiary > 0) diffTags.push(`Diario: ${importedDiary}`);

  const localClosing = currentProject ? hasClosingData(currentProject) : false;
  const importedClosing = hasClosingData(importedProject);
  if (localClosing !== importedClosing) diffTags.push(importedClosing ? 'Cierre añadido' : 'Cierre eliminado');

  let label;
  if (isNew) {
    label = 'nuevo';
    diffTags.unshift('Nuevo proyecto');
  } else if (!hasChanges) {
    label = 'igual';
    diffTags.unshift('Sin cambios');
  } else {
    label = 'cambios';
    diffTags.unshift('Con cambios');
  }

  return {
    id: importedProject.id || normalizeCompareText(importedProject.title),
    title: importedProject.title || 'Proyecto sin título',
    status: importedProject.status || '—',
    owner: importedProject.owner || '—',
    label,
    isNew,
    hasChanges,
    matchedById,
    diffTags,
    fieldDiffs,
    importedProgress,
    localProgress,
    importedTasks,
    localTasks,
    importedDocs,
    localDocs,
    importedDiary,
    localDiary,
    importedClosing,
    localClosing
  };
}

function renderMergeDecisions(mergeDetails, projects) {
  state.mergeDecisions = {};
  el.importMergeList.innerHTML = '';

  mergeDetails.forEach((detail) => {
    // Find the imported project to get its stable id and normalized title key
    const importedProject = projects.find(p =>
      normalizeCompareText(p.title) === detail.id || p.id === detail.id
    );
    // Use imported project id as the stable decision key
    const decisionKey = importedProject?.id || detail.id;
    // Use normalized title as the key for currentByTitle lookup
    const titleKey = importedProject ? normalizeCompareText(importedProject.title) : detail.id;
    const currentProject = state.importPreview?.comparison?.currentByTitle?.get(titleKey);

    // Default decision: keep local for existing with changes, import for new or unchanged
    const defaultDecision = detail.isNew ? 'use-imported' : (detail.hasChanges ? 'keep' : 'keep');
    state.mergeDecisions[decisionKey] = defaultDecision;

    const isNoChange = detail.label === 'igual';
    const tagClass = detail.isNew ? 'diff-tag--new' : (isNoChange ? 'diff-tag--nochange' : '');

    const item = document.createElement('article');
    item.className = 'import-merge-item';
    item.innerHTML = `
      <div class="import-merge-item__header">
        <strong>${escapeHtml(detail.title)}</strong>
        <span class="badge status-${slug(detail.status || 'sin-estado')}">${escapeHtml(detail.status)}</span>
        ${detail.isNew ? `<span class="badge diary-${slug(detail.status)}" style="font-size:0.75rem">Nuevo</span>` : ''}
      </div>
      ${detail.hasChanges || detail.isNew ? `
        <div class="import-merge-item__compare">
          ${detail.isNew ? '' : `
          <div class="import-merge-item__compare-col local">
            <h5>📍 Local actual</h5>
            <p><strong>Responsable:</strong> ${escapeHtml(currentProject?.owner || '—')}</p>
            <p><strong>Estado:</strong> ${escapeHtml(currentProject?.status || '—')}</p>
            <p><strong>Avances:</strong> ${detail.localProgress} · <strong>Tareas:</strong> ${detail.localTasks} · <strong>Docs:</strong> ${detail.localDocs}</p>
            ${detail.localClosing ? '<p><strong>Cierre:</strong> Documentado</p>' : ''}
          </div>`}
          <div class="import-merge-item__compare-col imported">
            <h5>📥 Importado</h5>
            <p><strong>Responsable:</strong> ${escapeHtml(detail.owner)}</p>
            <p><strong>Estado:</strong> ${escapeHtml(detail.status)}</p>
            <p><strong>Avances:</strong> ${detail.importedProgress} · <strong>Tareas:</strong> ${detail.importedTasks} · <strong>Docs:</strong> ${detail.importedDocs}</p>
            ${detail.importedClosing ? '<p><strong>Cierre:</strong> Documentado</p>' : ''}
          </div>
        </div>
        <div class="import-merge-item__diff">
          ${detail.diffTags.map((tag) => `<span class="diff-tag ${tagClass}">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : `
        <div class="import-merge-item__diff">
          <span class="diff-tag diff-tag--nochange">Sin cambios detectados</span>
        </div>
      `}
      <div class="import-merge-item__actions">
        ${detail.isNew ? `
          <label data-merge-decision="${decisionKey}" data-decision="use-imported" class="selected">
            <input type="radio" name="merge-${decisionKey}" value="use-imported" checked />
            Importar como nuevo
          </label>
        ` : `
          <label data-merge-decision="${decisionKey}" data-decision="keep" class="${!isNoChange ? 'selected' : ''}" ${isNoChange ? 'style="opacity:0.5;pointer-events:none"' : ''}>
            <input type="radio" name="merge-${decisionKey}" value="keep" ${!isNoChange ? 'checked' : 'disabled'} />
            Conservar local
          </label>
          <label data-merge-decision="${decisionKey}" data-decision="use-imported" ${isNoChange ? 'style="opacity:0.5;pointer-events:none"' : ''}>
            <input type="radio" name="merge-${decisionKey}" value="use-imported" ${isNoChange ? 'disabled' : ''} />
            Usar importado
          </label>
          ${detail.hasChanges ? `
          <label data-merge-decision="${decisionKey}" data-decision="merge">
            <input type="radio" name="merge-${decisionKey}" value="merge" />
            Fusionar avances
          </label>` : ''}
        `}
      </div>
    `;

    // Attach event listeners
    item.querySelectorAll('[data-merge-decision]').forEach((label) => {
      label.addEventListener('click', () => {
        const decision = label.dataset.decision;
        const itemId = label.dataset.mergeDecision;
        state.mergeDecisions[itemId] = decision;
        item.querySelectorAll('[data-merge-decision]').forEach((l) => l.classList.remove('selected'));
        label.classList.add('selected');
        label.querySelector('input').checked = true;
      });
    });

    el.importMergeList.appendChild(item);
  });
}

function getTotalsFromProjects(projects = []) {
  return projects.reduce((acc, project) => {
    acc.projects += 1;
    acc.progress += project.progress?.length || 0;
    acc.tasks += project.tasks?.length || 0;
    acc.documents += project.documents?.length || 0;
    return acc;
  }, { projects: 0, progress: 0, tasks: 0, documents: 0 });
}

function compareImportedProjectsWithCurrent(importedProjects = [], currentProjects = []) {
  const currentByTitle = new Map();
  const currentById = new Map();
  const duplicateTitles = [];

  currentProjects.forEach((project) => {
    // Index by title (normalized)
    const titleKey = normalizeCompareText(project.title);
    if (titleKey) {
      if (!currentByTitle.has(titleKey)) {
        currentByTitle.set(titleKey, project);
      } else {
        duplicateTitles.push(project.title || 'Proyecto sin título');
      }
    }
    // Index by id (stable identifier)
    if (project.id) {
      currentById.set(project.id, project);
    }
  });

  let newCount = 0;
  let existingCount = 0;
  let changedCount = 0;
  const importedDuplicateTitles = [];
  const seenImportedTitles = new Set();

  importedProjects.forEach((project) => {
    const titleKey = normalizeCompareText(project.title);

    // First check: is this project already present locally by id?
    // This is the primary duplicate-detection mechanism (stable identifier)
    if (project.id && currentById.has(project.id)) {
      const matchedCurrent = currentById.get(project.id);
      existingCount += 1;
      if (hasProjectMeaningfulChanges(project, matchedCurrent)) {
        changedCount += 1;
      }
      return;
    }

    // Fallback: match by title (for projects exported from older versions or without stable id)
    if (!titleKey) {
      newCount += 1;
      return;
    }

    if (seenImportedTitles.has(titleKey)) {
      importedDuplicateTitles.push(project.title || 'Proyecto sin título');
    }
    seenImportedTitles.add(titleKey);

    const matchedCurrent = currentByTitle.get(titleKey);
    if (!matchedCurrent) {
      newCount += 1;
      return;
    }

    existingCount += 1;
    if (hasProjectMeaningfulChanges(project, matchedCurrent)) {
      changedCount += 1;
    }
  });

  return {
    newCount,
    existingCount,
    changedCount,
    duplicateTitles: [...new Set([...duplicateTitles, ...importedDuplicateTitles])],
    currentByTitle,
    currentById
  };
}

function hasProjectMeaningfulChanges(importedProject, currentProject) {
  if (!importedProject || !currentProject) return false;

  const importedSnapshot = [
    normalizeCompareText(importedProject.status),
    normalizeCompareText(importedProject.owner),
    importedProject.progress?.length || 0,
    importedProject.tasks?.length || 0,
    importedProject.documents?.length || 0,
    importedProject.participantDiary?.length || 0,
    hasClosingData(importedProject) ? 1 : 0
  ].join('|');

  const currentSnapshot = [
    normalizeCompareText(currentProject.status),
    normalizeCompareText(currentProject.owner),
    currentProject.progress?.length || 0,
    currentProject.tasks?.length || 0,
    currentProject.documents?.length || 0,
    currentProject.participantDiary?.length || 0,
    hasClosingData(currentProject) ? 1 : 0
  ].join('|');

  return importedSnapshot !== currentSnapshot;
}

function normalizeCompareText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function renderImportPreview() {
  const preview = state.importPreview;
  const hasPreview = Boolean(preview?.projects?.length);

  el.importPreviewPanel.classList.toggle('hidden', !hasPreview);
  if (!hasPreview) {
    el.importPreviewList.innerHTML = '';
    el.importPreviewSummary.textContent = 'Selecciona un archivo JSON para revisar su contenido antes de importarlo.';
    el.importPreviewProjects.textContent = '0';
    el.importPreviewProgress.textContent = '0';
    el.importPreviewTasks.textContent = '0';
    el.importPreviewDocuments.textContent = '0';
    el.importCompareNewProjects.textContent = '0';
    el.importCompareExistingProjects.textContent = '0';
    el.importCompareDuplicateProjects.textContent = '0';
    el.importCompareChangedProjects.textContent = '0';
    el.importCompareSummary.textContent = '';
    el.importPreviewWarning.textContent = '';
    return;
  }

  const { metadata, totals, sampleProjects, warnings, comparison } = preview;
  const parts = [
    `Archivo: ${metadata.source}`,
    metadata.app ? `Origen: ${metadata.app}` : '',
    metadata.version ? `Versión: ${metadata.version}` : '',
    metadata.exportedAt ? `Exportado: ${formatDisplayDateTime(metadata.exportedAt)}` : ''
  ].filter(Boolean);

  el.importPreviewSummary.textContent = parts.join(' · ');
  el.importPreviewProjects.textContent = String(totals.projects);
  el.importPreviewProgress.textContent = String(totals.progress);
  el.importPreviewTasks.textContent = String(totals.tasks);
  el.importPreviewDocuments.textContent = String(totals.documents);
  el.importCompareNewProjects.textContent = String(comparison.newCount);
  el.importCompareExistingProjects.textContent = String(comparison.existingCount);
  el.importCompareDuplicateProjects.textContent = String(comparison.duplicateTitles.length);
  el.importCompareChangedProjects.textContent = String(comparison.changedCount);
  el.importCompareSummary.textContent = buildImportCompareSummary(comparison);
  el.importPreviewWarning.textContent = warnings.join(' ');

  // Show merge panel when there are conflicts
  const hasConflicts = comparison.existingCount > 0 || comparison.newCount > 0;
  el.importMergePanel.classList.toggle('hidden', !hasConflicts);

  if (hasConflicts && preview.mergeDetails) {
    // Build dynamic hint text
    const newCount = comparison.newCount;
    const existingCount = comparison.existingCount;
    const parts = [];
    if (newCount > 0) parts.push(`${newCount} proyecto(s) nuevo(s) que se importarán`);
    if (existingCount > 0) parts.push(`${existingCount} proyecto(s) existente(s) con opciones de decisión`);
    el.importMergeHint.textContent = parts.join(' · ') + '. Revisa cada caso y decide antes de confirmar.';

    renderMergeDecisions(preview.mergeDetails, preview.projects);
    el.replaceAllImportBtn.classList.remove('hidden');
  } else {
    el.importMergeList.innerHTML = '';
    el.importMergeHint.textContent = 'Revisa cada proyecto y decide qué hacer antes de importar.';
    el.replaceAllImportBtn.classList.add('hidden');
  }

  el.importPreviewList.innerHTML = sampleProjects.map((project) => `
    <article class="import-preview-item">
      <strong>${escapeHtml(project.title)}</strong>
      <p class="muted">${escapeHtml(project.owner)} · ${escapeHtml(project.status)} · ${escapeHtml(project.compareLabel)}</p>
      <p>Avances: ${project.progressCount} · Tareas: ${project.tasksCount} · Documentos: ${project.documentsCount}</p>
    </article>
  `).join('');

  if (preview.projects.length > sampleProjects.length) {
    el.importPreviewList.insertAdjacentHTML('beforeend', `<p class="muted">Y ${preview.projects.length - sampleProjects.length} proyecto(s) más en la copia.</p>`);
  }
}

function buildImportCompareSummary(comparison) {
  if (!comparison) return '';

  const parts = [
    `${comparison.newCount} nuevo(s)`,
    `${comparison.existingCount} ya existente(s)`,
    `${comparison.changedCount} con cambios detectados`
  ];

  if (comparison.duplicateTitles.length) {
    const sample = comparison.duplicateTitles.slice(0, 3).join(', ');
    parts.push(`posibles duplicados: ${sample}${comparison.duplicateTitles.length > 3 ? '…' : ''}`);
  }

  return `Comparación con los datos actuales: ${parts.join(' · ')}.`;
}

function confirmImportPreview() {
  const preview = state.importPreview;
  if (!preview?.projects?.length) return;

  const hasMergeDecisions = Object.keys(state.mergeDecisions).length > 0;
  let finalProjects;

  if (hasMergeDecisions) {
    finalProjects = applyMergeDecisions(preview);
  } else {
    const overwrite = state.projects.length
      ? window.confirm('La importación sustituirá los datos actuales guardados en este navegador. ¿Quieres continuar?')
      : true;
    if (!overwrite) return;
    finalProjects = preview.projects;
  }

  state.projects = finalProjects;
  state.selectedProjectId = finalProjects[0]?.id || null;
  state.diaryFilters = { participant: '', type: '', from: '', to: '' };
  persist();
  const importedCount = finalProjects.length;
  clearImportPreview({ silent: true });
  renderAll();
  showFeedback(el.globalReportFeedback, `Importación completada: ${importedCount} proyecto(s) cargado(s).`);
}

function replaceAllImport() {
  const preview = state.importPreview;
  if (!preview?.projects?.length) return;

  const overwrite = state.projects.length
    ? window.confirm('Se sustituirán TODOS los datos actuales con los del archivo. ¿Continuar?')
    : true;
  if (!overwrite) return;

  state.projects = preview.projects;
  state.selectedProjectId = preview.projects[0]?.id || null;
  state.diaryFilters = { participant: '', type: '', from: '', to: '' };
  persist();
  clearImportPreview({ silent: true });
  renderAll();
  showFeedback(el.globalReportFeedback, `Importación completada: ${preview.projects.length} proyecto(s) sustituido(s).`);
}

function useAllImportedMerge() {
  if (!state.importPreview?.mergeDetails || !state.importPreview?.projects) return;
  state.importPreview.mergeDetails.forEach((detail) => {
    const importedProject = state.importPreview.projects.find(p =>
      normalizeCompareText(p.title) === detail.id || p.id === detail.id
    );
    const decisionKey = importedProject?.id || detail.id;
    const decision = detail.isNew ? 'use-imported' : 'merge';
    state.mergeDecisions[decisionKey] = decision;
  });
  renderMergeDecisions(state.importPreview.mergeDetails, state.importPreview.projects);
}

function applyMergeDecisions(preview) {
  const decisions = state.mergeDecisions;
  const currentByTitle = preview.comparison.currentByTitle;
  const result = [];

  preview.projects.forEach((importedProject) => {
    const titleKey = normalizeCompareText(importedProject.title);
    const decisionKey = importedProject.id || titleKey;
    const decision = decisions[decisionKey] || decisions[titleKey] || (importedProject.title ? 'use-imported' : 'keep');
    const matchedCurrent = currentByTitle.get(titleKey);

    if (decision === 'keep') {
      // Keep local version unchanged
      if (matchedCurrent) {
        result.push({ ...matchedCurrent });
      }
    } else if (decision === 'use-imported') {
      // Use imported version as-is
      result.push({ ...normalizeProjects([importedProject])[0] });
    } else if (decision === 'merge') {
      // Merge: use imported metadata but append local progress/diary/tasks/documents
      if (!matchedCurrent) {
        // No local match - treat as import
        result.push({ ...normalizeProjects([importedProject])[0] });
      } else {
        // Merge local entries into imported project
        const merged = { ...normalizeProjects([importedProject])[0] };
        merged.id = matchedCurrent.id;
        // Append local-only entries to imported collections
        merged.progress = mergeEntriesById(merged.progress || [], matchedCurrent.progress || []);
        merged.tasks = mergeEntriesById(merged.tasks || [], matchedCurrent.tasks || []);
        merged.documents = mergeEntriesById(merged.documents || [], matchedCurrent.documents || []);
        merged.participantDiary = mergeEntriesById(merged.participantDiary || [], matchedCurrent.participantDiary || []);
        // Keep local closing if it has data and imported doesn't
        const localClosing = normalizeClosing(matchedCurrent.closing);
        const importedClosing = normalizeClosing(importedProject.closing);
        if (hasClosingData(matchedCurrent) && !hasClosingData(importedProject)) {
          merged.closing = localClosing;
        } else if (hasClosingData(importedProject) && !hasClosingData(matchedCurrent)) {
          merged.closing = importedClosing;
        } else if (hasClosingData(matchedCurrent) && hasClosingData(importedProject)) {
          // Both have closing: prefer imported but keep local closing notes as reference
          merged.closing = importedClosing;
        } else {
          merged.closing = createEmptyClosing();
        }
        result.push(merged);
      }
    }
  });

  return result;
}

function mergeEntriesById(importedEntries = [], localEntries = []) {
  const seen = new Set(importedEntries.map((e) => e.id));
  const merged = [...importedEntries];
  localEntries.forEach((localEntry) => {
    if (!seen.has(localEntry.id)) {
      merged.push({ ...localEntry });
      seen.add(localEntry.id);
    }
  });
  return merged;
}

function clearImportPreview(options = {}) {
  state.importPreview = null;
  state.mergeDecisions = {};
  if (!options.silent) {
    renderImportPreview();
  }
}

function buildBackupPayload() {
  return {
    app: 'Bitácora de Proyectos',
    version: 5,
    exportedAt: new Date().toISOString(),
    totals: getGlobalTotals(),
    projects: state.projects
  };
}

function downloadJson(data, filename) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8');
}

function downloadFile(content, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function convertPlainTextReportToMarkdown(text = '') {
  const knownSections = new Set([
    'Identificación del proyecto', 'Objetivo', 'Participantes', 'Desarrollo cronológico', 'Actuaciones principales',
    'Seguimiento individual y contribución de participantes', 'Incidencias y dificultades', 'Resultados',
    'Propuestas de mejora', 'Cierre del proyecto', 'Conclusión final', 'Contexto general', 'Relación de proyectos desarrollados',
    'Resumen por proyecto', 'Seguimiento de participación docente o individual', 'Resultados globales',
    'Cierres de proyecto aprovechables', 'Conclusión final conjunta'
  ]);

  return text
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (index === 0) return `# ${trimmed}`;
      const numberedHeading = trimmed.match(/^\d+\.\s+(.+)$/);
      if (numberedHeading) return `## ${numberedHeading[1]}`;
      if (knownSections.has(trimmed)) return `## ${trimmed}`;
      return line;
    })
    .join('\n');
}

function getSelectedProject() {
  return state.projects.find((project) => project.id === state.selectedProjectId) || null;
}

function fillSelect(select, options, labels = null) {
  select.innerHTML = options.map((option) => {
    const label = labels?.[option] || option;
    return `<option value="${escapeAttribute(option)}">${escapeHtml(label)}</option>`;
  }).join('');
}

async function installPwa() {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  el.installAppBtn.classList.add('hidden');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
    } catch {
      // Sin bloqueo.
    }
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

function formatDisplayDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-ES');
}

function slug(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function trimText(value = '', max = 120) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value);
}
