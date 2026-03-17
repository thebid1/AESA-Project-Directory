// ==========================================
// AESA Research Directory - Main Application
// ==========================================

// State
let allProjects = [];
let filteredProjects = [];
let currentSort = { field: 'year', direction: 'desc' };
let activeFilters = {
  search: '',
  year: '',
  supervisor: '',
  student: ''
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const welcomeSection = document.getElementById('welcomeSection');
const yearFilter = document.getElementById('yearFilter');
const supervisorFilter = document.getElementById('supervisorFilter');
const studentFilter = document.getElementById('studentFilter');
const activeFiltersContainer = document.getElementById('activeFilters');
const resultsCount = document.getElementById('resultsCount');
const projectsTableBody = document.getElementById('projectsTableBody');
const tableHeaders = document.querySelectorAll('.data-table th[data-sort]');
const detailModal = document.getElementById('detailModal');
const closeModalBtn = document.getElementById('closeModal');
const backToDirectoryBtn = document.getElementById('backToDirectory');
const downloadBtn = document.getElementById('downloadBtn');

// Detail modal elements
const detailTopic = document.getElementById('detailTopic');
const detailYear = document.getElementById('detailYear');
const detailStudent = document.getElementById('detailStudent');
const detailSupervisor = document.getElementById('detailSupervisor');

// ==========================================
// Data Loading
// ==========================================

async function loadProjects() {
  try {
    // TODO: Phase 2 - Replace with API call: const response = await fetch('/api/projects');
    const response = await fetch('data.json');
    const data = await response.json();
    
    // Filter out empty entries (entries with no topic)
    allProjects = data.filter(p => p.topic && p.topic.trim() !== '');
    
    // If localStorage has data, merge it (for admin updates)
    const localData = localStorage.getItem('aesa_projects');
    if (localData) {
      const parsed = JSON.parse(localData);
      // Merge strategy: localStorage overrides data.json for same IDs
      const localIds = new Set(parsed.map(p => p.id));
      allProjects = [
        ...parsed,
        ...allProjects.filter(p => !localIds.has(p.id))
      ];
    }
    
    // Sort by year desc by default
    allProjects.sort((a, b) => b.year - a.year);
    
    filteredProjects = [...allProjects];
    
    populateFilters();
    renderProjects();
    updateResultsCount();
    updateWelcomeStats();
  } catch (error) {
    console.error('Error loading projects:', error);
    projectsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <p>Error loading projects. Please refresh the page.</p>
        </td>
      </tr>
    `;
  }
}

// ==========================================
// Filtering & Search
// ==========================================

function populateFilters() {
  // Get unique years
  const years = [...new Set(allProjects.map(p => p.year))].filter(Boolean).sort((a, b) => b - a);
  yearFilter.innerHTML = '<option value="">All Years</option>' +
    years.map(year => `<option value="${year}">${year}</option>`).join('');
  
  // Get unique supervisors
  const supervisors = [...new Set(allProjects.map(p => p.supervisor))].filter(Boolean).sort();
  supervisorFilter.innerHTML = '<option value="">All Supervisors</option>' +
    supervisors.map(sup => `<option value="${sup}">${sup}</option>`).join('');
}

function filterProjects() {
  filteredProjects = allProjects.filter(project => {
    // Search filter (all fields)
    if (activeFilters.search) {
      const searchLower = activeFilters.search.toLowerCase();
      const searchFields = [
        project.topic,
        project.student_name,
        project.supervisor,
        String(project.year)
      ].join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }
    
    // Year filter
    if (activeFilters.year && String(project.year) !== activeFilters.year) {
      return false;
    }
    
    // Supervisor filter
    if (activeFilters.supervisor && project.supervisor !== activeFilters.supervisor) {
      return false;
    }
    
    // Student filter
    if (activeFilters.student) {
      const studentLower = activeFilters.student.toLowerCase();
      if (!project.student_name.toLowerCase().includes(studentLower)) {
        return false;
      }
    }
    
    return true;
  });
  
  sortProjects();
  renderProjects();
  updateResultsCount();
  updateActiveFiltersDisplay();
  toggleWelcomeSection();
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark class="highlight">$1</mark>');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==========================================
// Sorting
// ==========================================

function sortProjects() {
  filteredProjects.sort((a, b) => {
    let valA = a[currentSort.field];
    let valB = b[currentSort.field];
    
    // Handle null/undefined
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    
    // String comparison
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    
    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

function updateSortIcons() {
  tableHeaders.forEach(th => {
    th.classList.remove('sorted');
    const icon = th.querySelector('.sort-icon svg');
    if (th.dataset.sort === currentSort.field) {
      th.classList.add('sorted');
      icon.innerHTML = currentSort.direction === 'asc' 
        ? '<path d="m18 15-6-6-6 6"/>'
        : '<path d="m6 9 6 6 6-6"/>';
    } else {
      icon.innerHTML = '<path d="m6 9 6 6 6-6"/>';
    }
  });
}

// ==========================================
// Rendering
// ==========================================

function renderProjects() {
  if (filteredProjects.length === 0) {
    projectsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
            <path d="M11 8v6"></path>
            <path d="M8 11h6"></path>
          </svg>
          <h3>No projects found</h3>
          <p>Try adjusting your search or filters</p>
        </td>
      </tr>
    `;
    return;
  }
  
  projectsTableBody.innerHTML = filteredProjects.map(project => `
    <tr onclick="openProjectDetail(${project.id})">
      <td data-label="Year" class="cell-year">
        ${project.year || '-'}
      </td>
      <td data-label="Topic" class="cell-topic">
        ${highlightMatch(project.topic, activeFilters.search)}
      </td>
      <td data-label="Student" class="cell-student">
        ${highlightMatch(project.student_name, activeFilters.search)}
      </td>
      <td data-label="Supervisor" class="cell-supervisor">
        ${highlightMatch(project.supervisor, activeFilters.search)}
      </td>
    </tr>
  `).join('');
}

function updateResultsCount() {
  resultsCount.textContent = filteredProjects.length.toLocaleString();
}

function updateActiveFiltersDisplay() {
  const chips = [];
  
  if (activeFilters.search) {
    chips.push(createFilterChip('Search: ' + activeFilters.search, () => {
      searchInput.value = '';
      if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
      }
      activeFilters.search = '';
      filterProjects();
    }));
  }
  
  if (activeFilters.year) {
    chips.push(createFilterChip('Year: ' + activeFilters.year, () => {
      yearFilter.value = '';
      activeFilters.year = '';
      filterProjects();
    }));
  }
  
  if (activeFilters.supervisor) {
    chips.push(createFilterChip('Supervisor: ' + activeFilters.supervisor, () => {
      supervisorFilter.value = '';
      activeFilters.supervisor = '';
      filterProjects();
    }));
  }
  
  if (activeFilters.student) {
    chips.push(createFilterChip('Student: ' + activeFilters.student, () => {
      studentFilter.value = '';
      activeFilters.student = '';
      filterProjects();
    }));
  }
  
  if (chips.length > 0) {
    chips.push(`<button class="clear-filters" onclick="clearAllFilters()">Clear all</button>`);
  }
  
  activeFiltersContainer.innerHTML = chips.join('');
}

