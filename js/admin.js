// ==========================================
// AESA Admin Panel
// ==========================================

// Configuration
const ADMIN_PASSWORD = 'aesa2024'; // TODO: Phase 2 - Move to server-side auth

// State
let projects = [];
let editingId = null;
let deleteId = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Tabs
const tabLinks = document.querySelectorAll('.admin-nav a');
const tabContents = document.querySelectorAll('.tab-content');

// Form
const projectForm = document.getElementById('projectForm');
const formTitle = document.getElementById('formTitle');
const submitBtnText = document.getElementById('submitBtnText');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const projectIdInput = document.getElementById('projectId');
const projectYear = document.getElementById('projectYear');
const projectStudent = document.getElementById('projectStudent');
const projectTopic = document.getElementById('projectTopic');
const projectSupervisor = document.getElementById('projectSupervisor');

// Table
const adminSearch = document.getElementById('adminSearch');
const adminProjectsTableBody = document.getElementById('adminProjectsTableBody');

// Delete Modal
const deleteModal = document.getElementById('deleteModal');
const deleteProjectTitle = document.getElementById('deleteProjectTitle');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const closeDeleteModalBtn = document.getElementById('closeDeleteModal');

// CSV Upload
const uploadArea = document.getElementById('uploadArea');
const csvInput = document.getElementById('csvInput');

// ==========================================
// Authentication
// ==========================================

function checkAuth() {
  const session = localStorage.getItem('aesa_admin_session');
  if (session === 'active') {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  adminDashboard.style.display = 'none';
}

function showDashboard() {
  loginScreen.style.display = 'none';
  adminDashboard.style.display = 'block';
  loadProjects();
}

function initAuth() {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('aesa_admin_session', 'active');
      loginError.style.display = 'none';
      showDashboard();
    } else {
      loginError.style.display = 'flex';
    }
  });
  
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('aesa_admin_session');
    showLogin();
  });
}

// ==========================================
// Data Management
// ==========================================

async function loadProjects() {
  // TODO: Phase 2 - Replace with API call: fetch('/api/projects')
  const localData = localStorage.getItem('aesa_projects');
  
  // Always load data.json first to ensure we have the latest base data
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    const dataJsonProjects = data.filter(p => p.topic && p.topic.trim() !== '');
    
    if (localData) {
      // Merge strategy: localStorage overrides data.json for same IDs
      const parsed = JSON.parse(localData);
      const localIds = new Set(parsed.map(p => p.id));
      projects = [
        ...parsed,
        ...dataJsonProjects.filter(p => !localIds.has(p.id))
      ];
    } else {
      projects = dataJsonProjects;
    }
    
    saveProjects(); // Sync merged data back to localStorage
    renderProjects();
    populateYearSelect();
  } catch (error) {
    console.error('Error loading projects:', error);
    // Fallback to localStorage only if data.json fails
    if (localData) {
      projects = JSON.parse(localData);
      renderProjects();
      populateYearSelect();
    }
  }
}

function saveProjects() {
  // TODO: Phase 2 - Replace with API call
  localStorage.setItem('aesa_projects', JSON.stringify(projects));
}

async function generateId() {
  // Ensure we have the latest data from both sources before generating ID
  const localData = localStorage.getItem('aesa_projects');
  let maxId = 0;
  
  // Check localStorage
  if (localData) {
    const parsed = JSON.parse(localData);
    maxId = Math.max(maxId, ...parsed.map(p => p.id || 0));
  }
  
  // Check data.json
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    const dataIds = data.filter(p => p.id).map(p => p.id);
    if (dataIds.length > 0) {
      maxId = Math.max(maxId, ...dataIds);
    }
  } catch (error) {
    console.error('Error checking data.json for ID generation:', error);
  }
  
  return maxId + 1;
}

// ==========================================
// Form Handling
// ==========================================

function populateYearSelect() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2000; y--) {
    years.push(y);
  }
  
  const currentValue = projectYear.value;
  projectYear.innerHTML = '<option value="">Select Year</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');
  projectYear.value = currentValue;
}

function initForm() {
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const projectData = {
      year: parseInt(projectYear.value),
      topic: projectTopic.value.trim(),
      student_name: projectStudent.value.trim(),
      supervisor: projectSupervisor.value.trim(),
      pdf_url: null // TODO: Phase 2 - Handle PDF upload
    };
    
    if (editingId) {
      // Update existing
      const index = projects.findIndex(p => p.id === editingId);
      if (index !== -1) {
        projects[index] = { ...projects[index], ...projectData };
        showAlert('Project updated successfully', 'success');
      }
    } else {
      // Create new
      projectData.id = await generateId();
      projects.push(projectData);
      showAlert('Project added successfully', 'success');
    }
    
    saveProjects();
    resetForm();
    renderProjects();
  });
  
  cancelEditBtn.addEventListener('click', resetForm);
}

