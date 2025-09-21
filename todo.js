// --- DATA STORAGE ---
let timeEntries = [];
let projects = [];
let clients = [];
let tasks = [];
let currentView = 'detailed'; // 'detailed' ou 'grouped'

// --- UTILITY FUNCTIONS ---
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR');
}

// --- DATA LOADING & SAVING ---
function loadData() {
    const storedProjects = localStorage.getItem('auditProjects');
    const storedClients = localStorage.getItem('auditClients');
    const storedTasks = localStorage.getItem('auditTasks');

    if (!storedProjects || !storedClients || !storedTasks) {
        alert('Dados do gerenciador de tarefas não encontrados. Por favor, abra o gerenciador primeiro para carregar os dados.');
        document.getElementById('entry-card').innerHTML = '<p class="text-danger">Erro: Não foi possível carregar os projetos e tarefas. Abra a <a href="index.html">página principal</a> primeiro.</p>';
        return;
    }

    projects = JSON.parse(storedProjects);
    clients = JSON.parse(storedClients);
    tasks = JSON.parse(storedTasks);

    const storedTimeEntries = localStorage.getItem('auditTimeEntries');
    if (storedTimeEntries) {
        timeEntries = JSON.parse(storedTimeEntries);
    }
    console.log('Dados do Gerenciador e Apontamentos carregados com sucesso.');
}

function saveData() {
    localStorage.setItem('auditTimeEntries', JSON.stringify(timeEntries));
    console.log('Apontamentos de horas salvos.');
}

// --- UI POPULATION (FORMULÁRIO E FILTROS) ---
function populateSelect(selectId, data, nameField, valueField, defaultOption) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">${defaultOption}</option>`;
    data.forEach(item => {
        select.appendChild(new Option(item[nameField], item[valueField]));
    });
}

function populateProjectSelects() {
    const sortedProjects = [...projects].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
    populateSelect('projectSelect', sortedProjects, 'name', 'id', 'Selecione um Projeto');
    populateSelect('filterProject', sortedProjects, 'name', 'id', 'Todos os Projetos');
}

function updateClientSelects(formOrFilter, projectId) {
    const prefix = formOrFilter === 'form' ? '' : 'filter';
    const selectId = formOrFilter === 'form' ? 'clientSelect' : 'filterClient';
    const clientSelect = document.getElementById(selectId);
    
    clientSelect.innerHTML = `<option value="">${prefix === 'filter' ? 'Todos os Clientes' : 'Selecione um Cliente'}</option>`;
    if (!projectId) return;

    const filteredClients = clients.filter(c => c.projectId === projectId).sort((a,b) => a.name.localeCompare(b.name));
    filteredClients.forEach(client => {
        clientSelect.appendChild(new Option(client.name, client.id));
    });
}

function updateTaskSelects(formOrFilter, projectId, clientId) {
    const prefix = formOrFilter === 'form' ? '' : 'filter';
    const selectId = formOrFilter === 'form' ? 'taskSelect' : 'filterTask';
    const taskSelect = document.getElementById(selectId);
    
    taskSelect.innerHTML = `<option value="">${prefix === 'filter' ? 'Todas as Atividades' : 'Selecione uma Atividade'}</option>`;
    if (!projectId || !clientId) return;

    const filteredTasks = tasks.filter(t => t.projectId === projectId && t.clientId === clientId && !t.parentId).sort((a,b) => a.name.localeCompare(b.name));
    filteredTasks.forEach(task => {
        taskSelect.appendChild(new Option(task.name, task.id));
    });
}

