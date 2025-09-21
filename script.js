// --- DATA STORAGE ---
let projects = [];
let clients = [];
let tasks = [];
let controlPoints = [];

// --- UTILITY FUNCTIONS ---
async function loadInitialData() {
    if (localStorage.getItem('auditProjects')) {
        projects = JSON.parse(localStorage.getItem('auditProjects'));
        clients = JSON.parse(localStorage.getItem('auditClients'));
        tasks = JSON.parse(localStorage.getItem('auditTasks'));
        controlPoints = JSON.parse(localStorage.getItem('auditControlPoints')) || [];
        console.log('Dados carregados do localStorage.');
        return;
    }

    try {
        const response = await fetch('dados.json');
        if (!response.ok) {
            throw new Error(`Erro ao carregar o arquivo de backup: ${response.statusText}`);
        }
        const data = await response.json();
        
        projects = data.projects || [];
        clients = data.clients || [];
        tasks = data.tasks || [];
        controlPoints = data.controlPoints || [];

        console.log('Backup inicial carregado com sucesso!');
        saveData();
    } catch (error) {
        console.error("Não foi possível carregar os dados iniciais do arquivo JSON:", error);
    }
}

function saveData() {
    localStorage.setItem('auditProjects', JSON.stringify(projects));
    localStorage.setItem('auditClients', JSON.stringify(clients));
    localStorage.setItem('auditTasks', JSON.stringify(tasks));
    localStorage.setItem('auditControlPoints', JSON.stringify(controlPoints));
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function formatDate(date) {
    if (!date) return 'N/A';
    const correctDate = new Date(date);
    correctDate.setMinutes(correctDate.getMinutes() + correctDate.getTimezoneOffset());
    return correctDate.toLocaleDateString('pt-BR');
}
function formatHours(hours) { 
    return parseFloat(hours || 0).toFixed(2) + 'h'; 
}

// --- FUNÇÕES PARA POPULAR SELECTS ---
function populateProjectSelect(selectId, includeAll = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(new Option(includeAll ? 'Todos os Projetos' : 'Selecione um Projeto', ''));
    projects.sort((a,b) => b.year - a.year || a.name.localeCompare(b.name)).forEach(project => select.appendChild(new Option(`${project.name} - ${project.year}`, project.id)));
}
function populateClientSelect(selectId, projectId = null, includeAll = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(new Option(includeAll ? 'Todos os Clientes' : 'Selecione um Cliente', ''));
    let filteredClients = projectId ? clients.filter(c => c.projectId === projectId) : [];
    filteredClients.forEach(client => select.appendChild(new Option(client.name, client.id)));
}

// ========= FUNÇÃO MODIFICADA =========
function populateTaskSelect(selectId, projectId = null, clientIds = null, options = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(new Option('Selecione (Opcional)', ''));
    
    if (!projectId) return;

    let filteredTasks = tasks.filter(t => t.projectId === projectId && !t.parentId);

    if (clientIds && clientIds.length > 0) {
        filteredTasks = filteredTasks.filter(t => clientIds.includes(t.clientId));
    }

    filteredTasks.sort((a,b) => a.name.localeCompare(b.name));

    // Lógica para mostrar tarefas únicas por nome, se a opção for passada
    if (options.uniqueByName) {
        const uniqueTasks = [];
        const seenTaskNames = new Set();
        for (const task of filteredTasks) {
            if (!seenTaskNames.has(task.name)) {
                seenTaskNames.add(task.name);
                uniqueTasks.push(task); // Adiciona a primeira tarefa encontrada com este nome
            }
        }
        // Itera sobre a lista de tarefas únicas
        uniqueTasks.forEach(task => {
            select.appendChild(new Option(task.name, task.id)); // Mostra apenas o nome da tarefa
        });
    } else {
        // Comportamento padrão: mostra todas as tarefas com o nome do cliente
        filteredTasks.forEach(task => {
            const clientName = task.clientId ? clients.find(c => c.id === task.clientId)?.name : "Geral";
            select.appendChild(new Option(`${task.name} (${clientName})`, task.id));
        });
    }
}
// ===================================


function populateYearSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(new Option('Todos os Anos', ''));
    const years = [...new Set(projects.map(p => p.year))].sort((a, b) => b - a);
    years.forEach(year => select.appendChild(new Option(year, year)));
}
function populateResponsibleSelect(selectId, sourceTasks = tasks) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    select.appendChild(new Option('Todos os Responsáveis', ''));
    const responsibles = [...new Set(sourceTasks.flatMap(t => Array.isArray(t.assignee) ? t.assignee : [t.assignee]).filter(Boolean))].sort();
    responsibles.forEach(responsible => select.appendChild(new Option(responsible, responsible)));
    if (responsibles.includes(currentValue)) select.value = currentValue;
}
function populateTaskNameSelect(selectId, sourceTasks = tasks) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    select.appendChild(new Option('Todas as Atividades', ''));
    const taskNames = [...new Set(sourceTasks.filter(t => !t.parentId).map(t => t.name).filter(Boolean))].sort();
    taskNames.forEach(name => select.appendChild(new Option(name, name)));
    if (taskNames.includes(currentValue)) select.value = currentValue;
}

function populateClientCheckboxList(containerId, projectId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const filteredClients = projectId ? clients.filter(c => c.projectId === projectId) : [];

    if (filteredClients.length === 0) {
        container.innerHTML = '<small>Nenhum cliente encontrado para este projeto.</small>';
        return;
    }

    filteredClients.forEach(client => {
        const item = document.createElement('label');
        item.className = 'checkbox-item';
        item.innerHTML = `
            <input type="checkbox" name="controlClient" value="${client.id}">
            ${client.name}
        `;
        container.appendChild(item);
    });
}

// --- UI TOGGLE & MODAL FUNCTIONS ---
function toggleTaskDetails(taskId) {
    const taskCard = document.getElementById(`task-card-${taskId}`);
    if (!taskCard) return;
    const subtaskContainer = document.getElementById(`subtasks-${taskId}`);
    taskCard.classList.toggle('is-expanded');
    if (subtaskContainer) subtaskContainer.classList.toggle('hidden');
}

function handleControlProjectChange() {
    const projectId = document.getElementById('controlProject').value;
    populateClientCheckboxList('controlClientList', projectId);
    populateTaskSelect('controlTask', projectId, null, { uniqueByName: true }); // MODIFICADO AQUI
}

function openControlPointModal() {
    const form = document.getElementById('controlPointForm');
    form.reset();
    document.getElementById('controlPointId').value = '';
    document.getElementById('controlPointModalTitle').textContent = 'Novo Ponto de Controle';
    populateProjectSelect('controlProject');
    document.getElementById('controlClientList').innerHTML = '<small>Selecione um projeto para ver os clientes.</small>';
    const taskSelect = document.getElementById('controlTask');
    taskSelect.innerHTML = '<option value="">Selecione (Opcional)</option>';

    document.getElementById('controlProject').onchange = handleControlProjectChange;

    document.getElementById('controlPointModal').style.display = 'block';
}

function openProjectModal() { document.getElementById('projectForm').reset(); document.getElementById('projectModal').style.display = 'block'; }
function openClientModal() { document.getElementById('clientForm').reset(); populateProjectSelect('clientProject'); document.getElementById('clientModal').style.display = 'block'; }
function openTaskModal() { 
    document.getElementById('taskForm').reset(); 
    document.getElementById('taskRisksContainer').innerHTML = '';
    populateProjectSelect('taskProject'); 
    populateClientSelect('taskClient'); 
    populateTaskSelect('taskParent', document.getElementById('taskProject').value, null); 
    document.getElementById('taskModal').style.display = 'block'; 
}

