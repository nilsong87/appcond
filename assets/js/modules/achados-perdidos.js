function initAchadosPerdidosPage() {
    loadAchadosPerdidosList();
    setupAchadosPerdidosForm();
    
    // Set up filter events
    $('#filter-status').change(loadAchadosPerdidosList);
    $('#filter-category').change(loadAchadosPerdidosList);
}

function loadAchadosPerdidosList() {
    const status = $('#filter-status').val();
    const category = $('#filter-category').val();
    
    $('#achados-perdidos-list').html(`
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    apiRequest(`achados-perdidos?status=${status}&category=${category}`).then(response => {
        if (response.data.length === 0) {
            $('#achados-perdidos-list').html(`
                <tr>
                    <td colspan="6" class="text-center py-4">
                        Nenhum item encontrado
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(item => {
            html += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.tipo === 'achado' ? 'Achado' : 'Perdido'}</td>
                    <td>${item.categoria}</td>
                    <td>${formatDate(item.data_registro)}</td>
                    <td><span class="badge bg-${getItemStatusBadge(item.status)}">${item.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-item" data-id="${item.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${item.status === 'Disponível' && item.tipo === 'achado' ? `
                        <button class="btn btn-sm btn-outline-success claim-item" data-id="${item.id}">
                            <i class="fas fa-hand-holding"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        $('#achados-perdidos-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar itens', 'danger');
        console.error(error);
    });
}

function setupAchadosPerdidosForm() {
    // Form validation
    $('#achados-perdidos-form').validate({
        rules: {
            tipo: 'required',
            categoria: 'required',
            descricao: 'required',
            local: 'required'
        },
        messages: {
            tipo: 'Por favor, selecione o tipo',
            categoria: 'Por favor, informe a categoria',
            descricao: 'Por favor, descreva o item',
            local: 'Por favor, informe o local'
        },
        submitHandler: function(form) {
            registerItem(form);
        }
    });
    
    // Initialize date picker
    $('#data_registro').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
    
    // Image upload preview
    $('#foto').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#foto-preview').attr('src', e.target.result).removeClass('d-none');
            }
            reader.readAsDataURL(file);
        }
    });
}

function registerItem(form) {
    const formData = new FormData(form);
    
    // Convert date to ISO format
    const dataRegistro = moment(formData.get('data_registro'), 'DD/MM/YYYY').format('YYYY-MM-DD');
    formData.set('data_registro', dataRegistro);
    
    $('#item-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Registrando...
    `);
    
    $.ajax({
        url: 'api/achados-perdidos',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('condapp_token')}`
        },
        success: function(response) {
            showToast('Item registrado com sucesso!', 'success');
            $(form).trigger('reset');
            $('#foto-preview').addClass('d-none');
            loadAchadosPerdidosList();
        },
        error: function(error) {
            showToast('Erro ao registrar item', 'danger');
            console.error(error);
        },
        complete: function() {
            $('#item-submit').prop('disabled', false).text('Registrar Item');
        }
    });
}

function claimItem(itemId) {
    const content = `
        <div class="mb-3">
            <label for="reivindicante_nome" class="form-label">Nome do Reivindicante</label>
            <input type="text" class="form-control" id="reivindicante_nome" required>
        </div>
        <div class="mb-3">
            <label for="reivindicante_contato" class="form-label">Contato</label>
            <input type="text" class="form-control" id="reivindicante_contato" required>
        </div>
        <div class="mb-3">
            <label for="reivindicacao_descricao" class="form-label">Descrição da Reivindicação</label>
            <textarea class="form-control" id="reivindicacao_descricao" rows="3" required></textarea>
        </div>
    `;
    
    showModal('Reivindicar Item', content);
    
    // Set up submit button
    $('#modal-container .modal-footer').append(`
        <button type="button" class="btn btn-primary" id="confirm-claim">Confirmar</button>
    `);
    
    $('#confirm-claim').click(function() {
        const nome = $('#reivindicante_nome').val();
        const contato = $('#reivindicante_contato').val();
        const descricao = $('#reivindicacao_descricao').val();
        
                if (!nome || !contato || !descricao) {
            showToast('Preencha todos os campos', 'warning');
            return;
        }
        
        const data = {
            reivindicante_nome: nome,
            reivindicante_contato: contato,
            reivindicacao_descricao: descricao,
            status: 'Reivindicado'
        };
        
        $(this).prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Processando...
        `);
        
        apiRequest(`achados-perdidos/${itemId}/claim`, 'PUT', data).then(response => {
            showToast('Reivindicação registrada com sucesso!', 'success');
            $('.modal').modal('hide');
            loadAchadosPerdidosList();
        }).catch(error => {
            showToast('Erro ao registrar reivindicação', 'danger');
            console.error(error);
        });
    });
}

function getItemStatusBadge(status) {
    switch (status) {
        case 'Disponível': return 'success';
        case 'Reivindicado': return 'warning';
        case 'Devolvido': return 'primary';
        case 'Perdido': return 'danger';
        default: return 'secondary';
    }
}

// Event delegation for dynamic elements
$(document).on('click', '.view-item', function() {
    const itemId = $(this).data('id');
    viewItemDetails(itemId);
});

$(document).on('click', '.claim-item', function() {
    const itemId = $(this).data('id');
    claimItem(itemId);
});

function viewItemDetails(itemId) {
    apiRequest(`achados-perdidos/${itemId}`).then(response => {
        const item = response.data;
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações do Item</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${item.id}</td>
                        </tr>
                        <tr>
                            <th>Tipo</th>
                            <td>${item.tipo === 'achado' ? 'Achado' : 'Perdido'}</td>
                        </tr>
                        <tr>
                            <th>Categoria</th>
                            <td>${item.categoria}</td>
                        </tr>
                        <tr>
                            <th>Data Registro</th>
                            <td>${formatDate(item.data_registro)}</td>
                        </tr>
                        <tr>
                            <th>Local</th>
                            <td>${item.local}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td><span class="badge bg-${getItemStatusBadge(item.status)}">${item.status}</span></td>
                        </tr>
                    </table>
                    
                    <h5 class="mt-4">Descrição</h5>
                    <div class="card">
                        <div class="card-body">
                            <p class="card-text">${item.descricao}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    ${item.foto ? `
                    <h5>Foto do Item</h5>
                    <div class="text-center">
                        <img src="${item.foto}" alt="Foto do item" class="img-fluid rounded mb-3" style="max-height: 300px;">
                    </div>
                    ` : '<p class="text-muted">Nenhuma foto disponível</p>'}
                    
                    ${item.reivindicante_nome ? `
                    <div class="mt-4">
                        <h5>Informações de Reivindicação</h5>
                        <table class="table table-bordered">
                            <tr>
                                <th>Reivindicante</th>
                                <td>${item.reivindicante_nome}</td>
                            </tr>
                            <tr>
                                <th>Contato</th>
                                <td>${item.reivindicante_contato}</td>
                            </tr>
                            <tr>
                                <th>Descrição</th>
                                <td>${item.reivindicacao_descricao}</td>
                            </tr>
                            <tr>
                                <th>Data Reivindicação</th>
                                <td>${item.data_reivindicacao ? formatDate(item.data_reivindicacao) : '---'}</td>
                            </tr>
                        </table>
                    </div>
                    ` : ''}
                    
                    ${item.status === 'Disponível' && item.tipo === 'achado' ? `
                    <div class="text-center mt-4">
                        <button class="btn btn-primary" id="claim-now-btn">
                            <i class="fas fa-hand-holding me-2"></i> Reivindicar Item
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal(`Detalhes do Item #${item.id}`, content, 'modal-lg');
        
        if (item.status === 'Disponível' && item.tipo === 'achado') {
            $('#claim-now-btn').click(function() {
                claimItem(item.id);
            });
        }
    }).catch(error => {
        showToast('Erro ao carregar detalhes do item', 'danger');
        console.error(error);
    });
}