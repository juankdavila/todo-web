// Variables globales
let currentTasks = [];
let editingTaskId = null;

// Elementos del DOM
const todoForm = document.getElementById('todo-form');
const todoList = document.getElementById('todo-list');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const noTasksMessage = document.getElementById('no-tasks');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const toast = document.getElementById('toast');
const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const pendingTasksElement = document.getElementById('pending-tasks');
const progressBarElement = document.getElementById('progress-bar');
const progressTextElement = document.getElementById('progress-text');
const categoryFilterSelect = document.getElementById('category-filter');
const sortOptionSelect = document.getElementById('sort-option');

// Evento que se ejecuta cuando el DOM se ha cargado
document.addEventListener('DOMContentLoaded', () => {
    // Cargar todas las tareas al inicio desde localStorage
    loadTasksFromLocalStorage();
    
    // Configurar listeners de eventos
    setupEventListeners();
    
    // Actualizar dashboard
    updateDashboard();
});

// Configuración de los listeners de eventos
function setupEventListeners() {
    // Envío del formulario para crear/editar tareas
    todoForm.addEventListener('submit', handleFormSubmit);
    
    // Botón de cancelar edición
    cancelBtn.addEventListener('click', resetForm);
    
    // Filtro y búsqueda
    searchInput.addEventListener('input', filterTasks);
    filterSelect.addEventListener('change', filterTasks);
    
    // Categoría y ordenamiento
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', filterTasks);
    }
    
    if (sortOptionSelect) {
        sortOptionSelect.addEventListener('change', sortTasks);
    }
    
    // Modal de eliminación
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        confirmDeleteBtn.dataset.taskId = '';
    });
    
    // Para el botón de limpiar completadas
    const clearCompletedBtn = document.querySelector('button[onclick="clearCompletedTasks()"]');
    if (clearCompletedBtn) {
        clearCompletedBtn.onclick = clearCompletedTasks;
    }
    
    // Para el botón de exportar
    const exportBtn = document.querySelector('button[onclick="exportTasks()"]');
    if (exportBtn) {
        exportBtn.onclick = exportTasks;
    }
}

// Cargar tareas desde localStorage
function loadTasksFromLocalStorage() {
    showLoading(true);
    
    try {
        const savedTasks = localStorage.getItem('tasks');
        
        if (savedTasks) {
            currentTasks = JSON.parse(savedTasks);
        } else {
            currentTasks = [];
        }
        
        renderTasks(currentTasks);
        showLoading(false);
    } catch (error) {
        console.error('Error al cargar las tareas:', error);
        showError(true);
        showLoading(false);
        showToast('Ha ocurrido un error al cargar las tareas', 'error');
    }
}

// Guardar tareas en localStorage
function saveTasksToLocalStorage() {
    try {
        localStorage.setItem('tasks', JSON.stringify(currentTasks));
    } catch (error) {
        console.error('Error al guardar las tareas:', error);
        showToast('Error al guardar las tareas', 'error');
    }
}

// Función para renderizar las tareas en la UI
function renderTasks(tasks) {
    if (tasks.length === 0) {
        noTasksMessage.classList.remove('hidden');
        todoList.innerHTML = '';
        return;
    }
    
    noTasksMessage.classList.add('hidden');
    todoList.innerHTML = '';
    
    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        todoList.appendChild(taskElement);
    });
    
    // Actualizar el dashboard cada vez que se renderizan las tareas
    updateDashboard();
}