// O restante do arquivo permanece idêntico
// --- NAVIGATION & UI RENDERING ---
function showSection(sectionId) {
    document.querySelectorAll('.nav-tab, .content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    const tab = document.querySelector(`.nav-tab[data-section="${sectionId}"]`);
    if (tab) tab.classList.add('active');
    const contentArea = document.getElementById(sectionId);
    if(contentArea) contentArea.innerHTML = '';
    
    switch(sectionId) {
        case 'dashboard': renderDashboard(contentArea); break;
        case 'projects': renderProjects(contentArea); break;
        case 'clients': renderClients(contentArea); break;
        case 'tasks': renderTasksUI(contentArea); break;
        case 'controls': renderControls(contentArea); break;
        case 'reports': renderReports(contentArea); break;
        case 'config': renderConfig(contentArea); break;
    }
}

// --- RENDER FUNCTIONS ---
function renderDashboard(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Dashboard Gerencial</h2></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number" id="totalProjects">0</div><div class="stat-label">Projetos Ativos</div></div>
            <div class="stat-card"><div class="stat-number" id="totalClients">0</div><div class="stat-label">Clientes</div></div>
            <div class="stat-card"><div class="stat-number" id="totalHoursBudgeted">0</div><div class="stat-label">Horas Orçadas</div></div>
            <div class="stat-card"><div class="stat-number" id="totalHoursActual">0</div><div class="stat-label">Horas Realizadas</div></div>
        </div>
        <div class="card"><h3>Projetos em Andamento</h3><div id="activeProjectsList"></div></div>
        <div class="card"><h3>Análise de Produtividade</h3><div id="productivityAnalysis"></div></div>`;
    updateDashboard();
}

function renderProjects(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Gerenciamento de Projetos</h2><button class="btn btn-primary" data-action="open-project-modal">Novo Projeto</button></div>
        <div id="projectsList"></div>`;
    const projectsList = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        projectsList.innerHTML = '<p>Nenhum projeto encontrado. Clique em "Novo Projeto" para começar.</p>';
        return;
    }
    
    projects.sort((a,b) => b.year - a.year || a.name.localeCompare(b.name)).forEach(project => {
        const budgetedHours = getProjectBudgetedHours(project.id);
        const actualHours = calculateProjectActualHours(project.id);
        const plannedHours = calculateProjectPlannedHours(project.id);
        
        const plannedBalanceHours = budgetedHours - plannedHours;
        const executionBalanceHours = budgetedHours - actualHours;
        const pendingHours = plannedHours - actualHours;

        const plannedBalanceClass = plannedBalanceHours >= 0 ? 'saldo-positive' : 'saldo-negative';
        const executionBalanceClass = executionBalanceHours >= 0 ? 'saldo-positive' : 'saldo-negative';
        const pendingClass = pendingHours >= 0 ? 'saldo-positive' : 'saldo-negative';

        const progress = budgetedHours > 0 ? (actualHours / budgetedHours) * 100 : 0;
        const status = getProjectStatus(project, actualHours);
        const nextYear = parseInt(project.year) + 1;
        
        const projectCard = document.createElement('div');
        projectCard.className = 'card project-card';
        projectCard.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${project.name} - ${project.year}</h3>
                <span class="status-badge status-${status}">${getStatusLabel(status)}</span>
            </div>
            <div class="project-summary">
                <div class="project-info">
                    <p><strong>Tipo:</strong> ${project.type === 'individual' ? 'Cliente Individual' : 'Grupo de Clientes'}</p>
                    <p><strong>Período:</strong> ${formatDate(project.startDate)} a ${formatDate(project.endDate)}</p>
                    <div class="progress-bar" style="margin-top:10px;"><div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div></div>
                </div>
                <div class="hours-breakdown">
                    <div class="hour-item"><span class="hour-item-label">Orçado</span><strong>${formatHours(budgetedHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Planejado</span><strong>${formatHours(plannedHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Realizado</span><strong>${formatHours(actualHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Saldo Planej.</span><strong class="${plannedBalanceClass}">${formatHours(plannedBalanceHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Saldo Exec.</span><strong class="${executionBalanceClass}">${formatHours(executionBalanceHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Pendente</span><strong class="${pendingClass}">${formatHours(pendingHours)}</strong></div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-info btn-sm" data-action="replicate-project" data-id="${project.id}">Replicar ${nextYear}</button>
                <button class="btn btn-warning btn-sm" data-action="edit-project" data-id="${project.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-action="delete-project" data-id="${project.id}">Excluir</button>
            </div>`;
        projectsList.appendChild(projectCard);
    });
}

function renderClients(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Gerenciamento de Clientes</h2><button class="btn btn-primary" data-action="open-client-modal">Novo Cliente</button></div>
        <div id="clientsList"></div>`;
    const clientsList = document.getElementById('clientsList');
    
    if (clients.length === 0) {
        clientsList.innerHTML = '<p>Nenhum cliente encontrado. Clique em "Novo Cliente" para começar.</p>';
        return;
    }
    
    clients.forEach(client => {
        const project = projects.find(p => p.id === client.projectId);
        const budgetedHours = client.budgetedHours || 0;
        const actualHours = calculateClientActualHours(client.id);
        const plannedHours = calculateClientPlannedHours(client.id);

        const plannedBalanceHours = budgetedHours - plannedHours;
        const executionBalanceHours = budgetedHours - actualHours;
        const pendingHours = plannedHours - actualHours;

        const plannedBalanceClass = plannedBalanceHours >= 0 ? 'saldo-positive' : 'saldo-negative';
        const executionBalanceClass = executionBalanceHours >= 0 ? 'saldo-positive' : 'saldo-negative';
        const pendingClass = pendingHours >= 0 ? 'saldo-positive' : 'saldo-negative';
        
        const progress = budgetedHours > 0 ? (actualHours / budgetedHours) * 100 : 0;

        const clientCard = document.createElement('div');
        clientCard.className = 'card client-card';
        clientCard.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${client.name}</h3>
                <span class="client-doc">${client.document}</span>
            </div>
            <div class="client-summary">
                <div class="client-info">
                    <p><strong>Projeto:</strong> ${project ? `${project.name} - ${project.year}` : 'N/A'}</p>
                    <p><strong>Responsável:</strong> ${client.responsible || 'Não definido'}</p>
                    <div class="progress-bar" style="margin-top:10px;"><div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div></div>
                </div>
                <div class="hours-breakdown">
                    <div class="hour-item"><span class="hour-item-label">Orçado</span><strong>${formatHours(budgetedHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Planejado</span><strong>${formatHours(plannedHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Realizado</span><strong>${formatHours(actualHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Saldo Planej.</span><strong class="${plannedBalanceClass}">${formatHours(plannedBalanceHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Saldo Exec.</span><strong class="${executionBalanceClass}">${formatHours(executionBalanceHours)}</strong></div>
                    <div class="hour-item"><span class="hour-item-label">Pendente</span><strong class="${pendingClass}">${formatHours(pendingHours)}</strong></div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-warning btn-sm" data-action="edit-client" data-id="${client.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-action="delete-client" data-id="${client.id}">Excluir</button>
            </div>`;
        clientsList.appendChild(clientCard);
    });
}

function renderTasksUI(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Gerenciamento de Tarefas</h2><button class="btn btn-primary" data-action="open-task-modal">Nova Tarefa</button></div>
        <div class="form-grid">
            <div class="form-group"><label>Filtrar por Projeto:</label><select class="form-control" id="taskProjectFilter"></select></div>
            <div class="form-group"><label>Filtrar por Cliente:</label><select class="form-control" id="taskClientFilter"></select></div>
            <div class="form-group"><label>Filtrar por Atividade:</label><select class="form-control" id="taskNameFilter"></select></div>
            <div class="form-group">
                <label>Ordenar por:</label>
                <select class="form-control" id="taskSortOrder">
                    <option value="dueDateAsc">Vencimento (mais próximo)</option>
                    <option value="dueDateDesc">Vencimento (mais distante)</option>
                    <option value="nameAsc">Nome da Tarefa (A-Z)</option>
                    <option value="nameDesc">Nome da Tarefa (Z-A)</option>
                </select>
            </div>
        </div>
        <div id="tasksList"></div>`;
    
    populateProjectSelect('taskProjectFilter', true);
    populateClientSelect('taskClientFilter', null, true);
    populateTaskNameSelect('taskNameFilter', tasks);
    
    const projectFilter = document.getElementById('taskProjectFilter');
    const clientFilter = document.getElementById('taskClientFilter');
    const nameFilter = document.getElementById('taskNameFilter');
    const sortOrder = document.getElementById('taskSortOrder');
    
    projectFilter.addEventListener('change', () => {
        const projectId = projectFilter.value;
        populateClientSelect('taskClientFilter', projectId, true);
        const tasksForProject = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
        populateTaskNameSelect('taskNameFilter', tasksForProject);
        displayFilteredTasks(); 
    });
    
    clientFilter.addEventListener('change', () => {
        const projectId = projectFilter.value;
        const clientId = clientFilter.value;
        let tasksForClient = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
        if (clientId) {
            tasksForClient = tasksForClient.filter(t => t.clientId === clientId);
        }
        populateTaskNameSelect('taskNameFilter', tasksForClient);
        displayFilteredTasks();
    });

    nameFilter.addEventListener('change', displayFilteredTasks);
    sortOrder.addEventListener('change', displayFilteredTasks);

    displayFilteredTasks();
}

function displayFilteredTasks() {
    const projectFilterValue = document.getElementById('taskProjectFilter')?.value;
    const clientFilterValue = document.getElementById('taskClientFilter')?.value;
    const nameFilterValue = document.getElementById('taskNameFilter')?.value;
    const sortOrderValue = document.getElementById('taskSortOrder')?.value;
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    tasksList.innerHTML = '';
    
    let filteredTasks = tasks;
    if (projectFilterValue) filteredTasks = filteredTasks.filter(t => t.projectId === projectFilterValue);
    if (clientFilterValue) filteredTasks = filteredTasks.filter(t => t.clientId === clientFilterValue);
    if (nameFilterValue) filteredTasks = filteredTasks.filter(t => t.name === nameFilterValue);
    
    let mainTasks = filteredTasks.filter(t => !t.parentId);

    switch (sortOrderValue) {
        case 'nameAsc': mainTasks.sort((a, b) => a.name.localeCompare(b.name)); break;
        case 'nameDesc': mainTasks.sort((a, b) => b.name.localeCompare(a.name)); break;
        case 'dueDateDesc': mainTasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)); break;
        case 'dueDateAsc': default: mainTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); break;
    }

    if (mainTasks.length === 0) {
        tasksList.innerHTML = '<p>Nenhuma tarefa encontrada com os filtros aplicados.</p>';
    }

    mainTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        tasksList.appendChild(taskCard);
        
        const subtasks = tasks.filter(sub => sub.parentId === task.id).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (subtasks.length > 0) {
            const subtaskContainer = document.createElement('div');
            subtaskContainer.className = 'task-hierarchy hidden';
            subtaskContainer.id = `subtasks-${task.id}`;
            subtasks.forEach(sub => subtaskContainer.appendChild(createTaskCard(sub, true)));
            taskCard.appendChild(subtaskContainer);
        }
    });
}

function renderControls(container) {
    container.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Pontos de Controle e Achados de Auditoria</h2>
            <div>
                <button class="btn btn-info" id="generateControlReportBtn">Gerar Relatório de Controles</button>
                <button class="btn btn-primary" data-action="open-control-point-modal">Novo Ponto de Controle</button>
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group"><label>Filtrar por Projeto:</label><select class="form-control" id="controlFilterProject"></select></div>
            <div class="form-group"><label>Filtrar por Tipo:</label><select class="form-control" id="controlFilterType">
                <option value="">Todos os Tipos</option>
                <option value="cci">CCI (Deficiência)</option>
                <option value="ressalva">Ressalva</option>
                <option value="enfase">Ênfase</option>
            </select></div>
            <div class="form-group"><label>Filtrar por Fase:</label><select class="form-control" id="controlFilterPhase">
                <option value="">Todas as Fases</option>
                <option value="preliminar">Preliminar</option>
                <option value="final">Final</option>
                <option value="operacional">Operacional</option>
            </select></div>
            <div class="form-group"><label>Buscar por Título/Síntese:</label><input type="text" class="form-control" id="controlFilterSearch" placeholder="Digite para buscar..."></div>
        </div>
        <div id="controlPointsList"></div>
        <div id="controlReportContainer" class="report-container" style="margin-top: 20px;"></div>
    `;

    populateProjectSelect('controlFilterProject', true);

    document.getElementById('controlFilterProject').addEventListener('change', displayFilteredControlPoints);
    document.getElementById('controlFilterType').addEventListener('change', displayFilteredControlPoints);
    document.getElementById('controlFilterPhase').addEventListener('change', displayFilteredControlPoints);
    document.getElementById('controlFilterSearch').addEventListener('input', displayFilteredControlPoints);
    document.getElementById('generateControlReportBtn').addEventListener('click', generateControlPointsReport);

    displayFilteredControlPoints();
}

function displayFilteredControlPoints() {
    const listContainer = document.getElementById('controlPointsList');
    if (!listContainer) return;

    const projectId = document.getElementById('controlFilterProject').value;
    const type = document.getElementById('controlFilterType').value;
    const phase = document.getElementById('controlFilterPhase').value;
    const searchTerm = document.getElementById('controlFilterSearch').value.toLowerCase();

    let filtered = controlPoints;

    if (projectId) filtered = filtered.filter(cp => cp.projectId === projectId);
    if (type) filtered = filtered.filter(cp => cp.type === type);
    if (phase) filtered = filtered.filter(cp => cp.phase === phase);
    if (searchTerm) {
        filtered = filtered.filter(cp => 
            cp.title.toLowerCase().includes(searchTerm) || 
            cp.synthesis.toLowerCase().includes(searchTerm)
        );
    }

    listContainer.innerHTML = '';
    if (filtered.length === 0) {
        listContainer.innerHTML = '<p>Nenhum ponto de controle encontrado com os filtros aplicados.</p>';
        return;
    }

    const typeLabels = { 'cci': 'CCI (Deficiência)', 'ressalva': 'Ressalva', 'enfase': 'Ênfase' };
    const phaseLabels = { 'preliminar': 'Preliminar', 'final': 'Final', 'operacional': 'Operacional' };

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(cp => {
        const task = tasks.find(t => t.id === cp.taskId);
        
        const clientIds = Array.isArray(cp.clientIds) ? cp.clientIds : (cp.clientId ? [cp.clientId] : []);
        const associatedClients = clientIds.length > 0
            ? clientIds.map(id => clients.find(c => c.id === id)?.name || 'N/A').join(', ')
            : 'Geral (sem cliente específico)';

        const card = document.createElement('div');
        card.className = `card control-point-card type-${cp.type}`;
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cp.title}</h3>
                <div>
                    <span class="phase-badge">${phaseLabels[cp.phase] || 'N/D'}</span>
                    <span class="status-badge status-${cp.type}">${typeLabels[cp.type]}</span>
                </div>
            </div>
            <div class="card-details">
                <p><strong>Cliente(s):</strong> ${associatedClients}</p>
                <p><strong>Síntese:</strong> ${cp.synthesis}</p>
            </div>
            <div class="control-card-details-full">
                <p><strong>Tarefa Associada:</strong> ${task ? task.name : 'Nenhuma'}</p>
                <p><strong>Recomendação:</strong> ${cp.recommendation || 'N/A'}</p>
                <p><strong>Base Normativa:</strong> ${cp.legislation || 'N/A'}</p>
            </div>
            <div class="card-actions" style="display:none;">
                <button class="btn btn-info btn-sm" data-action="replicate-control-point" data-id="${cp.id}">Replicar</button>
                <button class="btn btn-warning btn-sm" data-action="edit-control-point" data-id="${cp.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-action="delete-control-point" data-id="${cp.id}">Excluir</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}


function renderReports(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Relatórios Gerenciais</h2></div>
        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="form-group"><label>Ano:</label><select class="form-control" id="reportYearSelect"></select></div>
            <div class="form-group"><label>Projeto:</label><select class="form-control" id="reportProjectSelect"></select></div>
            <div class="form-group"><label>Cliente:</label><select class="form-control" id="reportClientSelect"></select></div>
            <div class="form-group"><label>Responsável:</label><select class="form-control" id="reportResponsibleSelect"></select></div>
            <div class="form-group">
                <label>Status da Tarefa:</label>
                <select class="form-control" id="reportStatusSelect">
                    <option value="">Todos os Status</option>
                    <option value="completed">Apenas Concluídas</option>
                    <option value="pending">Apenas Pendentes</option>
                    <option value="hasHours">Com Horas Lançadas</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ordenar Tarefas por:</label>
                <select class="form-control" id="reportSortSelect">
                    <option value="default">Padrão</option>
                    <option value="client">Cliente / Tarefa</option>
                    <option value="task">Tarefa / Cliente</option>
                    <option value="dueDate">Data de Vencimento</option>
                    <option value="actualHoursDesc">Horas Executadas (Maior)</option>
                    <option value="actualHoursAsc">Horas Executadas (Menor)</option>
                </select>
            </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
            <button class="btn btn-success" data-action="generate-report">Gerar Relatório</button>
            <button class="btn btn-info" data-action="export-report-excel">Exportar para Excel</button>
            <button class="btn btn-primary" data-action="export-report-pdf">Exportar para PDF</button>
            <button class="btn" data-action="print-report" style="background-color: #7f8c8d; color: white;">Imprimir</button>
        </div>
        <div id="reportResults" style="margin-top: 20px;"></div>`;
    setupReports();
}

function renderConfig(container) {
    container.innerHTML = `
        <div class="section-header"><h2 class="section-title">Configurações e Backup</h2></div>
        <div class="card">
            <h3>Exportar Dados</h3>
            <p>Salve todos os seus projetos, clientes, tarefas e pontos de controle em um arquivo de backup.</p>
            <button class="btn btn-primary" data-action="export-data">Exportar para Arquivo</button>
        </div>
        <div class="card">
            <h3>Importar Dados</h3>
            <p>Carregue um arquivo de backup para restaurar seus dados. <strong>Atenção:</strong> Isso substituirá todos os dados existentes.</p>
            <input type="file" id="importFile" style="display: none;" accept=".json">
            <button class="btn btn-warning" data-action="import-data">Importar de Arquivo</button>
        </div>`;
}

// --- CORE LOGIC & HELPER FUNCTIONS ---
function getStatusLabel(status) { return {'planning': 'Planejamento', 'progress': 'Em Andamento', 'completed': 'Concluído', 'overdue': 'Atrasado'}[status] || status; }
function getTaskStatusLabel(status) { return {'pending': 'Pendente', 'progress': 'Em Andamento', 'review': 'Em Revisão', 'completed': 'Concluído'}[status] || status; }
function getPhaseLabel(phase) { return {'preliminar': 'Trabalho Preliminar', 'final': 'Trabalho Final'}[phase] || 'Não definida'; }
function getPriorityLabel(priority) { return {'low': 'Baixa', 'medium': 'Média', 'high': 'Alta', 'urgent': 'Urgente'}[priority] || priority; }
function getRiskLabel(risk) { return {'low': 'Baixo', 'medium': 'Médio', 'high': 'Alto'}[risk] || 'N/D'; }
function calculateProjectActualHours(projectId) { return tasks.filter(t => t.projectId === projectId).reduce((sum, task) => sum + (task.actualHours || 0), 0); }
function calculateClientActualHours(clientId) { return tasks.filter(t => t.clientId === clientId).reduce((sum, task) => sum + (task.actualHours || 0), 0); }
function calculateProjectPlannedHours(projectId) {
    return tasks.filter(t => t.projectId === projectId && !t.parentId)
                .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
}
function calculateClientPlannedHours(clientId) {
    return tasks.filter(t => t.clientId === clientId && !t.parentId)
                .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
}
function getProjectStatus(project, actualHours) {
    if (project.status === 'completed') return 'completed';
    if (new Date() > new Date(project.endDate) && project.status !== 'completed') return 'overdue';
    if (actualHours > 0) return 'progress';
    return 'planning';
}
function getProjectBudgetedHours(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 0;
    return project.type === 'group' ? clients.filter(c => c.projectId === projectId).reduce((sum, c) => sum + (c.budgetedHours || 0), 0) : project.budgetedHours;
}

function updateDashboard() {
    const activeProjects = projects.filter(p => p.status !== 'completed');
    document.getElementById('totalProjects').textContent = activeProjects.length;
    document.getElementById('totalClients').textContent = clients.length;
    const totalBudgeted = projects.reduce((sum, p) => sum + getProjectBudgetedHours(p.id), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    document.getElementById('totalHoursBudgeted').textContent = Math.round(totalBudgeted);
    document.getElementById('totalHoursActual').textContent = Math.round(totalActual);
    
    const activeProjectsList = document.getElementById('activeProjectsList');
    if (activeProjectsList) {
        activeProjectsList.innerHTML = activeProjects.length === 0 ? '<p>Nenhum projeto ativo.</p>' : '';
        activeProjects.slice(0, 5).forEach(p => {
            const actual = calculateProjectActualHours(p.id);
            const budgeted = getProjectBudgetedHours(p.id);
            const progress = budgeted > 0 ? (actual / budgeted) * 100 : 0;
            const div = document.createElement('div');
            div.innerHTML = `<div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #3498db; background: #f8f9fa;"><strong>${p.name} - ${p.year}</strong> - ${formatHours(actual)} / ${formatHours(budgeted)}<div class="progress-bar" style="margin-top: 5px;"><div class="progress-fill" style="width: ${progress}%"></div></div></div>`;
            activeProjectsList.appendChild(div);
        });
    }

    const productivityAnalysis = document.getElementById('productivityAnalysis');
    if (productivityAnalysis) {
        const completionRate = tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0;
        const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
        productivityAnalysis.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-number">${completionRate.toFixed(1)}%</div><div class="stat-label">Taxa de Conclusão</div></div><div class="stat-card"><div class="stat-number">${overdueTasks}</div><div class="stat-label">Tarefas Atrasadas</div></div></div>`;
    }
}
        
function createTaskCard(task, isSubtask = false) {
    const project = projects.find(p => p.id === task.projectId);
    const client = clients.find(c => c.id === task.clientId);
    let totalActualHours = task.actualHours || 0;
    const subtasksOfThisTask = tasks.filter(t => t.parentId === task.id);
    const subtasksCount = subtasksOfThisTask.length;

    if (!isSubtask) {
        totalActualHours += subtasksOfThisTask.reduce((sum, sub) => sum + (sub.actualHours || 0), 0);
    }
    const progress = task.estimatedHours > 0 ? (totalActualHours / task.estimatedHours) * 100 : 0;
    
    let riskBadges = '';
    if (task.risks && task.risks.length > 0) {
        const riskOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        const sortedRisks = [...task.risks].sort((a, b) => riskOrder[a.level] - riskOrder[b.level]);
        riskBadges = sortedRisks.map(risk => `<span class="risk-badge risk-${risk.level}" title="${risk.description}">${getRiskLabel(risk.level)}</span>`).join('');
    }

    let riskDetails = '';
    if (task.risks && task.risks.length > 0) {
        riskDetails = `<div style="grid-column: 1 / -1;"><strong>Riscos Associados:</strong><ul>${task.risks.map(r => `<li><span class="risk-badge risk-${r.level}">${getRiskLabel(r.level)}</span> ${r.description}</li>`).join('')}</ul></div>`;
    }

    const isMultiAssignee = Array.isArray(task.assignee) && task.assignee.length > 1;
    const assigneeLabel = isMultiAssignee ? 'Responsáveis' : 'Responsável';
    const assigneeText = Array.isArray(task.assignee) ? task.assignee.join(', ') : (task.assignee || '');

    const taskCard = document.createElement('div');
    taskCard.id = `task-card-${task.id}`;
    taskCard.className = `card task-card priority-${task.priority} ${isSubtask ? 'subtask-item' : 'task-item'}`;
    taskCard.innerHTML = `
        <div class="task-card-summary">
            <div class="task-card-summary-info">
                <p><strong>${task.name} ${riskBadges} ${subtasksCount > 0 ? `<span class="subtask-indicator">(${subtasksCount} subtarefas)</span>` : ''}</strong></p>
                <p>${project ? project.name : 'N/A'} > ${client ? client.name : 'Geral'}</p>
                <p><small>${getPriorityLabel(task.priority)} | ${getTaskStatusLabel(task.status)}</small></p>
            </div>
            <div class="task-card-summary-hours">
                <span>${formatHours(totalActualHours)} / ${formatHours(task.estimatedHours)}</span>
                <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div></div>
            </div>
        </div>
        <div class="details-grid">
            <p><strong>${assigneeLabel}:</strong> ${assigneeText}</p><p><strong>Fase:</strong> ${getPhaseLabel(task.phase)}</p>
            <p><strong>Vencimento:</strong> ${formatDate(task.dueDate)}</p>
            <p><strong>Descrição:</strong> ${task.description || 'N/A'}</p>
            ${riskDetails}
        </div>
        <div class="task-actions">
            ${(task.risks && task.risks.length > 0) ? `<button class="btn btn-sm" data-action="open-replicate-risks" data-id="${task.id}" style="background-color:#9b59b6; color:white;">Replicar Riscos</button>` : ''}
            ${project?.type === 'group' && !isSubtask ? `<button class="btn btn-info btn-sm" data-action="replicate-task" data-id="${task.id}">Replicar Tarefa</button>` : ''}
            ${!isSubtask ? `<button class="btn btn-info btn-sm" data-action="add-subtask" data-id="${task.id}">+ Subtarefa</button>` : ''}
            ${isSubtask ? `<button class="btn btn-sm" data-action="replicate-subtask" data-id="${task.id}" style="background-color:#8e44ad; color:white;">Replicar</button>` : ''}
            <button class="btn btn-warning btn-sm" data-action="edit-task" data-id="${task.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-action="delete-task" data-id="${task.id}">Excluir</button>
        </div>`;
    return taskCard;
}

// --- MODAL & ACTION FUNCTIONS ---
function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }
function toggleBudgetedHours(type, elementId) {
    const input = document.getElementById(elementId);
    if (!input) return;
    input.disabled = type === 'group';
    if (type === 'group') input.value = 0;
}

function addRiskInput(containerId, risk = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'risk-item';
    div.innerHTML = `
        <select class="form-control risk-level-select">
            <option value="low" ${risk.level === 'low' ? 'selected' : ''}>Baixo</option>
            <option value="medium" ${risk.level === 'medium' ? 'selected' : ''}>Médio</option>
            <option value="high" ${risk.level === 'high' ? 'selected' : ''}>Alto</option>
        </select>
        <input type="text" class="form-control risk-desc-input" placeholder="Descrição do risco" value="${risk.description || ''}">
        <button type="button" class="btn btn-danger btn-sm" data-action="remove-risk">&times;</button>
    `;
    container.appendChild(div);
}


// --- FORM SUBMIT HANDLERS ---
function handleProjectFormSubmit(e) { e.preventDefault(); projects.push({ id: generateId(), name: document.getElementById('projectName').value, year: document.getElementById('projectYear').value, type: document.getElementById('projectType').value, budgetedHours: document.getElementById('projectType').value === 'group' ? 0 : parseFloat(document.getElementById('projectBudgetedHours').value), description: document.getElementById('projectDescription').value, startDate: document.getElementById('projectStartDate').value, endDate: document.getElementById('projectEndDate').value, status: 'planning', createdAt: new Date().toISOString() }); saveData(); closeModal('projectModal'); showSection('projects'); }
function handleClientFormSubmit(e) { e.preventDefault(); clients.push({ id: generateId(), name: document.getElementById('clientName').value, document: document.getElementById('clientDocument').value, projectId: document.getElementById('clientProject').value, budgetedHours: parseFloat(document.getElementById('clientBudgetedHours').value), responsible: document.getElementById('clientResponsible').value, createdAt: new Date().toISOString() }); saveData(); closeModal('clientModal'); showSection('clients'); }
function handleTaskFormSubmit(e) { 
    e.preventDefault(); 
    const riskItems = [];
    document.querySelectorAll('#taskRisksContainer .risk-item').forEach(item => {
        const level = item.querySelector('.risk-level-select').value;
        const description = item.querySelector('.risk-desc-input').value.trim();
        if (description) riskItems.push({ level, description });
    });

    const assigneesInput = document.getElementById('taskAssignee').value;
    const assignees = assigneesInput.split(',').map(name => name.trim()).filter(name => name);

    tasks.push({ 
        id: generateId(), 
        name: document.getElementById('taskName').value, 
        description: document.getElementById('taskDescription').value, 
        projectId: document.getElementById('taskProject').value, 
        clientId: document.getElementById('taskClient').value || null, 
        parentId: document.getElementById('taskParent').value || null, 
        estimatedHours: parseFloat(document.getElementById('taskEstimatedHours').value), 
        phase: document.getElementById('taskPhase').value, 
        actualHours: 0, 
        dueDate: document.getElementById('taskDueDate').value, 
        priority: document.getElementById('taskPriority').value, 
        assignee: assignees,
        status: 'pending', 
        risks: riskItems,
        createdAt: new Date().toISOString() 
    }); 
    saveData(); 
    closeModal('taskModal'); 
    displayFilteredTasks(); 
}

function handleControlPointFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('controlPointId').value;
    
    const selectedClientNodes = document.querySelectorAll('input[name="controlClient"]:checked');
    const clientIds = Array.from(selectedClientNodes).map(node => node.value);

    const projectId = document.getElementById('controlProject').value;
    const project = projects.find(p => p.id === projectId);

    if (project && project.type === 'group' && clientIds.length === 0) {
        alert('Para projetos do tipo "Grupo de Clientes", por favor, selecione pelo menos um cliente.');
        return;
    }

    const controlData = {
        projectId: projectId,
        clientIds: clientIds,
        taskId: document.getElementById('controlTask').value,
        title: document.getElementById('controlTitle').value,
        type: document.getElementById('controlType').value,
        phase: document.getElementById('controlPhase').value,
        synthesis: document.getElementById('controlSynthesis').value,
        recommendation: document.getElementById('controlRecommendation').value,
        legislation: document.getElementById('controlLegislation').value,
    };

    if (id) {
        const index = controlPoints.findIndex(cp => cp.id === id);
        if (index > -1) {
            delete controlPoints[index].clientId; 
            controlPoints[index] = { ...controlPoints[index], ...controlData, updatedAt: new Date().toISOString() };
        }
    } else {
        controlData.id = generateId();
        controlData.createdAt = new Date().toISOString();
        controlPoints.push(controlData);
    }
    saveData();
    closeModal('controlPointModal');
    showSection('controls');
}

function handleEditProjectFormSubmit(e) { e.preventDefault(); const pId = document.getElementById('editProjectId').value; const pIndex = projects.findIndex(p => p.id === pId); if (pIndex === -1) return; Object.assign(projects[pIndex], { name: document.getElementById('editProjectName').value, year: document.getElementById('editProjectYear').value, type: document.getElementById('editProjectType').value, budgetedHours: parseFloat(document.getElementById('editProjectBudgetedHours').value), description: document.getElementById('editProjectDescription').value, startDate: document.getElementById('editProjectStartDate').value, endDate: document.getElementById('editProjectEndDate').value, status: document.getElementById('editProjectStatus').value, updatedAt: new Date().toISOString() }); saveData(); closeModal('editProjectModal'); showSection('projects'); }
function handleEditClientFormSubmit(e){ e.preventDefault(); const cId = document.getElementById('editClientId').value; const cIndex = clients.findIndex(c => c.id === cId); if (cIndex === -1) return; Object.assign(clients[cIndex], { name: document.getElementById('editClientName').value, document: document.getElementById('editClientDocument').value, projectId: document.getElementById('editClientProject').value, budgetedHours: parseFloat(document.getElementById('clientBudgetedHours').value), responsible: document.getElementById('editClientResponsible').value, updatedAt: new Date().toISOString() }); saveData(); closeModal('editClientModal'); showSection('clients'); }
function handleEditTaskFormSubmit(e) { 
    e.preventDefault(); 
    const tId = document.getElementById('editTaskId').value;
    const tIndex = tasks.findIndex(t => t.id === tId); 
    if (tIndex !== -1) { 
        const riskItems = [];
        document.querySelectorAll('#editTaskRisksContainer .risk-item').forEach(item => {
            const level = item.querySelector('.risk-level-select').value;
            const description = item.querySelector('.risk-desc-input').value.trim();
            if (description) riskItems.push({ level, description });
        });
        
        const assigneesInput = document.getElementById('editTaskAssignee').value;
        const assignees = assigneesInput.split(',').map(name => name.trim()).filter(name => name);

        Object.assign(tasks[tIndex], { 
            name: document.getElementById('editTaskName').value, 
            description: document.getElementById('editTaskDescription').value, 
            estimatedHours: parseFloat(document.getElementById('editTaskEstimatedHours').value), 
            actualHours: parseFloat(document.getElementById('editTaskActualHours').value || 0), 
            phase: document.getElementById('editTaskPhase').value, 
            dueDate: document.getElementById('editTaskDueDate').value, 
            priority: document.getElementById('editTaskPriority').value, 
            status: document.getElementById('editTaskStatus').value, 
            assignee: assignees,
            risks: riskItems,
            updatedAt: new Date().toISOString() 
        }); 
        
        delete tasks[tIndex].riskLevel;
        delete tasks[tIndex].riskDescription;

        const editedTask = tasks[tIndex];
        const idToExpand = editedTask.parentId ? editedTask.parentId : editedTask.id;

        saveData(); 
        closeModal('editTaskModal'); 
        alert('Tarefa atualizada!'); 
        
        displayFilteredTasks();
        
        setTimeout(() => {
            const taskCard = document.getElementById(`task-card-${idToExpand}`);
            const subtaskContainer = document.getElementById(`subtasks-${idToExpand}`);
            if (taskCard && !taskCard.classList.contains('is-expanded')) {
                taskCard.classList.add('is-expanded');
                if (subtaskContainer) {
                    subtaskContainer.classList.remove('hidden');
                }
            }
        }, 100);
    } 
}

function handleReplicateTaskFormSubmit(e) { e.preventDefault(); const originalTask = tasks.find(t => t.id === document.getElementById('originalTaskId').value); let count = 0; document.querySelectorAll('#replicateClientList input[type="checkbox"]:checked').forEach(cb => { tasks.push({ ...originalTask, id: generateId(), clientId: cb.dataset.clientId, estimatedHours: parseFloat(cb.closest('.client-item').querySelector('.hours-input').value), actualHours: 0, status: 'pending', parentId: null, createdAt: new Date().toISOString() }); count++; }); if (count > 0) { saveData(); displayFilteredTasks(); alert(`${count} tarefa(s) replicada(s)!`); } closeModal('replicateTaskModal'); }
function handleReplicateRisksFormSubmit(e) {
    e.preventDefault();
    const sourceTaskId = document.getElementById('sourceRiskTaskId').value;
    const sourceTask = tasks.find(t => t.id === sourceTaskId);
    if (!sourceTask) return;

    const risksToCopy = JSON.parse(JSON.stringify(sourceTask.risks || []));
    let count = 0;
    
    document.querySelectorAll('#targetTasksList input[type="checkbox"]:checked').forEach(checkbox => {
        const targetTaskId = checkbox.value;
        const targetTask = tasks.find(t => t.id === targetTaskId);
        if (targetTask) {
            targetTask.risks = JSON.parse(JSON.stringify(risksToCopy));
            count++;
        }
    });

    if (count > 0) {
        saveData();
        displayFilteredTasks();
        alert(`${count} tarefa(s) tiveram seus riscos atualizados.`);
    }
    closeModal('replicateRisksModal');
}
function handleReplicateSubtasksFormSubmit(e) {
    e.preventDefault();
    const sourceSubtaskId = document.getElementById('sourceSubtaskId').value;
    const subtaskToCopy = tasks.find(t => t.id === sourceSubtaskId);

    if (!subtaskToCopy) {
        alert('Nenhuma subtarefa encontrada para copiar.');
        closeModal('replicateSubtasksModal');
        return;
    }

    let count = 0;
    const checkedTargets = document.querySelectorAll('#targetSubtasksTasksList input[type="checkbox"]:checked');

    checkedTargets.forEach(checkbox => {
        const targetTaskId = checkbox.value;
        const targetTask = tasks.find(t => t.id === targetTaskId);
        if (targetTask) {
            const newSubtask = {
                ...subtaskToCopy,
                id: generateId(),
                parentId: targetTask.id,
                clientId: targetTask.clientId,
                status: 'pending',
                actualHours: 0,
                createdAt: new Date().toISOString()
            };
            delete newSubtask.updatedAt;
            tasks.push(newSubtask);
            count++;
        }
    });

    if (count > 0) {
        saveData();
        displayFilteredTasks();
        alert(`${count} subtarefa(s) foram replicadas com sucesso.`);
    }
    closeModal('replicateSubtasksModal');
}

function openReplicateControlPointModal(id) {
    const cp = controlPoints.find(p => p.id === id);
    if (!cp) return;

    const project = projects.find(p => p.id === cp.projectId);
    if (!project) return;

    document.getElementById('sourceControlPointId').value = id;
    document.getElementById('replicateControlPointName').textContent = cp.title;
    
    const nextYear = parseInt(project.year) + 1;
    const nextYearProject = projects.find(p => p.year == nextYear && p.name.startsWith(project.name.replace(`- ${project.year}`, '')));
    
    const optionsContainer = document.getElementById('replicationOptionsContainer');
    optionsContainer.innerHTML = '';
    
    let optionsHTML = '';
    const nextYearProjectExists = !!nextYearProject;

    if (cp.phase === 'preliminar') {
        optionsHTML += `<label class="radio-item"><input type="radio" name="replicationTarget" value="toFinal" checked> Replicar para a Fase Final (mesmo projeto)</label>`;
        optionsHTML += `<label class="radio-item" title="${!nextYearProjectExists ? `Projeto para ${nextYear} não encontrado.` : ''}"><input type="radio" name="replicationTarget" value="toNextYearPreliminar" ${!nextYearProjectExists ? 'disabled' : ''}> Replicar para Preliminar de ${nextYear}</label>`;
    } else if (cp.phase === 'final') {
        optionsHTML += `<label class="radio-item" title="${!nextYearProjectExists ? `Projeto para ${nextYear} não encontrado.` : ''}"><input type="radio" name="replicationTarget" value="toNextYearPreliminar" ${!nextYearProjectExists ? 'disabled' : ''} checked> Replicar para Preliminar de ${nextYear}</label>`;
        optionsHTML += `<label class="radio-item" title="${!nextYearProjectExists ? `Projeto para ${nextYear} não encontrado.` : ''}"><input type="radio" name="replicationTarget" value="toNextYearFinal" ${!nextYearProjectExists ? 'disabled' : ''}> Replicar para Final de ${nextYear}</label>`;
    } else if (cp.phase === 'operacional') {
        optionsHTML += `<label class="radio-item" title="${!nextYearProjectExists ? `Projeto para ${nextYear} não encontrado.` : ''}"><input type="radio" name="replicationTarget" value="toNextYearOperacional" ${!nextYearProjectExists ? 'disabled' : ''} checked> Replicar para Operacional de ${nextYear}</label>`;
    }

    if (!optionsHTML) {
        optionsHTML = '<p>Nenhuma opção de replicação disponível para este tipo de ponto.</p>';
    }

    optionsContainer.innerHTML = optionsHTML;
    document.getElementById('replicateControlPointModal').style.display = 'block';
}

function handleReplicateControlPointFormSubmit(e) {
    e.preventDefault();
    const sourceId = document.getElementById('sourceControlPointId').value;
    const replicationTarget = document.querySelector('input[name="replicationTarget"]:checked');

    if (!replicationTarget) {
        alert('Selecione uma opção para replicação.');
        return;
    }

    const sourceCp = controlPoints.find(cp => cp.id === sourceId);
    if (!sourceCp) return;

    const sourceClientIds = Array.isArray(sourceCp.clientIds) ? sourceCp.clientIds : (sourceCp.clientId ? [sourceCp.clientId] : []);

    let newCp = JSON.parse(JSON.stringify(sourceCp));
    newCp.id = generateId();
    newCp.createdAt = new Date().toISOString();
    delete newCp.updatedAt;
    delete newCp.clientId;

    let successMessage = '';

    if (replicationTarget.value === 'toFinal') {
        newCp.phase = 'final';
        controlPoints.push(newCp);
        successMessage = 'Ponto de controle replicado para a Fase Final.';
    } else {
        const sourceProject = projects.find(p => p.id === sourceCp.projectId);
        const nextYear = parseInt(sourceProject.year) + 1;
        const nextYearProject = projects.find(p => p.year == nextYear && p.name.startsWith(sourceProject.name.replace(`- ${sourceProject.year}`, '')));

        if (nextYearProject) {
            const sourceClientNames = sourceClientIds.map(id => clients.find(c => c.id === id)?.name);
            const nextYearClientIds = clients
                .filter(c => c.projectId === nextYearProject.id && sourceClientNames.includes(c.name))
                .map(c => c.id);

            newCp.projectId = nextYearProject.id;
            newCp.clientIds = nextYearClientIds;
            
            if (replicationTarget.value === 'toNextYearPreliminar') newCp.phase = 'preliminar';
            else if (replicationTarget.value === 'toNextYearFinal') newCp.phase = 'final';
            else if (replicationTarget.value === 'toNextYearOperacional') newCp.phase = 'operacional';
            
            controlPoints.push(newCp);
            successMessage = `Ponto de controle replicado para o projeto de ${nextYear}.`;
        } else {
            alert(`Erro: Projeto para ${nextYear} não foi encontrado.`);
            closeModal('replicateControlPointModal');
            return;
        }
    }

    saveData();
    closeModal('replicateControlPointModal');
    showSection('controls');
    alert(successMessage);
}

// --- EDIT & DELETE ---
function editProject(id) { const p = projects.find(p => p.id === id); if (!p) return; document.getElementById('editProjectId').value = p.id; document.getElementById('editProjectName').value = p.name; document.getElementById('editProjectYear').value = p.year; document.getElementById('editProjectDescription').value = p.description; document.getElementById('editProjectStartDate').value = p.startDate; document.getElementById('editProjectEndDate').value = p.endDate; document.getElementById('editProjectType').value = p.type; document.getElementById('editProjectBudgetedHours').value = p.budgetedHours; document.getElementById('editProjectStatus').value = p.status || 'planning'; toggleBudgetedHours(p.type, 'editProjectBudgetedHours'); document.getElementById('editProjectModal').style.display = 'block'; }
function editClient(id) { const c = clients.find(c => c.id === id); if (!c) return; populateProjectSelect('editClientProject'); document.getElementById('editClientId').value = c.id; document.getElementById('editClientName').value = c.name; document.getElementById('editClientDocument').value = c.document; document.getElementById('editClientProject').value = c.projectId; document.getElementById('editClientBudgetedHours').value = c.budgetedHours; document.getElementById('editClientResponsible').value = c.responsible || ''; document.getElementById('editClientModal').style.display = 'block'; }
function editTask(id) { 
    const t = tasks.find(t => t.id === id); 
    if (!t) return; 
    document.getElementById('editTaskId').value = t.id; 
    document.getElementById('editTaskName').value = t.name; 
    document.getElementById('editTaskDescription').value = t.description; 
    document.getElementById('editTaskEstimatedHours').value = t.estimatedHours; 
    document.getElementById('editTaskActualHours').value = t.actualHours || 0; 
    document.getElementById('editTaskPhase').value = t.phase || 'preliminar'; 
    document.getElementById('editTaskDueDate').value = t.dueDate; 
    document.getElementById('editTaskPriority').value = t.priority; 
    document.getElementById('editTaskStatus').value = t.status; 
    
    const assigneeValue = Array.isArray(t.assignee) ? t.assignee.join(', ') : (t.assignee || '');
    document.getElementById('editTaskAssignee').value = assigneeValue; 
    
    const riskContainer = document.getElementById('editTaskRisksContainer');
    riskContainer.innerHTML = '';
    if (t.risks && t.risks.length > 0) {
        t.risks.forEach(risk => addRiskInput('editTaskRisksContainer', risk));
    } else if (t.riskLevel) {
        addRiskInput('editTaskRisksContainer', { level: t.riskLevel, description: t.riskDescription });
    }

    document.getElementById('editTaskModal').style.display = 'block'; 
}

function editControlPoint(id) {
    const cp = controlPoints.find(p => p.id === id);
    if (!cp) return;

    openControlPointModal(); 
    document.getElementById('controlPointModalTitle').textContent = 'Editar Ponto de Controle';
    document.getElementById('controlPointId').value = cp.id;
    document.getElementById('controlTitle').value = cp.title;
    document.getElementById('controlType').value = cp.type;
    document.getElementById('controlPhase').value = cp.phase || 'preliminar';
    document.getElementById('controlSynthesis').value = cp.synthesis;
    document.getElementById('controlRecommendation').value = cp.recommendation;
    document.getElementById('controlLegislation').value = cp.legislation;

    const projectSelect = document.getElementById('controlProject');
    projectSelect.value = cp.projectId;
    
    populateClientCheckboxList('controlClientList', cp.projectId);

    const clientIdsToSelect = Array.isArray(cp.clientIds) ? cp.clientIds : (cp.clientId ? [cp.clientId] : []);
    document.querySelectorAll('input[name="controlClient"]').forEach(checkbox => {
        if (clientIdsToSelect.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });
    
    populateTaskSelect('controlTask', cp.projectId, null, { uniqueByName: true }); // MODIFICADO AQUI

    setTimeout(() => {
        document.getElementById('controlTask').value = cp.taskId || '';
    }, 50);
}

function deleteProject(id) { if (confirm('Excluir projeto e todos os clientes e tarefas?')) { projects = projects.filter(p => p.id !== id); clients = clients.filter(c => c.projectId !== id); tasks = tasks.filter(t => t.projectId !== id); controlPoints = controlPoints.filter(cp => cp.projectId !== id); saveData(); showSection('projects'); } }
function deleteClient(id) { if (confirm('Excluir cliente e suas tarefas?')) { const clientToDelete = clients.find(c=>c.id === id); clients = clients.filter(c => c.id !== id); tasks = tasks.filter(t => t.clientId !== id); controlPoints.forEach(cp => { if(cp.clientIds) { cp.clientIds = cp.clientIds.filter(cid => cid !== id); } if(cp.clientId === id) { delete cp.clientId; } }); saveData(); showSection('clients'); } }
function deleteTask(id) { if (confirm('Excluir tarefa e suas subtarefas?')) { tasks = tasks.filter(t => t.id !== id && t.parentId !== id); saveData(); displayFilteredTasks(); } }
function deleteControlPoint(id) {
    if (confirm('Tem certeza que deseja excluir este Ponto de Controle?')) {
        controlPoints = controlPoints.filter(cp => cp.id !== id);
        saveData();
        showSection('controls');
    }
}

// --- TASK ACTIONS ---
// ========= INÍCIO DAS FUNÇÕES CORRIGIDAS E RESTAURADAS =========

// 1. FUNÇÃO addSubtask CORRIGIDA
function addSubtask(parentId) {
    const p = tasks.find(t => t.id === parentId);
    if (!p) return;
    openTaskModal();
    setTimeout(() => {
        document.querySelector('#taskModal .modal-header h3').textContent = `Subtarefa de: ${p.name}`;
        const projSel = document.getElementById('taskProject');
        projSel.value = p.projectId;
        projSel.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (p.clientId) document.getElementById('taskClient').value = p.clientId;
            document.getElementById('taskParent').value = parentId;
        }, 50);
        document.getElementById('taskPhase').value = p.phase;
        document.getElementById('taskDueDate').value = p.dueDate;
        document.getElementById('taskPriority').value = p.priority;
        const assigneeValue = Array.isArray(p.assignee) ? p.assignee.join(', ') : p.assignee;
        document.getElementById('taskAssignee').value = assigneeValue;
    }, 50);
}

// 2. FUNÇÕES DE REPLICAÇÃO RESTAURADAS
function openReplicateRisksModal(id) {
    const sourceTask = tasks.find(t => t.id === id);
    if (!sourceTask || !sourceTask.risks || sourceTask.risks.length === 0) {
        alert('Esta tarefa não possui riscos para replicar.');
        return;
    }
    document.getElementById('sourceRiskTaskId').value = id;
    document.getElementById('sourceRiskTaskName').textContent = sourceTask.name;

    const risksPreview = document.getElementById('risksToReplicateList');
    risksPreview.innerHTML = `<ul>${sourceTask.risks.map(r => `<li><span class="risk-badge risk-${r.level}">${getRiskLabel(r.level)}</span> ${r.description}</li>`).join('')}</ul>`;
    
    const targetTasksList = document.getElementById('targetTasksList');
    targetTasksList.innerHTML = '';
    
    const targetTasks = tasks.filter(t => t.projectId === sourceTask.projectId && t.id !== id && !t.parentId && t.name === sourceTask.name);
    if(targetTasks.length > 0){
        targetTasks.forEach(t => {
            const client = clients.find(c => c.id === t.clientId);
            const label = `${t.name} ${client ? `(${client.name})` : '(Geral)'}`;
            const item = document.createElement('div');
            item.className = 'task-item';
            item.innerHTML = `<label><input type="checkbox" value="${t.id}"> ${label}</label>`;
            targetTasksList.appendChild(item);
        });
    } else {
        targetTasksList.innerHTML = '<p>Nenhuma outra tarefa com este nome foi encontrada neste projeto.</p>';
    }

    document.getElementById('replicateRisksModal').style.display = 'block';
}

function openReplicateTaskModal(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    const p = projects.find(p => p.id === t.projectId);
    if (!p || p.type !== 'group') {
        alert('Replicação disponível apenas para projetos "Grupo de Clientes".');
        return;
    }
    const clientsInGroup = clients.filter(c => c.projectId === t.projectId);
    const listDiv = document.getElementById('replicateClientList');
    listDiv.innerHTML = '';
    document.getElementById('replicateTaskName').textContent = t.name;
    document.getElementById('originalTaskId').value = id;
    clientsInGroup.forEach(c => {
        if (c.id === t.clientId) return;
        const existing = tasks.find(t2 => t2.projectId === t.projectId && t2.clientId === c.id && t2.name === t.name);
        const item = document.createElement('div');
        item.className = 'client-item';
        item.innerHTML = `<label><input type="checkbox" data-client-id="${c.id}" ${existing ? '' : 'checked'} ${existing ? 'disabled' : ''}> ${c.name} ${existing ? '<small>(Já existe)</small>' : ''}</label><input type="number" step="0.25" class="form-control hours-input" value="${t.estimatedHours}" ${existing ? 'disabled' : ''}>`;
        listDiv.appendChild(item);
    });
    document.getElementById('replicateTaskModal').style.display = 'block';
}

function openReplicateSingleSubtaskModal(id) {
    const sourceSubtask = tasks.find(t => t.id === id);
    if (!sourceSubtask) {
        alert('Subtarefa de origem não encontrada.');
        return;
    }

    const parentTask = tasks.find(t => t.id === sourceSubtask.parentId);
    if (!parentTask) {
        alert('A tarefa pai desta subtarefa não foi encontrada.');
        return;
    }

    document.getElementById('sourceSubtaskId').value = id;
    document.getElementById('sourceSubtasksTaskName').textContent = sourceSubtask.name;

    const subtasksPreview = document.getElementById('subtasksToReplicateList');
    subtasksPreview.innerHTML = `<ul><li>${sourceSubtask.name} (${formatHours(sourceSubtask.estimatedHours)})</li></ul>`;
    
    const targetTasksList = document.getElementById('targetSubtasksTasksList');
    targetTasksList.innerHTML = '';
    
    const targetTasks = tasks.filter(t => 
        t.projectId === parentTask.projectId &&
        t.id !== parentTask.id &&            
        !t.parentId &&                       
        t.name === parentTask.name           
    );

    if (targetTasks.length > 0) {
        targetTasks.forEach(t => {
            const client = clients.find(c => c.id === t.clientId);
            const label = `${t.name} ${client ? `(${client.name})` : '(Geral)'}`;
            const item = document.createElement('div');
            item.className = 'task-item';
            item.innerHTML = `<label><input type="checkbox" value="${t.id}"> ${label}</label>`;
            targetTasksList.appendChild(item);
        });
    } else {
        targetTasksList.innerHTML = '<p>Nenhuma outra tarefa principal com o mesmo nome da tarefa pai foi encontrada neste projeto para ser um destino.</p>';
    }

    document.getElementById('replicateSubtasksModal').style.display = 'block';
}

// ========= FIM DAS FUNÇÕES CORRIGIDAS E RESTAURADAS =========

function replicateProject(id) {
    const sourceProject = projects.find(p => p.id === id);
    if (!sourceProject || !confirm(`Replicar o projeto "${sourceProject.name}" para o ano de ${parseInt(sourceProject.year) + 1}? Clientes e tarefas serão replicados.`)) return;

    const nextYear = parseInt(sourceProject.year) + 1;
    const newProject = {
        ...sourceProject,
        id: generateId(),
        year: nextYear,
        name: sourceProject.name.replace(sourceProject.year, nextYear),
        status: 'planning',
        createdAt: new Date().toISOString()
    };
    delete newProject.updatedAt;
    projects.push(newProject);

    const sourceClients = clients.filter(c => c.projectId === id);
    sourceClients.forEach(client => {
        const newClient = {
            ...client,
            id: generateId(),
            projectId: newProject.id,
            createdAt: new Date().toISOString()
        };
        delete newClient.updatedAt;
        clients.push(newClient);

        const sourceTasks = tasks.filter(t => t.clientId === client.id && !t.parentId);
        sourceTasks.forEach(task => {
            const newTask = {
                ...task,
                id: generateId(),
                projectId: newProject.id,
                clientId: newClient.id,
                status: 'pending',
                actualHours: 0,
                createdAt: new Date().toISOString()
            };
            delete newTask.updatedAt;
            tasks.push(newTask);
        });
    });

    saveData();
    showSection('projects');
    alert(`Projeto replicado para ${nextYear} com sucesso!`);
}


// --- REPORTS ---
// --- REPORTS ---
function setupReports() {
    populateYearSelect('reportYearSelect');
    populateProjectSelect('reportProjectSelect', true);
    populateClientSelect('reportClientSelect', null, true);
    populateResponsibleSelect('reportResponsibleSelect', tasks);

    const projectSelect = document.getElementById('reportProjectSelect');
    const clientSelect = document.getElementById('reportClientSelect');

    projectSelect.addEventListener('change', () => {
        const projectId = projectSelect.value;
        populateClientSelect('reportClientSelect', projectId, true);
        const tasksForProject = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
        populateResponsibleSelect('reportResponsibleSelect', tasksForProject);
    });

    clientSelect.addEventListener('change', () => {
        const projectId = projectSelect.value;
        const clientId = clientSelect.value;
        let tasksForClient = tasks;
        if (projectId) {
            tasksForClient = tasksForClient.filter(t => t.projectId === projectId);
        }
        if (clientId) {
            tasksForClient = tasksForClient.filter(t => t.clientId === clientId);
        }
        populateResponsibleSelect('reportResponsibleSelect', tasksForClient);
    });
}

function generateReport() {
    const year = document.getElementById('reportYearSelect').value;
    const projectId = document.getElementById('reportProjectSelect').value;
    const clientId = document.getElementById('reportClientSelect').value;
    const responsible = document.getElementById('reportResponsibleSelect').value;
    const sortOrder = document.getElementById('reportSortSelect').value;
    
    let filteredProjects = projects;
    if (year) filteredProjects = filteredProjects.filter(p => p.year == year);
    if (projectId) filteredProjects = filteredProjects.filter(p => p.id === projectId);

    const filteredProjectIds = filteredProjects.map(p => p.id);
    let tasksForFilter = tasks.filter(t => filteredProjectIds.includes(t.projectId));
    if(clientId) tasksForFilter = tasksForFilter.filter(t => t.clientId === clientId);
    
    let tasksForReport;
    if (responsible) {
        const responsibleTasks = tasksForFilter.filter(t => 
            Array.isArray(t.assignee) ? t.assignee.includes(responsible) : t.assignee === responsible
        );
        const parentTaskIds = new Set();
        responsibleTasks.forEach(task => {
            if (task.parentId) {
                parentTaskIds.add(task.parentId);
            }
        });
        tasksForReport = tasksForFilter.filter(t => {
            const isAssigned = Array.isArray(t.assignee) ? t.assignee.includes(responsible) : t.assignee === responsible;
            return isAssigned || parentTaskIds.has(t.id);
        });
    } else {
        tasksForReport = tasksForFilter;
    }

    const mainTasks = tasksForReport.filter(t => !t.parentId);
    const allSubtasks = tasksForReport.filter(t => t.parentId);

    switch (sortOrder) {
        case 'client':
            mainTasks.sort((a, b) => {
                const clientA = clients.find(c => c.id === a.clientId)?.name || 'zzzz';
                const clientB = clients.find(c => c.id === b.clientId)?.name || 'zzzz';
                const clientCompare = clientA.localeCompare(clientB);
                if (clientCompare !== 0) return clientCompare;
                return a.name.localeCompare(b.name);
            });
            break;
        case 'task':
            mainTasks.sort((a, b) => {
                const nameCompare = a.name.localeCompare(b.name);
                if (nameCompare !== 0) return nameCompare;
                const clientA = clients.find(c => c.id === a.clientId)?.name || 'zzzz';
                const clientB = clients.find(c => c.id === b.clientId)?.name || 'zzzz';
                return clientA.localeCompare(clientB);
            });
            break;
        case 'dueDate':
            mainTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            break;
    }

    const finalTasksList = [];
    mainTasks.forEach(mainTask => {
        finalTasksList.push(mainTask);
        const relatedSubtasks = allSubtasks
            .filter(sub => sub.parentId === mainTask.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        finalTasksList.push(...relatedSubtasks);
    });

    const today = new Date();
    const formattedToday = today.toLocaleDateString('pt-BR');
    const reportId = `PT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const auditorName = "Anderson Soares - Auditor Sênior"; 
    
    const totalPlannedForHeader = finalTasksList.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualForHeader = finalTasksList.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const efficiencyRate = totalActualForHeader > 0 ? (totalPlannedForHeader / totalActualForHeader * 100) : 0;
    
    const SIGNIFICANCE_THRESHOLD = 0.20;
    const significantDeviationsList = finalTasksList.filter(t => {
        if (!t.estimatedHours || t.estimatedHours === 0 || !t.actualHours) return false;
        const deviation = Math.abs(t.estimatedHours - t.actualHours) / t.estimatedHours;
        return deviation > SIGNIFICANCE_THRESHOLD;
    });
    const significantDeviationsCount = significantDeviationsList.length;
    const significantDeviationsPercentage = finalTasksList.length > 0 ? (significantDeviationsCount / finalTasksList.length * 100) : 0;
    const tasksWithExcessCount = finalTasksList.filter(t => (t.actualHours || 0) > (t.estimatedHours || 0)).length;

    const projectName = projectId ? projects.find(p=>p.id===projectId).name : 'Todos';
    const clientName = clientId ? clients.find(c=>c.id===clientId).name : 'Todos';
    const periodoInfo = year ? `<strong>Ano de Referência:</strong> ${year} | ` : '';
    
    let reportHeaderHTML = `
        <div class="report-header">
            <h3>PAPEL DE TRABALHO ${reportId}</h3>
            <p style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">Análise de Eficiência e Desempenho - Controle de Horas</p>
            <p>${periodoInfo}<strong>Preparado por:</strong> ${auditorName} | <strong>Data de Emissão:</strong> ${formattedToday}</p>
            <h4>Objetivo</h4>
            <p>Este papel de trabalho tem por objetivo: (i) avaliar a eficiência na alocação de recursos humanos nos trabalhos de auditoria; (ii) identificar variações superiores a ${SIGNIFICANCE_THRESHOLD * 100}% entre horas planejadas e realizadas; (iii) documentar desvios significativos para investigação; e (iv) subsidiar o planejamento de recursos em projetos similares futuros, em conformidade com as práticas de controle de qualidade.</p>
            <h4>Escopo e Limitações</h4>
            <p><strong>Filtros Aplicados:</strong> Ano (${year || 'Todos'}), Projeto (${projectName}), Cliente (${clientName}), Responsável (${responsible || 'Todos'})<br>
            <strong>Limitações:</strong> Análise baseada em registros de timesheet manual; período específico pode não ser representativo do desempenho geral; fatores de complexidade inusual ou mudanças de escopo não foram considerados na avaliação.</p>
            <h4>Procedimentos Aplicados</h4>
            <p>Foram revisadas todas as tarefas executadas conforme filtros definidos, utilizando registros de controle interno. Aplicaram-se os seguintes critérios: (i) variações superiores a ${SIGNIFICANCE_THRESHOLD * 100}% classificadas como significativas; (ii) tarefas com zero horas realizadas identificadas como não iniciadas; (iii) cálculo de taxa de eficiência baseado na relação horas planejadas/realizadas; (iv) análise de distribuição de variações por responsável e tipo de tarefa.</p>
            <h4>Principais Achados</h4>
            <p><strong>Taxa de Eficiência Geral:</strong> ${efficiencyRate.toFixed(1)}% | <strong>Desvios Significativos:</strong> ${significantDeviationsCount} tarefas (${significantDeviationsPercentage.toFixed(1)}% do total) | <strong>Tarefas com Excesso:</strong> ${tasksWithExcessCount}</p>
            <h4>Conclusões e Recomendações</h4>
            <p>Com base na análise realizada: O desempenho geral requer atenção em algumas áreas específicas. Recomenda-se: (i) investigação detalhada das ${significantDeviationsCount} tarefas com desvios >${SIGNIFICANCE_THRESHOLD * 100}% no prazo de 15 dias; (ii) revisão dos templates de estimativa para tarefas similares; (iii) treinamento adicional da equipe nas áreas identificadas. O presente trabalho deve ser revisado pelo gerente do projeto e arquivado nos papéis de trabalho permanentes.</p>
            <h4>Metodologia de Cálculo</h4>
            <p><small><strong>Variação:</strong> (Horas Estimadas - Horas Realizadas) | <strong>Taxa de Eficiência:</strong> (Total Planejado ÷ Total Realizado) × 100 | <strong>Materialidade:</strong> Variações >${SIGNIFICANCE_THRESHOLD * 100}% consideradas significativas</small></p>
        </div>`;

    let summaryHTML = '';
    let collaboratorTableHTML = '';

    if (responsible) {
        const totalEstimated = finalTasksList.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
        const totalActual = finalTasksList.reduce((sum, t) => sum + (t.actualHours || 0), 0);
        const variance = totalEstimated - totalActual;
        const varianceClass = variance >= 0 ? 'saldo-positive' : 'saldo-negative';
        
        summaryHTML = `<div class="card"><h3>Resumo de Performance: ${responsible}</h3><table class="table">
            <tr><td>Total de Horas Planejadas:</td><td>${formatHours(totalEstimated)}</td></tr>
            <tr><td>Total de Horas Executadas:</td><td>${formatHours(totalActual)}</td></tr>
            <tr><td>Variação (Planejado vs. Executado):</td><td><strong class="${varianceClass}">${formatHours(variance)}</strong></td></tr>
        </table></div>`;
    } else {
        let totalBudgeted = 0;
        if (clientId) {
            const client = clients.find(c => c.id === clientId);
            totalBudgeted = client ? (client.budgetedHours || 0) : 0;
        } else {
            totalBudgeted = filteredProjects.reduce((sum, p) => sum + getProjectBudgetedHours(p.id), 0);
        }

        const totalActual = finalTasksList.reduce((sum, t) => sum + (t.actualHours || 0), 0);
        const totalPlanned = finalTasksList.reduce((sum, t) => !t.parentId ? sum + (t.estimatedHours || 0) : sum, 0);
        const budgetVariance = totalBudgeted - totalActual;
        const planningVariance = totalPlanned - totalActual;
        const budgetVarianceClass = budgetVariance >= 0 ? 'saldo-positive' : 'saldo-negative';
        const planningVarianceClass = planningVariance >= 0 ? 'saldo-positive' : 'saldo-negative';
        
        summaryHTML = `<div class="card"><h3>Resumo de Planejamento</h3><table class="table">
            <tr><td>Horas Orçadas Totais:</td><td>${formatHours(totalBudgeted)}</td></tr>
            <tr><td>Horas Planejadas Totais:</td><td>${formatHours(totalPlanned)}</td></tr>
            <tr><td>Horas Executadas Totais:</td><td>${formatHours(totalActual)}</td></tr>
            <tr><td><strong>Variação Orçamentária (Orçado - Executado):</strong></td><td><strong class="${budgetVarianceClass}">${formatHours(budgetVariance)}</strong></td></tr>
            <tr><td><strong>Variação do Planejado (Planejado - Executado):</strong></td><td><strong class="${planningVarianceClass}">${formatHours(planningVariance)}</strong></td></tr>
        </table></div>`;
    }

    const collaborators = [...new Set(finalTasksList.flatMap(t => Array.isArray(t.assignee) ? t.assignee : [t.assignee]).filter(Boolean))].sort();
    if(collaborators.length > 0) {
        collaboratorTableHTML = `<div class="card"><h3>Horas por Colaborador</h3><table class="table">
            <thead><tr><th>Colaborador</th><th>Horas Planejadas</th><th>Horas Executadas</th><th>Variação</th></tr></thead><tbody>`;
        
        collaborators.forEach(collaborator => {
            const tasksForCollaborator = finalTasksList.filter(t => 
                Array.isArray(t.assignee) ? t.assignee.includes(collaborator) : t.assignee === collaborator
            );

            const planned = tasksForCollaborator.reduce((sum, t) => {
                const numAssignees = Array.isArray(t.assignee) && t.assignee.length > 0 ? t.assignee.length : 1;
                return sum + ((t.estimatedHours || 0) / numAssignees);
            }, 0);
            const actual = tasksForCollaborator.reduce((sum, t) => {
                const numAssignees = Array.isArray(t.assignee) && t.assignee.length > 0 ? t.assignee.length : 1;
                return sum + ((t.actualHours || 0) / numAssignees);
            }, 0);
            
            const variance = planned - actual;
            const varianceClass = variance >= 0 ? 'saldo-positive' : 'saldo-negative';
            
            collaboratorTableHTML += `<tr>
                <td>${collaborator}</td>
                <td>${formatHours(planned)}</td>
                <td>${formatHours(actual)}</td>
                <td><strong class="${varianceClass}">${formatHours(variance)}</strong></td>
            </tr>`;
        });
        
        collaboratorTableHTML += `</tbody></table></div>`;
    }
    
    summaryHTML += collaboratorTableHTML;

    let tasksHTML = `<div class="card"><h3>Lista Detalhada de Tarefas</h3><table class="table" id="reportTaskTable">
        <thead><tr><th>Tarefa</th><th>Projeto</th><th>Cliente</th><th>Responsável</th><th>Status</th><th>Etapa</th><th>Vencimento</th><th>Est.</th><th>Real.</th><th>Variação</th></tr></thead>
        <tbody>${finalTasksList.map(task => {
            let rowHTML = '';
            
            let displayActualHours = task.actualHours || 0;
            
            if (!task.parentId) {
                const subtasksForThisParent = tasksForFilter.filter(sub => sub.parentId === task.id);
                const subtaskHours = subtasksForThisParent.reduce((sum, sub) => sum + (sub.actualHours || 0), 0);
                displayActualHours += subtaskHours;
            }
            
            const variance = (task.estimatedHours || 0) - displayActualHours;
            let varianceHTML = '<span>-</span>';

            if (displayActualHours > 0 || (task.estimatedHours || 0) > 0) {
                if (variance > 0) {
                    varianceHTML = `<span class="saldo-positive">+${formatHours(variance)}</span>`;
                } else if (variance < 0) {
                    varianceHTML = `<span class="saldo-negative">${formatHours(variance)}</span>`;
                } else {
                    varianceHTML = `<span>${formatHours(0)}</span>`;
                }
            }
            
            const assigneeText = Array.isArray(task.assignee) ? task.assignee.join(', ') : task.assignee;

            rowHTML += `<tr>
                <td>${task.parentId ? '└─ ' : ''}${task.name}</td>
                <td>${projects.find(p => p.id === task.projectId)?.name}</td>
                <td>${clients.find(c => c.id === task.clientId)?.name || 'N/A'}</td>
                <td>${assigneeText}</td>
                <td>${getTaskStatusLabel(task.status)}</td>
                <td>${getPhaseLabel(task.phase)}</td>
                <td>${formatDate(task.dueDate)}</td>
                <td>${formatHours(task.estimatedHours)}</td>
                <td>${formatHours(displayActualHours)}</td>
                <td>${varianceHTML}</td>
            </tr>`;

            if (task.risks && task.risks.length > 0) {
                const riskDescriptions = task.risks.map(r => `<li><strong>${getRiskLabel(r.level)}:</strong> ${r.description}</li>`).join('');
                rowHTML += `
                    <tr class="risk-details-row">
                        <td colspan="10">
                            <div class="risk-details-container">
                                <strong>Riscos Detalhados:</strong>
                                <ul>${riskDescriptions}</ul>
                            </div>
                        </td>
                    </tr>`;
            }

            return rowHTML;
        }).join('') || '<tr><td colspan="10">Nenhuma tarefa encontrada.</td></tr>'}</tbody>
    </table></div>`;
    
    document.getElementById('reportResults').innerHTML = reportHeaderHTML + summaryHTML + tasksHTML;
}

function exportReportToPDF() {
    const element = document.getElementById('reportResults');
    if (!element.innerHTML.trim()) { alert('Gere um relatório primeiro.'); return; }
    const opt = {
        margin: 10,
        filename: `relatorio_auditoria_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'avoid-all'] }
    };
    html2pdf().from(element).set(opt).save();
}

function printReport() {
    const content = document.getElementById('reportResults');
    if (!content.innerHTML.trim()) {
        alert('Gere um relatório primeiro.');
        return;
    }
    window.print();
}

function exportReportToExcel() {
    const reportResults = document.getElementById('reportResults');
    if (!reportResults.innerHTML.trim()) {
        alert('Gere um relatório primeiro.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const sheetName = 'Relatorio_Auditoria';

    const headerText = reportResults.querySelector('.report-header').innerText;
    const summaryTable = reportResults.querySelector('.card:first-of-type table');
    let data = [];
    
    data.push(['Papel de Trabalho: Detalhamento de Tarefas']);
    data.push([]); 

    if(summaryTable) {
        summaryTable.querySelectorAll('tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach(cell => rowData.push(cell.innerText));
            data.push(rowData);
        });
    }
    data.push([]);

    const taskTable = document.getElementById('reportTaskTable');
    if (taskTable) {
        const tableData = XLSX.utils.table_to_sheet(taskTable);
        const taskData = XLSX.utils.sheet_to_json(tableData, {header: 1});
        data = data.concat(taskData);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `relatorio_auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function generateControlPointsReport() {
    const container = document.getElementById('controlReportContainer');
    const projectId = document.getElementById('controlFilterProject').value;
    const type = document.getElementById('controlFilterType').value;
    const phase = document.getElementById('controlFilterPhase').value;
    const searchTerm = document.getElementById('controlFilterSearch').value.toLowerCase();

    let filtered = controlPoints;
    if (projectId) filtered = filtered.filter(cp => cp.projectId === projectId);
    if (type) filtered = filtered.filter(cp => cp.type === type);
    if (phase) filtered = filtered.filter(cp => cp.phase === phase);
    if (searchTerm) {
        filtered = filtered.filter(cp => cp.title.toLowerCase().includes(searchTerm) || cp.synthesis.toLowerCase().includes(searchTerm));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p>Nenhum ponto de controle para gerar relatório com base nos filtros atuais.</p>';
        return;
    }

    const today = new Date();
    const reportId = `PT-CTRL-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const projectName = projectId ? projects.find(p=>p.id===projectId).name : 'Todos os Projetos';
    
    const typeLabels = { 'cci': 'CCI', 'ressalva': 'Ressalva', 'enfase': 'Ênfase' };
    const phaseLabels = { 'preliminar': 'Preliminar', 'final': 'Final', 'operacional': 'Operacional' };

    const tableRows = filtered.map(cp => {
        const clientIds = Array.isArray(cp.clientIds) ? cp.clientIds : [cp.clientId];
        const associatedClients = clientIds.map(id => clients.find(c => c.id === id)?.name || 'N/A').join(', ');
        return `
            <tr>
                <td>${cp.title}</td>
                <td>${typeLabels[cp.type]}</td>
                <td>${associatedClients}</td>
                <td>${phaseLabels[cp.phase]}</td>
                <td>${cp.synthesis}</td>
                <td>${cp.recommendation}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div id="printableControlReport">
            <div class="report-header">
                <h3>PAPEL DE TRABALHO ${reportId}</h3>
                <p><strong>Assunto:</strong> Relatório de Pontos de Controle e Achados de Auditoria</p>
                <p><strong>Projeto:</strong> ${projectName} | <strong>Data de Emissão:</strong> ${today.toLocaleDateString('pt-BR')}</p>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>Tipo</th>
                        <th>Cliente(s)</th>
                        <th>Fase</th>
                        <th>Síntese (Achado)</th>
                        <th>Recomendação</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        <button class="btn" onclick="printControlReport()" style="margin-top: 15px; background-color: #7f8c8d; color: white;">Imprimir Relatório</button>
    `;
}

function printControlReport() {
    const reportHTML = document.getElementById('printableControlReport').innerHTML;
    const originalBody = document.body.innerHTML;
    
    document.body.innerHTML = `
        <html>
            <head>
                <title>Relatório de Pontos de Controle</title>
                <link rel="stylesheet" href="style.css">
                <style>
                    body { background: white; }
                    .report-header, .table { font-size: 10pt; }
                </style>
            </head>
            <body>${reportHTML}</body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalBody;
    showSection('controls');
}

function exportData() {
    // ADICIONADO AQUI: Carrega os apontamentos de horas para incluir no backup
    const timeEntriesData = JSON.parse(localStorage.getItem('auditTimeEntries')) || [];

    const data = {
        projects,
        clients,
        tasks,
        controlPoints,
        timeEntries: timeEntriesData // ADICIONADO AQUI: Inclui os apontamentos no objeto de dados
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_completo_auditoria_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Backup completo gerado com sucesso!');
}
function importData(event) {
    const file = event.target.files[0];
    if (!file || !confirm("Isso substituirá TODOS os dados atuais (incluindo apontamentos de horas). Continuar?")) {
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.projects && data.clients && data.tasks) {
                projects = data.projects;
                clients = data.clients;
                tasks = data.tasks;
                controlPoints = data.controlPoints || [];
                
                // ADICIONADO AQUI: Restaura os apontamentos de horas
                const timeEntriesToRestore = data.timeEntries || [];
                localStorage.setItem('auditTimeEntries', JSON.stringify(timeEntriesToRestore));

                saveData(); // Salva os dados principais (projetos, clientes, etc.)
                alert('Dados importados com sucesso! Projetos, tarefas e apontamentos de horas foram restaurados.');
                showSection('dashboard');
            } else {
                alert('Arquivo de backup inválido ou em formato incorreto.');
            }
        } catch (error) {
            alert('Erro ao processar o arquivo de backup. Verifique se o arquivo não está corrompido.');
            console.error("Erro na importação:", error);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// --- EVENT LISTENERS ---
document.addEventListener('click', function(e) {
    const navTab = e.target.closest('.nav-tab[data-section]');
    if (navTab) { showSection(navTab.dataset.section); return; }

    const actionTarget = e.target.closest('[data-action]');
    if (actionTarget) {
        const { action, id, container } = actionTarget.dataset;
        // ========= LISTENER DE EVENTOS CORRIGIDO =========
        const actions = {
            'open-project-modal': openProjectModal, 'open-client-modal': openClientModal, 'open-task-modal': openTaskModal,
            'open-control-point-modal': openControlPointModal,
            'edit-project': editProject, 'delete-project': deleteProject,
            'edit-client': editClient, 'delete-client': deleteClient,
            'edit-task': editTask, 'delete-task': deleteTask,
            'edit-control-point': editControlPoint, 'delete-control-point': deleteControlPoint,
            'replicate-control-point': openReplicateControlPointModal,
            'add-subtask': addSubtask, 'replicate-task': openReplicateTaskModal, // Ação 'replicate-task' corrigida
            'replicate-project': replicateProject,
            'replicate-subtask': openReplicateSingleSubtaskModal, 'open-replicate-risks': openReplicateRisksModal,
            'add-risk': () => addRiskInput(container), 'remove-risk': () => actionTarget.closest('.risk-item').remove(),
            'generate-report': generateReport, 'export-report-pdf': exportReportToPDF, 'print-report': printReport, 'export-report-excel': exportReportToExcel,
            'export-data': exportData, 'import-data': () => document.getElementById('importFile').click(),
        };
        if (actions[action]) {
            e.preventDefault(); e.stopPropagation();
            actions[action](id);
        }
        return;
    }
    
    const taskCard = e.target.closest('.task-card');
    if (taskCard?.id) {
        toggleTaskDetails(taskCard.id.replace('task-card-', ''));
        return;
    }
    
    const controlCard = e.target.closest('.control-point-card');
    if (controlCard && !e.target.closest('[data-action]')) {
        controlCard.classList.toggle('is-expanded');
        const actions = controlCard.querySelector('.card-actions');
        if(actions) {
            actions.style.display = controlCard.classList.contains('is-expanded') ? 'flex' : 'none';
        }
        return;
    }
    
    const closeButton = e.target.closest('.close[data-modal-id]');
    if (closeButton) closeModal(closeButton.dataset.modalId);
});

document.addEventListener('DOMContentLoaded', async () => { 
    await loadInitialData(); 
    showSection('dashboard'); 

    // Formulários principais
    document.getElementById('projectForm').addEventListener('submit', handleProjectFormSubmit);
    document.getElementById('clientForm').addEventListener('submit', handleClientFormSubmit);
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    document.getElementById('controlPointForm').addEventListener('submit', handleControlPointFormSubmit);
    document.getElementById('replicateControlPointForm').addEventListener('submit', handleReplicateControlPointFormSubmit);
    document.getElementById('editProjectForm').addEventListener('submit', handleEditProjectFormSubmit);
    document.getElementById('editClientForm').addEventListener('submit', handleEditClientFormSubmit);
    document.getElementById('editTaskForm').addEventListener('submit', handleEditTaskFormSubmit);
    document.getElementById('replicateTaskForm').addEventListener('submit', handleReplicateTaskFormSubmit);
    document.getElementById('replicateRisksForm').addEventListener('submit', handleReplicateRisksFormSubmit);
    document.getElementById('replicateSubtasksForm').addEventListener('submit', handleReplicateSubtasksFormSubmit);

    // Outros listeners
    document.getElementById('projectType').addEventListener('change', (e) => toggleBudgetedHours(e.target.value, 'projectBudgetedHours'));
    document.getElementById('editProjectType').addEventListener('change', (e) => toggleBudgetedHours(e.target.value, 'editProjectBudgetedHours'));
    document.getElementById('taskProject').addEventListener('change', function() { 
        populateClientSelect('taskClient', this.value); 
        populateTaskSelect('taskParent', this.value, null); 
    });
    document.getElementById('importFile').addEventListener('change', importData);
});