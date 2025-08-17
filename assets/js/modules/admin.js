function initDashboardPage() {
    loadDashboardStats();
    loadRecentActivities();
    setupDashboardCharts();
}

function loadDashboardStats() {
    apiRequest('dashboard/stats').then(response => {
        const stats = response.data;
        
        $('#total-moradores').text(stats.total_moradores);
        $('#total-visitantes').text(stats.total_visitantes);
        $('#total-encomendas').text(stats.total_encomendas);
        $('#total-ocorrencias').text(stats.total_ocorrencias);
    }).catch(error => {
        showToast('Erro ao carregar estatísticas', 'danger');
        console.error(error);
    });
}

function loadRecentActivities() {
    apiRequest('dashboard/activities').then(response => {
        const activities = response.data;
        let html = '';
        
        if (activities.length === 0) {
            html = '<div class="text-center py-3 text-muted">Nenhuma atividade recente</div>';
        } else {
            activities.forEach(activity => {
                html += `
                    <div class="activity-item mb-3">
                        <div class="d-flex justify-content-between">
                            <strong>${activity.tipo}</strong>
                            <small class="text-muted">${formatDateTime(activity.data)}</small>
                        </div>
                        <div>${activity.descricao}</div>
                        <small class="text-muted">Por: ${activity.usuario}</small>
                    </div>
                `;
            });
        }
        
        $('#recent-activities').html(html);
    }).catch(error => {
        showToast('Erro ao carregar atividades recentes', 'danger');
        console.error(error);
    });
}