// Crear elemento de tarea para el DOM
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'todo-item px-6 py-4 flex flex-col md:flex-row md:items-center justify-between fade-in';
    li.dataset.id = task.id;
    
    const taskDate = new Date(task.fechaCreacion).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Mostrar fecha límite si existe
    let deadlineHtml = '';
    if (task.fechaLimite) {
        const deadlineDate = new Date(task.fechaLimite).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        deadlineHtml = `<span class="deadline block mt-1 text-sm ${isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-600'}">
            Fecha límite: ${deadlineDate} ${isOverdue(task) ? '(Vencida)' : ''}
        </span>`;
    }
    
    // Mostrar categoría si existe
    let categoryHtml = '';
    if (task.categoria && task.categoria !== 'none') {
        const categoryClasses = getCategoryClasses(task.categoria);
        categoryHtml = `<span class="category inline-block text-xs px-2 py-1 rounded-full mt-1 ${categoryClasses}">${getCategoryName(task.categoria)}</span>`;
    }
    
    const taskContent = document.createElement('div');
    taskContent.className = 'flex-1';
    
    const taskTitle = document.createElement('h3');
    taskTitle.className = `text-lg font-medium ${task.estaCompleto ? 'task-completed line-through text-gray-500' : ''}`;
    taskTitle.textContent = task.nombre;
    
    const taskDescription = document.createElement('p');
    taskDescription.className = 'text-gray-600 mt-1';
    taskDescription.textContent = task.descripcion || 'Sin descripción';
    
    const taskDateElement = document.createElement('span');
    taskDateElement.className = 'date-created block mt-1 text-sm text-gray-600';
    taskDateElement.textContent = `Creada: ${taskDate}`;
    
    taskContent.appendChild(taskTitle);
    taskContent.appendChild(taskDescription);
    taskContent.appendChild(taskDateElement);
    
    if (deadlineHtml) {
        const deadlineElement = document.createElement('div');
        deadlineElement.innerHTML = deadlineHtml;
        taskContent.appendChild(deadlineElement.firstChild);
    }
    
    if (categoryHtml) {
        const categoryElement = document.createElement('div');
        categoryElement.innerHTML = categoryHtml;
        taskContent.appendChild(categoryElement.firstChild);
    }
    
    const taskActions = document.createElement('div');
    taskActions.className = 'flex items-center mt-3 md:mt-0 space-x-2 todo-actions';
    
    // Checkbox para completar/descompletar
    const completeContainer = document.createElement('div');
    completeContainer.className = 'flex items-center';
    
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.className = 'form-checkbox h-5 w-5 text-blue-600';
    completeCheckbox.checked = task.estaCompleto;
    completeCheckbox.addEventListener('change', () => toggleTaskStatus(task.id, completeCheckbox.checked));
    
    const completeLabel = document.createElement('span');
    completeLabel.className = 'ml-2 text-sm text-gray-700';
    completeLabel.textContent = task.estaCompleto ? 'Completada' : 'Pendiente';
    
    completeContainer.appendChild(completeCheckbox);
    completeContainer.appendChild(completeLabel);
    
    // Botones de editar y eliminar
    const editButton = document.createElement('button');
    editButton.className = 'btn-action bg-yellow-500 text-white p-2 rounded-md hover:bg-yellow-600';
    editButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>';
    editButton.addEventListener('click', () => editTask(task));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-action bg-red-500 text-white p-2 rounded-md hover:bg-red-600';
    deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
    deleteButton.addEventListener('click', () => openDeleteModal(task.id));
    
    taskActions.appendChild(completeContainer);
    taskActions.appendChild(editButton);
    taskActions.appendChild(deleteButton);
    
    li.appendChild(taskContent);
    li.appendChild(taskActions);
    
    return li;
}

// Función para manejar el envío del formulario (crear o editar)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('todo-id').value;
    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const estaCompleto = document.getElementById('estaCompleto').checked;
    const fechaLimite = document.getElementById('fecha-limite').value;
    const categoria = document.getElementById('category').value;
    
    const task = {
        nombre,
        descripcion,
        estaCompleto,
        categoria
    };
    
    if (fechaLimite) {
        task.fechaLimite = fechaLimite;
    }
    
    if (taskId) {
        // Actualizando una tarea existente
        updateTask(taskId, task);
    } else {
        // Creando una nueva tarea
        createTask(task);
    }
    
    resetForm();
}

// Función para crear una nueva tarea
function createTask(task) {
    // Agregar la fecha de creación actual e ID único
    task.fechaCreacion = new Date().toISOString();
    task.id = Date.now().toString();
    
    // Añadir la tarea al array
    currentTasks.push(task);
    
    // Guardar en localStorage
    saveTasksToLocalStorage();
    
    // Renderizar tareas
    renderTasks(currentTasks);
    showToast('Tarea creada con éxito', 'success');
}

// Función para actualizar una tarea existente
function updateTask(id, updatedTask) {
    // Encontrar la tarea en el array local
    const taskIndex = currentTasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
        // Preservar la fecha de creación original
        updatedTask.fechaCreacion = currentTasks[taskIndex].fechaCreacion;
        updatedTask.id = id;
        
        // Actualizar la tarea
        currentTasks[taskIndex] = updatedTask;
        
        // Guardar en localStorage
        saveTasksToLocalStorage();
        
        // Renderizar tareas
        renderTasks(currentTasks);
        showToast('Tarea actualizada con éxito', 'success');
    }
}