function createFilterChip(label, onRemove) {
  const id = 'chip-' + Math.random().toString(36).substr(2, 9);
  setTimeout(() => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = onRemove;
  }, 0);
  
  return `
    <span class="filter-chip">
      ${label}
      <button id="${id}" aria-label="Remove filter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </span>
  `;
}

function clearAllFilters() {
  searchInput.value = '';
  if (clearSearchBtn) {
    clearSearchBtn.style.display = 'none';
  }
  yearFilter.value = '';
  supervisorFilter.value = '';
  studentFilter.value = '';
  
  activeFilters = {
    search: '',
    year: '',
    supervisor: '',
    student: ''
  };
  
  filterProjects();
}

// ==========================================
// Modal / Detail View
// ==========================================

function openProjectDetail(id) {
  const project = allProjects.find(p => p.id === id);
  if (!project) return;
  
  detailTopic.textContent = project.topic;
  detailYear.textContent = project.year || 'Not specified';
  detailStudent.textContent = project.student_name;
  detailSupervisor.textContent = project.supervisor;
  
  // TODO: Phase 2 - Enable download when PDF is available
  // downloadBtn.disabled = !project.pdf_url;
  downloadBtn.disabled = true;
  
  detailModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailModal.classList.remove('active');
  document.body.style.overflow = '';
}

// ==========================================
// Event Listeners
// ==========================================

function initEventListeners() {
  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const value = e.target.value;
    
    // Show/hide clear button
    if (clearSearchBtn) {
      clearSearchBtn.style.display = value ? 'flex' : 'none';
    }
    
    searchTimeout = setTimeout(() => {
      activeFilters.search = value.trim();
      filterProjects();
    }, 150);
  });
  
  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      activeFilters.search = '';
      filterProjects();
      searchInput.focus();
    });
  }
  
  // Filters
  yearFilter.addEventListener('change', (e) => {
    activeFilters.year = e.target.value;
    filterProjects();
  });
  
  supervisorFilter.addEventListener('change', (e) => {
    activeFilters.supervisor = e.target.value;
    filterProjects();
  });
  
  studentFilter.addEventListener('input', (e) => {
    activeFilters.student = e.target.value.trim();
    filterProjects();
  });
  
  // Sorting
  tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      
      updateSortIcons();
      sortProjects();
      renderProjects();
    });
  });
  
  // Modal
  closeModalBtn.addEventListener('click', closeModal);
  backToDirectoryBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });
  
  downloadBtn.addEventListener('click', () => {
    // TODO: Phase 2 - Implement PDF download
    alert('PDF download coming soon!');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) {
      closeModal();
    }
    
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// ==========================================
// Welcome Section
// ==========================================

function updateWelcomeStats() {
  const totalProjectsEl = document.getElementById('totalProjects');
  const totalYearsEl = document.getElementById('totalYears');
  const totalSupervisorsEl = document.getElementById('totalSupervisors');
  
  if (totalProjectsEl) {
    totalProjectsEl.textContent = allProjects.length;
  }
  if (totalYearsEl) {
    const uniqueYears = new Set(allProjects.map(p => p.year)).size;
    totalYearsEl.textContent = uniqueYears;
  }
  if (totalSupervisorsEl) {
    const uniqueSupervisors = new Set(allProjects.map(p => p.supervisor)).size;
    totalSupervisorsEl.textContent = uniqueSupervisors;
  }
}

function toggleWelcomeSection() {
  if (welcomeSection) {
    const hasSearch = activeFilters.search || activeFilters.year || activeFilters.supervisor || activeFilters.student;
    welcomeSection.style.display = hasSearch ? 'none' : 'block';
  }
}

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  initEventListeners();
});