function resetForm() {
  projectForm.reset();
  projectIdInput.value = '';
  editingId = null;
  formTitle.textContent = 'Add New Project';
  submitBtnText.textContent = 'Save Project';
  cancelEditBtn.style.display = 'none';
}

function editProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  
  editingId = id;
  projectIdInput.value = id;
  projectYear.value = project.year;
  projectStudent.value = project.student_name;
  projectTopic.value = project.topic;
  projectSupervisor.value = project.supervisor;
  
  formTitle.textContent = 'Edit Project';
  submitBtnText.textContent = 'Update Project';
  cancelEditBtn.style.display = 'inline-flex';
  
  // Scroll to form
  projectForm.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// Delete Handling
// ==========================================

function confirmDelete(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  
  deleteId = id;
  deleteProjectTitle.textContent = project.topic;
  deleteModal.classList.add('active');
}

function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deleteId = null;
}

function initDeleteModal() {
  confirmDeleteBtn.addEventListener('click', () => {
    if (deleteId) {
      projects = projects.filter(p => p.id !== deleteId);
      saveProjects();
      renderProjects();
      showAlert('Project deleted successfully', 'success');
      
      // Reset form if editing the deleted project
      if (editingId === deleteId) {
        resetForm();
      }
    }
    closeDeleteModal();
  });
  
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
}

// ==========================================
// Table Rendering
// ==========================================

function renderProjects() {
  const searchTerm = adminSearch.value.toLowerCase();
  
  const filtered = projects.filter(p => 
    p.topic.toLowerCase().includes(searchTerm) ||
    p.student_name.toLowerCase().includes(searchTerm) ||
    p.supervisor.toLowerCase().includes(searchTerm) ||
    String(p.year).includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    adminProjectsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: var(--space-xl);">
          No projects found
        </td>
      </tr>
    `;
    return;
  }
  
  adminProjectsTableBody.innerHTML = filtered.map(p => `
    <tr>
      <td>${p.id}</td>
      <td class="cell-year">${p.year}</td>
      <td>${p.student_name}</td>
      <td style="max-width: 300px;">${p.topic}</td>
      <td>${p.supervisor}</td>
      <td class="cell-actions">
        <div class="table-actions">
          <button class="action-btn edit" onclick="editProject(${p.id})" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete" onclick="confirmDelete(${p.id})" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function initTable() {
  adminSearch.addEventListener('input', () => renderProjects());
}

// ==========================================
// CSV Import/Export
// ==========================================

function initCSVUpload() {
  // Upload area interactions
  uploadArea.addEventListener('click', () => csvInput.click());
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      processCSV(files[0]);
    } else {
      showAlert('Please upload a CSV file', 'error');
    }
  });
  
  csvInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processCSV(e.target.files[0]);
    }
  });
}

async function processCSV(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const csv = e.target.result;
    const lines = csv.split('\n').filter(l => l.trim());
    
    // Check header
    const header = lines[0].toLowerCase();
    if (!header.includes('year') || !header.includes('topic') || !header.includes('student')) {
      showAlert('Invalid CSV format. Expected headers: year, topic, student_name, supervisor', 'error');
      return;
    }
    
    // Get starting ID
    let nextId = await generateId();
    
    // Parse data
    const newProjects = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (handles quoted fields)
      const fields = parseCSVLine(line);
      
      if (fields.length >= 4) {
        const year = parseInt(fields[0]);
        const topic = fields[1].replace(/^"|"$/g, '').trim();
        const student_name = fields[2].replace(/^"|"$/g, '').trim();
        const supervisor = fields[3].replace(/^"|"$/g, '').trim();
        
        if (year && topic && student_name && supervisor) {
          newProjects.push({
            id: nextId++,
            year,
            topic,
            student_name,
            supervisor,
            pdf_url: null
          });
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }
    
    // Add to projects
    projects = [...projects, ...newProjects];
    saveProjects();
    renderProjects();
    
    showAlert(`Imported ${successCount} projects successfully${errorCount > 0 ? ` (${errorCount} skipped)` : ''}`, 'success');
    
    // Switch to projects tab
    switchTab('projects');
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function initExport() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const csv = [
      'year,topic,student_name,supervisor',
      ...projects.map(p => `${p.year},"${p.topic}","${p.student_name}","${p.supervisor}"`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aesa-projects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Projects exported successfully', 'success');
  });
}

// ==========================================
// Tabs
// ==========================================

function switchTab(tabId) {
  tabLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabId);
  });
  
  tabContents.forEach(content => {
    content.style.display = content.id === tabId + 'Tab' ? 'block' : 'none';
  });
}

function initTabs() {
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });
}

// ==========================================
// Utilities
// ==========================================

function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} fade-in`;
  alert.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success' 
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'
      }
    </svg>
    <span>${message}</span>
  `;
  
  container.innerHTML = '';
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.3s';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initAuth();
  initForm();
  initDeleteModal();
  initTable();
  initTabs();
  initCSVUpload();
  initExport();
});