function updateSubtaskSelects(formOrFilter, parentId) {
    const prefix = formOrFilter === 'form' ? '' : 'filter';
    const selectId = formOrFilter === 'form' ? 'subtaskSelect' : 'filterSubtask';
    const subtaskSelect = document.getElementById(selectId);

    subtaskSelect.innerHTML = `<option value="">${prefix === 'filter' ? 'Todas as Subtarefas' : 'Nenhuma'}</option>`;
    if (!parentId) return;

    const subtasks = tasks.filter(t => t.parentId === parentId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
    subtasks.forEach(sub => {
        subtaskSelect.appendChild(new Option(sub.name, sub.id));
    });
}

// --- RENDER FUNCTIONS ---
function renderTimeEntries() {
    const listContainer = document.getElementById('timeEntriesList');
    const description = document.getElementById('view-mode-description');
    listContainer.innerHTML = '';

    const filters = {
        projectId: document.getElementById('filterProject').value,
        clientId: document.getElementById('filterClient').value,
        taskId: document.getElementById('filterTask').value,
        subtaskId: document.getElementById('filterSubtask').value,
        billed: document.getElementById('filterBilled').value, // NOVO FILTRO
    };

    let baseFilteredEntries = timeEntries.filter(entry => {
        const billedFilterMatch = (filters.billed === "") ||
                                  (filters.billed === "yes" && entry.billed) ||
                                  (filters.billed === "no" && !entry.billed);

        return (!filters.projectId || entry.projectId === filters.projectId) &&
               (!filters.clientId || entry.clientId === filters.clientId) &&
               (!filters.taskId || entry.taskId === filters.taskId) &&
               (!filters.subtaskId || entry.subtaskId === filters.subtaskId) &&
               billedFilterMatch; // APLICA O FILTRO DE STATUS
    });

    if (currentView === 'grouped') {
        description.textContent = 'Mostrando o total de horas acumulado para os filtros selecionados.';
        if (baseFilteredEntries.length === 0) {
            listContainer.innerHTML = '<p>Nenhum lançamento encontrado para os filtros selecionados.</p>';
            return;
        }
        renderGroupedView(baseFilteredEntries);
    } else {
        description.textContent = 'Mostrando lançamentos individuais. Use o filtro de data para ver um dia específico.';
        const filterDate = document.getElementById('filterDate').value;
        const finalEntries = filterDate ? baseFilteredEntries.filter(entry => entry.date === filterDate) : baseFilteredEntries;

        if (finalEntries.length === 0) {
            listContainer.innerHTML = '<p>Nenhum lançamento encontrado para os filtros selecionados.</p>';
            return;
        }
        renderDetailedView(finalEntries);
    }
}


function renderDetailedView(entries) {
    const listContainer = document.getElementById('timeEntriesList');
    entries.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
    let totalHours = 0;

    entries.forEach(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        const client = clients.find(c => c.id === entry.clientId);
        const task = tasks.find(t => t.id === entry.taskId);
        const subtask = entry.subtaskId ? tasks.find(t => t.id === entry.subtaskId) : null;
        totalHours += parseFloat(entry.hours);

        const card = document.createElement('div');
        // Adiciona a classe 'billed' se o lançamento estiver marcado
        card.className = `time-entry-card ${entry.billed ? 'billed' : ''}`;
        card.innerHTML = `
            <div class="entry-details">
                <h4>${task ? task.name : 'Tarefa não encontrada'} ${subtask ? `/ ${subtask.name}` : ''}</h4>
                <p class="path">${project ? project.name : 'Projeto não encontrado'} > ${client ? client.name : 'Cliente não encontrado'}</p>
                <p><strong>Trabalho Realizado:</strong> ${entry.description}</p>
            </div>
            <div class="entry-actions">
                <div class="entry-hours">${parseFloat(entry.hours).toFixed(2)}h</div>
                <small>${formatDate(entry.date)}</small>
                <div class="btn-group">
                    <button class="btn btn-info btn-sm" data-action="toggleBilled" data-id="${entry.id}">${entry.billed ? 'Desmarcar' : 'Lançar'}</button>
                    <button class="btn btn-warning btn-sm" data-action="edit" data-id="${entry.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${entry.id}">Excluir</button>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    const summary = document.createElement('div');
    summary.innerHTML = `<p style="text-align: right; font-weight: bold; margin-top: 15px;">Total de Horas na Lista: ${totalHours.toFixed(2)}h</p>`;
    listContainer.appendChild(summary);
}

function renderGroupedView(entries) {
    const listContainer = document.getElementById('timeEntriesList');
    const grouped = {};

    entries.forEach(entry => {
        const key = `${entry.taskId}-${entry.subtaskId || 'null'}`;
        if (!grouped[key]) {
            grouped[key] = { entryDetails: entry, totalHours: 0, descriptions: [] };
        }
        grouped[key].totalHours += parseFloat(entry.hours);
        grouped[key].descriptions.push(entry.description);
    });

    let totalHours = 0;
    Object.values(grouped).sort((a,b) => a.entryDetails.taskId.localeCompare(b.entryDetails.taskId)).forEach(group => {
        const { entryDetails, totalHours: groupHours, descriptions } = group;
        const project = projects.find(p => p.id === entryDetails.projectId);
        const client = clients.find(c => c.id === entryDetails.clientId);
        const task = tasks.find(t => t.id === entryDetails.taskId);
        const subtask = entryDetails.subtaskId ? tasks.find(t => t.id === entryDetails.subtaskId) : null;
        totalHours += groupHours;
        const descriptionItems = descriptions.map(desc => `<li>${desc}</li>`).join('');

        const card = document.createElement('div');
        card.className = 'time-entry-card grouped-entry-card';
        card.innerHTML = `
            <div class="entry-details">
                <h4>${task ? task.name : 'Tarefa não encontrada'} ${subtask ? `/ ${subtask.name}` : ''}</h4>
                <p class="path">${project ? project.name : 'Projeto não encontrado'} > ${client ? client.name : 'Cliente não encontrado'}</p>
                <ul class="description-list">${descriptionItems}</ul>
            </div>
            <div class="entry-actions">
                <div class="entry-hours">${groupHours.toFixed(2)}h</div>
                <small>Total Acumulado</small>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    const summary = document.createElement('div');
    summary.innerHTML = `<p style="text-align: right; font-weight: bold; margin-top: 15px;">Total de Horas na Lista: ${totalHours.toFixed(2)}h</p>`;
    listContainer.appendChild(summary);
}

// --- LÓGICA DE EDIÇÃO ---
function startEditEntry(entryId) {
    const entry = timeEntries.find(e => e.id === entryId);
    if (!entry) return;

    document.getElementById('editingEntryId').value = entry.id;
    document.getElementById('entryDate').value = entry.date;
    document.getElementById('hoursSpent').value = entry.hours;
    document.getElementById('entryDescription').value = entry.description;
    document.getElementById('entryBilled').checked = entry.billed || false; // Atualiza o checkbox

    // Preenche e seleciona os dropdowns em cascata
    const projectSelect = document.getElementById('projectSelect');
    projectSelect.value = entry.projectId;
    projectSelect.dispatchEvent(new Event('change'));

    setTimeout(() => {
        const clientSelect = document.getElementById('clientSelect');
        clientSelect.value = entry.clientId;
        clientSelect.dispatchEvent(new Event('change'));

        setTimeout(() => {
            const taskSelect = document.getElementById('taskSelect');
            taskSelect.value = entry.taskId;
            taskSelect.dispatchEvent(new Event('change'));

            if(entry.subtaskId) {
                setTimeout(() => {
                    document.getElementById('subtaskSelect').value = entry.subtaskId;
                }, 100);
            }
        }, 100);
    }, 100);

    // Altera a UI do formulário
    document.getElementById('formHeader').textContent = 'Editando Lançamento';
    document.getElementById('submitBtn').textContent = 'Atualizar Apontamento';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('entry-card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('editingEntryId').value = '';
    document.getElementById('timeEntryForm').reset();
    document.getElementById('entryDate').valueAsDate = new Date();
    document.getElementById('formHeader').textContent = 'Novo Lançamento';
    document.getElementById('submitBtn').textContent = 'Adicionar Apontamento';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Limpa os selects para o estado inicial
    updateClientSelects('form', null);
    updateTaskSelects('form', null, null);
    updateSubtaskSelects('form', null);
}

// --- EVENT HANDLERS ---
function handleFormSubmit(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingEntryId').value;
    const formData = {
        date: document.getElementById('entryDate').value,
        projectId: document.getElementById('projectSelect').value,
        clientId: document.getElementById('clientSelect').value,
        taskId: document.getElementById('taskSelect').value,
        subtaskId: document.getElementById('subtaskSelect').value || null,
        hours: parseFloat(document.getElementById('hoursSpent').value),
        description: document.getElementById('entryDescription').value,
        billed: document.getElementById('entryBilled').checked, // Salva o status do checkbox
    };

    if (editingId) {
        // Modo de Atualização
        const entryIndex = timeEntries.findIndex(entry => entry.id === editingId);
        if (entryIndex > -1) {
            timeEntries[entryIndex] = { ...timeEntries[entryIndex], ...formData };
        }
    } else {
        // Modo de Criação
        const newEntry = {
            ...formData,
            id: generateId(),
            createdAt: Date.now()
        };
        timeEntries.push(newEntry);
    }
    
    saveData();
    renderTimeEntries();
    cancelEdit(); // Reseta o formulário para o estado de "Novo Lançamento"
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    populateProjectSelects();
    renderTimeEntries();
    
    document.getElementById('entryDate').valueAsDate = new Date();
    document.getElementById('timeEntryForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    // Listeners para os selects do formulário
    document.getElementById('projectSelect').addEventListener('change', (e) => updateClientSelects('form', e.target.value));
    document.getElementById('clientSelect').addEventListener('change', (e) => updateTaskSelects('form', document.getElementById('projectSelect').value, e.target.value));
    document.getElementById('taskSelect').addEventListener('change', (e) => updateSubtaskSelects('form', e.target.value));

    // Listeners para os filtros
    document.getElementById('filterDate').addEventListener('change', renderTimeEntries);
    document.getElementById('filterProject').addEventListener('change', (e) => { updateClientSelects('filter', e.target.value); updateTaskSelects('filter', null, null); updateSubtaskSelects('filter', null); renderTimeEntries(); });
    document.getElementById('filterClient').addEventListener('change', (e) => { updateTaskSelects('filter', document.getElementById('filterProject').value, e.target.value); updateSubtaskSelects('filter', null); renderTimeEntries(); });
    document.getElementById('filterTask').addEventListener('change', (e) => { updateSubtaskSelects('filter', e.target.value); renderTimeEntries(); });
    document.getElementById('filterSubtask').addEventListener('change', renderTimeEntries);
    document.getElementById('filterBilled').addEventListener('change', renderTimeEntries); // NOVO LISTENER

    // Listeners para os botões de visualização
    const detailedBtn = document.getElementById('viewDetailedBtn');
    const groupedBtn = document.getElementById('viewGroupedBtn');
    detailedBtn.addEventListener('click', () => { currentView = 'detailed'; detailedBtn.classList.add('active'); groupedBtn.classList.remove('active'); renderTimeEntries(); });
    groupedBtn.addEventListener('click', () => { currentView = 'grouped'; groupedBtn.classList.add('active'); detailedBtn.classList.remove('active'); renderTimeEntries(); });

    // Delegação de evento para ações na lista (Editar, Excluir e Marcar/Desmarcar)
    document.getElementById('timeEntriesList').addEventListener('click', (e) => {
        const target = e.target.closest('button[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'delete') {
            if (confirm('Tem certeza que deseja excluir este apontamento?')) {
                timeEntries = timeEntries.filter(entry => entry.id !== id);
                saveData();
                renderTimeEntries();
            }
        } else if (action === 'edit') {
            startEditEntry(id);
        } else if (action === 'toggleBilled') { // NOVA AÇÃO
            const entry = timeEntries.find(e => e.id === id);
            if (entry) {
                entry.billed = !entry.billed;
                saveData();
                renderTimeEntries();
            }
        }
    });
});