// Función para cambiar el estado de una tarea (completada/pendiente)
function toggleTaskStatus(id, isCompleted) {
    const taskIndex = currentTasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return;
    
    // Actualizar el estado en el array local
    currentTasks[taskIndex].estaCompleto = isCompleted;
    
    // Guardar en localStorage
    saveTasksToLocalStorage();
    
    // Renderizar tareas
    renderTasks(currentTasks);
    
    showToast(`Tarea marcada como ${isCompleted ? 'completada' : 'pendiente'}`, 'info');
}

// Función para preparar la edición de una tarea
function editTask(task) {
    editingTaskId = task.id;
    document.getElementById('todo-id').value = task.id;
    document.getElementById('nombre').value = task.nombre;
    document.getElementById('descripcion').value = task.descripcion || '';
    document.getElementById('estaCompleto').checked = task.estaCompleto;
    
    // Si hay fecha límite, establecerla
    if (task.fechaLimite) {
        document.getElementById('fecha-limite').value = task.fechaLimite;
    } else {
        document.getElementById('fecha-limite').value = '';
    }
    
    // Si hay categoría, establecerla
    if (task.categoria) {
        document.getElementById('category').value = task.categoria;
    } else {
        document.getElementById('category').value = 'none';
    }
    
    formTitle.textContent = 'Editar Tarea';
    cancelBtn.classList.remove('hidden');
    
    // Hacer scroll hasta el formulario
    todoForm.scrollIntoView({ behavior: 'smooth' });
}

// Función para abrir el modal de confirmación de eliminación
function openDeleteModal(taskId) {
    confirmDeleteBtn.dataset.taskId = taskId;
    deleteModal.classList.remove('hidden');
}

// Función para confirmar la eliminación de una tarea
function confirmDelete() {
    const taskId = confirmDeleteBtn.dataset.taskId;
    
    if (!taskId) {
        deleteModal.classList.add('hidden');
        return;
    }
    
    // Eliminar la tarea del array local
    currentTasks = currentTasks.filter(task => task.id !== taskId);
    
    // Guardar en localStorage
    saveTasksToLocalStorage();
    
    // Renderizar tareas
    renderTasks(currentTasks);
    
    deleteModal.classList.add('hidden');
    showToast('Tarea eliminada con éxito', 'success');
}

// Función para filtrar tareas según búsqueda y estado
function filterTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;
    let categoryFilter = 'all';
    
    // Verificar si existe el elemento de filtro de categoría
    if (categoryFilterSelect) {
        categoryFilter = categoryFilterSelect.value;
    }
    
    let filteredTasks = currentTasks;
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => 
            task.nombre.toLowerCase().includes(searchTerm) || 
            (task.descripcion && task.descripcion.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtrar por estado
    if (filterValue === 'pending') {
        filteredTasks = filteredTasks.filter(task => !task.estaCompleto);
    } else if (filterValue === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.estaCompleto);
    }
    
    // Filtrar por categoría
    if (categoryFilter && categoryFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => {
            if (categoryFilter === 'none') {
                return !task.categoria || task.categoria === 'none';
            }
            return task.categoria === categoryFilter;
        });
    }
    
    renderTasks(filteredTasks);
}

// Función para ordenar tareas
function sortTasks() {
    if (!sortOptionSelect) return;
    
    const sortValue = sortOptionSelect.value;
    let sortedTasks = [...currentTasks];
    
    switch (sortValue) {
        case 'date-desc':
            sortedTasks.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
            break;
        case 'date-asc':
            sortedTasks.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
            break;
        case 'alpha-asc':
            sortedTasks.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'alpha-desc':
            sortedTasks.sort((a, b) => b.nombre.localeCompare(a.nombre));
            break;
        case 'deadline':
            // Ordenar por fecha límite (tareas sin fecha límite al final)
            sortedTasks.sort((a, b) => {
                if (!a.fechaLimite && !b.fechaLimite) return 0;
                if (!a.fechaLimite) return 1;
                if (!b.fechaLimite) return -1;
                return new Date(a.fechaLimite) - new Date(b.fechaLimite);
            });
            break;
    }
    
    renderTasks(sortedTasks);
}

