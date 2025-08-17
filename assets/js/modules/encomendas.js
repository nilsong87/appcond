function initEncomendasPage() {
    // Initialize encomendas page
    loadEncomendasList();
    setupEncomendasForm();
    
    // Set up filter events
    $('#filter-status').change(loadEncomendasList);
    $('#search-encomendas').keyup(debounce(loadEncomendasList, 300));
}

function loadEncomendasList() {
    const status = $('#filter-status').val();
    const search = $('#search-encomendas').val();
    
    $('#encomendas-list').html(`
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    apiRequest(`encomendas?status=${status}&search=${search}`).then(response => {
        if (response.data.length === 0) {
            $('#encomendas-list').html(`
                <tr>
                    <td colspan="6" class="text-center py-4">
                        Nenhuma encomenda encontrada
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(encomenda => {
            html += `
                <tr>
                    <td>${encomenda.id}</td>
                    <td>${encomenda.responsavel}</td>
                    <td>${encomenda.destinatario}</td>
                    <td>${formatDate(encomenda.data_entrada)}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(encomenda.status)}">${encomenda.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-encomenda" data-id="${encomenda.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${encomenda.status === 'Pendente' ? `
                        <button class="btn btn-sm btn-outline-success notify-encomenda" data-id="${encomenda.id}">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        $('#encomendas-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar encomendas', 'danger');
        console.error(error);
    });
}

function setupEncomendasForm() {
    // Form validation
    $('#encomenda-form').validate({
        rules: {
            destinatario: 'required',
            responsavel: 'required',
            descricao: 'required'
        },
        messages: {
            destinatario: 'Por favor, informe o destinatário',
            responsavel: 'Por favor, informe o responsável',
            descricao: 'Por favor, informe a descrição'
        },
        submitHandler: function(form) {
            registerEncomenda(form);
        }
    });
    
    // QR Code generation
    $('#generate-qr').click(function() {
        const destinatario = $('#destinatario').val();
        const responsavel = $('#responsavel').val();
        const descricao = $('#descricao').val();
        
        if (!destinatario || !responsavel || !descricao) {
            showToast('Preencha todos os campos antes de gerar o QR Code', 'warning');
            return;
        }
        
        const qrData = JSON.stringify({
            destinatario: destinatario,
            responsavel: responsavel,
            descricao: descricao,
            date: new Date().toISOString()
        });
        
        $('#qr-code-container').empty();
        new QRCode(document.getElementById('qr-code-container'), {
            text: qrData,
            width: 200,
            height: 200,
            colorDark: '#4361ee',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        $('#qr-code-modal').modal('show');
    });
}

function registerEncomenda(form) {
    const formData = $(form).serializeArray();
    const data = {};
    
    formData.forEach(item => {
        data[item.name] = item.value;
    });
    
    $('#encomenda-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Cadastrando...
    `);
    
    apiRequest('encomendas', 'POST', data).then(response => {
        showToast('Encomenda cadastrada com sucesso!', 'success');
        $(form).trigger('reset');
        $('#qr-code-container').empty();
        loadEncomendasList();
    }).catch(error => {
        showToast('Erro ao cadastrar encomenda', 'danger');
        console.error(error);
    }).finally(() => {
        $('#encomenda-submit').prop('disabled', false).text('Cadastrar Encomenda');
    });
}

function notifyEncomendaWhatsApp(encomendaId) {
    apiRequest(`encomendas/${encomendaId}/notify`, 'POST').then(response => {
        showToast('Notificação enviada via WhatsApp', 'success');
        loadEncomendasList();
    }).catch(error => {
        showToast('Erro ao enviar notificação', 'danger');
        console.error(error);
    });
}

// Helper functions
function formatDate(dateString) {
    return moment(dateString).format('DD/MM/YYYY HH:mm');
}

function getStatusBadgeColor(status) {
    switch (status) {
        case 'Entregue': return 'success';
        case 'Pendente': return 'warning';
        case 'Cancelado': return 'danger';
        default: return 'info';
    }
}

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Event delegation for dynamic elements
$(document).on('click', '.view-encomenda', function() {
    const encomendaId = $(this).data('id');
    viewEncomendaDetails(encomendaId);
});

$(document).on('click', '.notify-encomenda', function() {
    const encomendaId = $(this).data('id');
    notifyEncomendaWhatsApp(encomendaId);
});

function viewEncomendaDetails(encomendaId) {
    apiRequest(`encomendas/${encomendaId}`).then(response => {
        const encomenda = response.data;
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações da Encomenda</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${encomenda.id}</td>
                        </tr>
                        <tr>
                            <th>Destinatário</th>
                            <td>${encomenda.destinatario}</td>
                        </tr>
                        <tr>
                            <th>Responsável</th>
                            <td>${encomenda.responsavel}</td>
                        </tr>
                        <tr>
                            <th>Descrição</th>
                            <td>${encomenda.descricao}</td>
                        </tr>
                        <tr>
                            <th>Data de Entrada</th>
                            <td>${formatDate(encomenda.data_entrada)}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td><span class="badge bg-${getStatusBadgeColor(encomenda.status)}">${encomenda.status}</span></td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>QR Code de Identificação</h5>
                    <div id="detail-qr-code" class="text-center my-3"></div>
                    <div class="text-center">
                        <button class="btn btn-primary print-qr" data-id="${encomenda.id}">
                            <i class="fas fa-print me-2"></i>Imprimir QR Code
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        showModal(`Detalhes da Encomenda #${encomenda.id}`, content, 'modal-lg');
        
        // Generate QR Code for details
        new QRCode(document.getElementById('detail-qr-code'), {
            text: JSON.stringify({
                id: encomenda.id,
                destinatario: encomenda.destinatario,
                responsavel: encomenda.responsavel
            }),
            width: 180,
            height: 180,
            colorDark: '#4361ee',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }).catch(error => {
        showToast('Erro ao carregar detalhes da encomenda', 'danger');
        console.error(error);
    });
}