function setupDashboardCharts() {
    // Encomendas chart
    apiRequest('dashboard/encomendas-chart').then(response => {
        const data = response.data;
        
        const ctx = document.getElementById('encomendas-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Encomendas',
                    data: data.values,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }).catch(error => {
        console.error('Erro ao carregar gráfico de encomendas:', error);
    });
    
    // Ocorrências chart
    apiRequest('dashboard/ocorrencias-chart').then(response => {
        const data = response.data;
        
        const ctx = document.getElementById('ocorrencias-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    }).catch(error => {
        console.error('Erro ao carregar gráfico de ocorrências:', error);
    });
}

function initAdminOcorrenciasPage() {
    loadOcorrenciasList();
    setupOcorrenciasFilters();
}

function setupOcorrenciasFilters() {
    // Initialize date range picker
    $('#date-range').daterangepicker({
        locale: {
            format: 'DD/MM/YYYY',
            applyLabel: 'Aplicar',
            cancelLabel: 'Cancelar',
            daysOfWeek: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        }
    });
    
    // Filter button
    $('#filter-ocorrencias').click(function() {
        loadOcorrenciasList();
    });
}

function loadOcorrenciasList() {
    const dateRange = $('#date-range').val();
    const status = $('#filter-status').val();
    const tipo = $('#filter-tipo').val();
    
    $('#ocorrencias-list').html(`
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    let params = `status=${status}&tipo=${tipo}`;
    if (dateRange) {
        const dates = dateRange.split(' - ');
        params += `&data_inicio=${moment(dates[0], 'DD/MM/YYYY').format('YYYY-MM-DD')}&data_fim=${moment(dates[1], 'DD/MM/YYYY').format('YYYY-MM-DD')}`;
    }
    
    apiRequest(`admin/ocorrencias?${params}`).then(response => {
        if (response.data.length === 0) {
            $('#ocorrencias-list').html(`
                <tr>
                    <td colspan="7" class="text-center py-4">
                        Nenhuma ocorrência encontrada
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(ocorrencia => {
            html += `
                <tr>
                    <td>${ocorrencia.id}</td>
                    <td>${ocorrencia.tipo}</td>
                    <td>${ocorrencia.morador.nome}</td>
                    <td>${formatDate(ocorrencia.data_ocorrencia)}</td>
                    <td>${ocorrencia.local}</td>
                    <td><span class="badge bg-${getOcorrenciaStatusBadge(ocorrencia.status)}">${ocorrencia.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-ocorrencia" data-id="${ocorrencia.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary edit-ocorrencia" data-id="${ocorrencia.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        $('#ocorrencias-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar ocorrências', 'danger');
        console.error(error);
    });
}

function getOcorrenciaStatusBadge(status) {
    switch (status) {
        case 'Resolvida': return 'success';
        case 'Aberta': return 'warning';
        case 'Cancelada': return 'danger';
        case 'Em andamento': return 'info';
        default: return 'secondary';
    }
}

// Event delegation for admin pages
$(document).on('click', '.view-ocorrencia', function() {
    const ocorrenciaId = $(this).data('id');
    viewOcorrenciaDetails(ocorrenciaId);
});

$(document).on('click', '.edit-ocorrencia', function() {
    const ocorrenciaId = $(this).data('id');
    editOcorrencia(ocorrenciaId);
});

function viewOcorrenciaDetails(ocorrenciaId) {
    apiRequest(`admin/ocorrencias/${ocorrenciaId}`).then(response => {
        const ocorrencia = response.data;
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações da Ocorrência</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${ocorrencia.id}</td>
                        </tr>
                        <tr>
                            <th>Tipo</th>
                            <td>${ocorrencia.tipo}</td>
                        </tr>
                        <tr>
                            <th>Morador</th>
                            <td>${ocorrencia.morador.nome}</td>
                        </tr>
                        <tr>
                            <th>Data</th>
                            <td>${formatDate(ocorrencia.data_ocorrencia)}</td>
                        </tr>
                        <tr>
                            <th>Local</th>
                            <td>${ocorrencia.local}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td><span class="badge bg-${getOcorrenciaStatusBadge(ocorrencia.status)}">${ocorrencia.status}</span></td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>Detalhes</h5>
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">Descrição</h6>
                            <p class="card-text">${ocorrencia.descricao}</p>
                        </div>
                    </div>
                    
                    ${ocorrencia.solucao ? `
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">Solução</h6>
                            <p class="card-text">${ocorrencia.solucao}</p>
                            <small class="text-muted">Resolvido em: ${formatDate(ocorrencia.data_resolucao)}</small>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal(`Detalhes da Ocorrência #${ocorrencia.id}`, content, 'modal-lg');
    }).catch(error => {
        showToast('Erro ao carregar detalhes da ocorrência', 'danger');
        console.error(error);
    });
}

function editOcorrencia(ocorrenciaId) {
    apiRequest(`admin/ocorrencias/${ocorrenciaId}`).then(response => {
        const ocorrencia = response.data;
        
        const content = `
            <form id="edit-ocorrencia-form">
                <input type="hidden" name="id" value="${ocorrencia.id}">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Tipo</label>
                            <input type="text" class="form-control" value="${ocorrencia.tipo}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Morador</label>
                            <input type="text" class="form-control" value="${ocorrencia.morador.nome}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Data</label>
                            <input type="text" class="form-control" value="${formatDate(ocorrencia.data_ocorrencia)}" readonly>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status" name="status" required>
                                <option value="Aberta" ${ocorrencia.status === 'Aberta' ? 'selected' : ''}>Aberta</option>
                                <option value="Em andamento" ${ocorrencia.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                                <option value="Resolvida" ${ocorrencia.status === 'Resolvida' ? 'selected' : ''}>Resolvida</option>
                                <option value="Cancelada" ${ocorrencia.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="solucao" class="form-label">Solução/Resolução</label>
                    <textarea class="form-control" id="solucao" name="solucao" rows="3">${ocorrencia.solucao || ''}</textarea>
                </div>
                ${ocorrencia.status === 'Resolvida' ? `
                <div class="mb-3">
                    <label class="form-label">Data de Resolução</label>
                    <input type="text" class="form-control" value="${formatDate(ocorrencia.data_resolucao)}" readonly>
                </div>
                ` : ''}
            </form>
        `;
        
        showModal(`Editar Ocorrência #${ocorrencia.id}`, content, 'modal-lg');
        
        // Set up submit button
        $('#modal-container .modal-footer').append(`
            <button type="button" class="btn btn-primary" id="save-ocorrencia">Salvar Alterações</button>
        `);
        
        $('#save-ocorrencia').click(function() {
            const formData = $('#edit-ocorrencia-form').serializeArray();
            const data = {};
            
            formData.forEach(item => {
                data[item.name] = item.value;
            });
            
            $(this).prop('disabled', true).html(`
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Salvando...
            `);
            
            apiRequest(`admin/ocorrencias/${ocorrenciaId}`, 'PUT', data).then(response => {
                showToast('Ocorrência atualizada com sucesso!', 'success');
                $('.modal').modal('hide');
                loadOcorrenciasList();
            }).catch(error => {
                showToast('Erro ao atualizar ocorrência', 'danger');
                console.error(error);
            });
        });
    }).catch(error => {
        showToast('Erro ao carregar dados da ocorrência', 'danger');
        console.error(error);
    });
}