// Función para limpiar tareas completadas
function clearCompletedTasks() {
    // Confirmar antes de limpiar
    if (confirm('¿Estás seguro de eliminar todas las tareas completadas?')) {
        // Filtrar para mantener solo las tareas pendientes
        currentTasks = currentTasks.filter(task => !task.estaCompleto);
        
        // Guardar en localStorage
        saveTasksToLocalStorage();
        
        // Renderizar tareas
        renderTasks(currentTasks);
        showToast('Tareas completadas eliminadas', 'success');
    }
}

// Función para exportar tareas
function exportTasks() {
    // Crear un objeto de datos para exportar
    const exportData = {
        tareas: currentTasks,
        exportadoEl: new Date().toISOString(),
        total: currentTasks.length
    };
    
    // Convertir a JSON
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // Crear un enlace de descarga
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mis-tareas.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showToast('Tareas exportadas correctamente', 'success');
}

// Función para verificar si una tarea está vencida
function isOverdue(task) {
    if (!task.fechaLimite || task.estaCompleto) return false;
    
    const deadline = new Date(task.fechaLimite);
    const today = new Date();
    
    // Comparar solo las fechas (sin hora)
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    
    return deadline < today;
}

// Función para obtener el nombre de la categoría
function getCategoryName(categoryValue) {
    const categories = {
        'trabajo': 'Trabajo',
        'personal': 'Personal',
        'estudio': 'Estudio',
        'salud': 'Salud',
        'finanzas': 'Finanzas',
        'hogar': 'Hogar',
        'none': 'Sin categoría'
    };
    
    return categories[categoryValue] || categoryValue;
}

// Función para obtener las clases de estilo según la categoría
function getCategoryClasses(categoryValue) {
    const categoryClasses = {
        'trabajo': 'bg-blue-100 text-blue-800',
        'personal': 'bg-purple-100 text-purple-800',
        'estudio': 'bg-green-100 text-green-800',
        'salud': 'bg-red-100 text-red-800',
        'finanzas': 'bg-yellow-100 text-yellow-800',
        'hogar': 'bg-indigo-100 text-indigo-800'
    };
    
    return categoryClasses[categoryValue] || 'bg-gray-100 text-gray-800';
}

// Función para actualizar el dashboard
function updateDashboard() {
    const totalTasks = currentTasks.length;
    const completedTasks = currentTasks.filter(task => task.estaCompleto).length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = currentTasks.filter(task => isOverdue(task)).length;
    
    // Actualizar contador de tareas
    if (totalTasksElement) totalTasksElement.textContent = totalTasks;
    if (completedTasksElement) completedTasksElement.textContent = completedTasks;
    if (pendingTasksElement) pendingTasksElement.textContent = pendingTasks;
    
    const overdueElement = document.getElementById('overdue-tasks');
    if (overdueElement) overdueElement.textContent = overdueTasks;
    
    // Calcular y actualizar barra de progreso
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    if (progressBarElement) {
        progressBarElement.style.width = `${progressPercentage}%`;
    }
    
    if (progressTextElement) {
        progressTextElement.textContent = `${progressPercentage}%`;
    }
}

// Función para reiniciar el formulario
function resetForm() {
    todoForm.reset();
    document.getElementById('todo-id').value = '';
    formTitle.textContent = 'Añadir Nueva Tarea';
    cancelBtn.classList.add('hidden');
    editingTaskId = null;
}

// Función para mostrar/ocultar el indicador de carga
function showLoading(show) {
    if (show) {
        loadingElement.classList.remove('hidden');
        todoList.classList.add('hidden');
        errorMessage.classList.add('hidden');
    } else {
        loadingElement.classList.add('hidden');
        todoList.classList.remove('hidden');
    }
}

// Función para mostrar/ocultar mensaje de error
function showError(show) {
    if (show) {
        errorMessage.classList.remove('hidden');
        todoList.classList.add('hidden');
    } else {
        errorMessage.classList.add('hidden');
    }
}

// Función para mostrar notificaciones tipo toast
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md text-white transform translate-y-10 opacity-0 transition-all duration-300 z-50 toast-${type}`;
    
    // Aplicar estilos según el tipo
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-600');
            break;
        case 'error':
            toast.classList.add('bg-red-600');
            break;
        case 'info':
            toast.classList.add('bg-blue-600');
            break;
        default:
            toast.classList.add('bg-gray-700');
    }
    
    // Mostrar el toast
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 100);
    
    // Ocultar el toast después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('toast-show');
    }, 3000);
}