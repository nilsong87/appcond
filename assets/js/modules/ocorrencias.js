function initOcorrenciasPage() {
    loadOcorrenciasList();
    setupOcorrenciasForm();
    
    // Set up filter events
    $('#filter-status').change(loadOcorrenciasList);
    $('#filter-type').change(loadOcorrenciasList);
}

function loadOcorrenciasList() {
    const status = $('#filter-status').val();
    const type = $('#filter-type').val();
    
    $('#ocorrencias-list').html(`
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    apiRequest(`ocorrencias?status=${status}&type=${type}`).then(response => {
        if (response.data.length === 0) {
            $('#ocorrencias-list').html(`
                <tr>
                    <td colspan="6" class="text-center py-4">
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
                    <td><span class="badge bg-${getOcorrenciaStatusBadge(ocorrencia.status)}">${ocorrencia.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-ocorrencia" data-id="${ocorrencia.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${ocorrencia.status === 'Aberta' ? `
                        <button class="btn btn-sm btn-outline-success resolve-ocorrencia" data-id="${ocorrencia.id}">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
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

function setupOcorrenciasForm() {
    // Form validation
    $('#ocorrencia-form').validate({
        rules: {
            tipo: 'required',
            descricao: 'required',
            local: 'required'
        },
        messages: {
            tipo: 'Por favor, selecione o tipo de ocorrência',
            descricao: 'Por favor, descreva a ocorrência',
            local: 'Por favor, informe o local da ocorrência'
        },
        submitHandler: function(form) {
            registerOcorrencia(form);
        }
    });
    
    // Initialize date picker
    $('#data_ocorrencia').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
}

function registerOcorrencia(form) {
    const formData = $(form).serializeArray();
    const data = {};
    
    formData.forEach(item => {
        data[item.name] = item.value;
    });
    
    // Convert date to ISO format
    data.data_ocorrencia = moment(data.data_ocorrencia, 'DD/MM/YYYY').format('YYYY-MM-DD');
    
    $('#ocorrencia-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Registrando...
    `);
    
    apiRequest('ocorrencias', 'POST', data).then(response => {
        showToast('Ocorrência registrada com sucesso!', 'success');
        $(form).trigger('reset');
        loadOcorrenciasList();
    }).catch(error => {
        showToast('Erro ao registrar ocorrência', 'danger');
        console.error(error);
    }).finally(() => {
        $('#ocorrencia-submit').prop('disabled', false).text('Registrar Ocorrência');
    });
}

function resolveOcorrencia(ocorrenciaId) {
    const content = `
        <div class="mb-3">
            <label for="solucao" class="form-label">Solução/Resolução</label>
            <textarea class="form-control" id="solucao" rows="3" required></textarea>
        </div>
        <div class="mb-3">
            <label for="data_resolucao" class="form-label">Data de Resolução</label>
            <input type="text" class="form-control datepicker" id="data_resolucao" required>
        </div>
    `;
    
    showModal('Resolver Ocorrência', content);
    
    // Initialize date picker
    $('#data_resolucao').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
    
    // Set up submit button
    $('#modal-container .modal-footer').append(`
        <button type="button" class="btn btn-primary" id="confirm-resolve">Confirmar Resolução</button>
    `);
    
    $('#confirm-resolve').click(function() {
        const solucao = $('#solucao').val();
        const data_resolucao = $('#data_resolucao').val();
        
        if (!solucao || !data_resolucao) {
            showToast('Preencha todos os campos', 'warning');
            return;
        }
        
        const data = {
            solucao: solucao,
            data_resolucao: moment(data_resolucao, 'DD/MM/YYYY').format('YYYY-MM-DD'),
            status: 'Resolvida'
        };
        
        $(this).prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Processando...
        `);
        
        apiRequest(`ocorrencias/${ocorrenciaId}/resolve`, 'PUT', data).then(response => {
            showToast('Ocorrência resolvida com sucesso!', 'success');
            $('.modal').modal('hide');
            loadOcorrenciasList();
        }).catch(error => {
            showToast('Erro ao resolver ocorrência', 'danger');
            console.error(error);
        });
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

// Event delegation for dynamic elements
$(document).on('click', '.view-ocorrencia', function() {
    const ocorrenciaId = $(this).data('id');
    viewOcorrenciaDetails(ocorrenciaId);
});

$(document).on('click', '.resolve-ocorrencia', function() {
    const ocorrenciaId = $(this).data('id');
    resolveOcorrencia(ocorrenciaId);
});

function viewOcorrenciaDetails(ocorrenciaId) {
    apiRequest(`ocorrencias/${ocorrenciaId}`).then(response => {
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
            
            ${ocorrencia.status === 'Aberta' ? `
            <div class="text-center mt-4">
                <button class="btn btn-primary" id="resolve-now-btn">
                    <i class="fas fa-check me-2"></i> Registrar Resolução
                </button>
            </div>
            ` : ''}
        `;
        
        showModal(`Detalhes da Ocorrência #${ocorrencia.id}`, content, 'modal-lg');
        
        if (ocorrencia.status === 'Aberta') {
            $('#resolve-now-btn').click(function() {
                resolveOcorrencia(ocorrencia.id);
            });
        }
    }).catch(error => {
        showToast('Erro ao carregar detalhes da ocorrência', 'danger');
        console.error(error);
    });
}