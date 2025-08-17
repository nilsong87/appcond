function initReservasPage() {
    loadReservasList();
    setupReservasForm();
    loadAreasComuns();
    
    // Set up filter events
    $('#filter-status').change(loadReservasList);
    $('#filter-date').change(loadReservasList);
    
    // Initialize date pickers
    $('#filter-date').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
    
    $('#data_reserva').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        startDate: new Date(),
        todayHighlight: true,
        language: 'pt-BR'
    });
}

function loadReservasList() {
    const status = $('#filter-status').val();
    const date = $('#filter-date').val();
    
    $('#reservas-list').html(`
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    let url = 'reservas?';
    if (status) url += `status=${status}&`;
    if (date) url += `date=${date}`;
    
    apiRequest(url).then(response => {
        if (response.data.length === 0) {
            $('#reservas-list').html(`
                <tr>
                    <td colspan="7" class="text-center py-4">
                        Nenhuma reserva encontrada
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(reserva => {
            html += `
                <tr>
                    <td>${reserva.id}</td>
                    <td>${reserva.area_comum.nome}</td>
                    <td>${reserva.morador.nome}</td>
                    <td>${formatDate(reserva.data_reserva)}</td>
                    <td>${reserva.hora_inicio} - ${reserva.hora_fim}</td>
                    <td><span class="badge bg-${getReservaStatusBadge(reserva.status)}">${reserva.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-reserva" data-id="${reserva.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${reserva.status === 'Pendente' ? `
                        <button class="btn btn-sm btn-outline-success pay-reserva" data-id="${reserva.id}">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        $('#reservas-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar reservas', 'danger');
        console.error(error);
    });
}

function loadAreasComuns() {
    apiRequest('areas-comuns').then(response => {
        let options = '<option value="">Selecione uma área</option>';
        response.data.forEach(area => {
            options += `<option value="${area.id}" data-valor="${area.valor_reserva}">${area.nome}</option>`;
        });
        
        $('#area_comum_id').html(options);
    }).catch(error => {
        showToast('Erro ao carregar áreas comuns', 'danger');
        console.error(error);
    });
}

function setupReservasForm() {
    // Form validation
    $('#reserva-form').validate({
        rules: {
            area_comum_id: 'required',
            data_reserva: 'required',
            hora_inicio: 'required',
            hora_fim: 'required',
            motivo: 'required'
        },
        messages: {
            area_comum_id: 'Por favor, selecione uma área comum',
            data_reserva: 'Por favor, informe a data da reserva',
            hora_inicio: 'Por favor, informe o horário de início',
            hora_fim: 'Por favor, informe o horário de término',
            motivo: 'Por favor, informe o motivo da reserva'
        },
        submitHandler: function(form) {
            registerReserva(form);
        }
    });
    
    // Update valor when area changes
    $('#area_comum_id').change(function() {
        const valor = $(this).find(':selected').data('valor');
        $('#valor_reserva').val(valor ? `R$ ${parseFloat(valor).toFixed(2)}` : 'R$ 0,00');
    });
    
    // Time validation
    $('#hora_fim').change(function() {
        const horaInicio = $('#hora_inicio').val();
        const horaFim = $(this).val();
        
        if (horaInicio && horaFim && horaFim <= horaInicio) {
            showToast('O horário de término deve ser após o horário de início', 'warning');
            $(this).val('');
        }
    });
}

function registerReserva(form) {
    const formData = $(form).serializeArray();
    const data = {};
    
    formData.forEach(item => {
        data[item.name] = item.value;
    });
    
    // Convert date to ISO format
    data.data_reserva = moment(data.data_reserva, 'DD/MM/YYYY').format('YYYY-MM-DD');
    
    $('#reserva-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Reservando...
    `);
    
    apiRequest('reservas', 'POST', data).then(response => {
        showToast('Reserva cadastrada com sucesso!', 'success');
        $(form).trigger('reset');
        loadReservasList();
        
        // Show payment options
        showPaymentOptions(response.data.id, response.data.valor_reserva);
    }).catch(error => {
        showToast('Erro ao cadastrar reserva', 'danger');
        console.error(error);
    }).finally(() => {
        $('#reserva-submit').prop('disabled', false).text('Reservar Área');
    });
}

function showPaymentOptions(reservaId, valor) {
    const content = `
        <div class="text-center">
            <h4 class="mb-4">Pagamento da Reserva #${reservaId}</h4>
            <p class="lead">Valor: <strong>R$ ${parseFloat(valor).toFixed(2)}</strong></p>
            
            <div class="row mt-4">
                <div class="col-md-6 mb-3">
                    <button class="btn btn-outline-primary btn-lg w-100 py-3 payment-method" data-method="pix">
                        <i class="fas fa-qrcode fa-2x mb-2"></i><br>
                        Pagar com PIX
                    </button>
                </div>
                <div class="col-md-6 mb-3">
                    <button class="btn btn-outline-success btn-lg w-100 py-3 payment-method" data-method="boleto">
                        <i class="fas fa-barcode fa-2x mb-2"></i><br>
                        Gerar Boleto
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showModal('Forma de Pagamento', content, 'modal-lg');
    
    $('.payment-method').click(function() {
        const method = $(this).data('method');
        processPayment(reservaId, method);
    });
}

function processPayment(reservaId, method) {
    apiRequest(`reservas/${reservaId}/pay`, 'POST', { method: method }).then(response => {
        if (method === 'pix') {
            showPixPayment(response.data);
        } else {
            showBoletoPayment(response.data);
        }
    }).catch(error => {
        showToast('Erro ao processar pagamento', 'danger');
        console.error(error);
    });
}

function showPixPayment(paymentData) {
    const content = `
        <div class="text-center">
            <h4 class="mb-4">Pagamento via PIX</h4>
            <p>Utilize o QR Code abaixo ou copie o código para pagamento</p>
            
            <div id="pix-qr-code" class="my-4"></div>
            
            <div class="input-group mb-3">
                <input type="text" class="form-control" id="pix-code" value="${paymentData.pix_code}" readonly>
                <button class="btn btn-outline-secondary" type="button" id="copy-pix-code">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            
            <p class="text-muted">Valor: <strong>R$ ${parseFloat(paymentData.amount).toFixed(2)}</strong></p>
            <p class="text-muted">Válido até: ${formatDateTime(paymentData.expires_at)}</p>
            
            <div class="alert alert-info mt-4">
                <i class="fas fa-info-circle"></i> Após o pagamento, o status da reserva será atualizado automaticamente.
            </div>
        </div>
    `;
    
    showModal('Pagamento via PIX', content);
    
    // Generate QR Code
    new QRCode(document.getElementById('pix-qr-code'), {
        text: paymentData.pix_code,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Copy to clipboard
    $('#copy-pix-code').click(function() {
        const pixCode = $('#pix-code');
        pixCode.select();
        document.execCommand('copy');
        showToast('Código PIX copiado!', 'success');
    });
}

function showBoletoPayment(paymentData) {
    const content = `
        <div class="text-center">
            <h4 class="mb-4">Boleto Bancário</h4>
            <p>O boleto foi gerado com sucesso. Clique no botão abaixo para visualizar ou imprimir.</p>
            
            <div class="my-4 py-3 border rounded bg-light">
                <p class="mb-1">Código de Barras:</p>
                <h5 class="text-monospace">${paymentData.barcode}</h5>
                <p class="mb-0">Valor: <strong>R$ ${parseFloat(paymentData.amount).toFixed(2)}</strong></p>
                <p class="mb-0">Vencimento: ${formatDate(paymentData.due_date)}</p>
            </div>
            
            <a href="${paymentData.pdf_url}" target="_blank" class="btn btn-primary">
                <i class="fas fa-file-pdf me-2"></i> Visualizar Boleto
            </a>
            
            <div class="alert alert-info mt-4">
                <i class="fas fa-info-circle"></i> Após o pagamento, pode levar até 2 dias úteis para a confirmação da reserva.
            </div>
        </div>
    `;
    
    showModal('Boleto Bancário', content);
}

function getReservaStatusBadge(status) {
    switch (status) {
        case 'Confirmada': return 'success';
        case 'Pendente': return 'warning';
        case 'Cancelada': return 'danger';
        case 'Em uso': return 'info';
        case 'Finalizada': return 'primary';
        default: return 'secondary';
    }
}

// Event delegation for dynamic elements
$(document).on('click', '.view-reserva', function() {
    const reservaId = $(this).data('id');
    viewReservaDetails(reservaId);
});

$(document).on('click', '.pay-reserva', function() {
    const reservaId = $(this).data('id');
    showPaymentOptions(reservaId, $(this).data('valor'));
});

function viewReservaDetails(reservaId) {
    apiRequest(`reservas/${reservaId}`).then(response => {
        const reserva = response.data;
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações da Reserva</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${reserva.id}</td>
                        </tr>
                        <tr>
                            <th>Área Comum</th>
                            <td>${reserva.area_comum.nome}</td>
                        </tr>
                        <tr>
                            <th>Morador</th>
                            <td>${reserva.morador.nome}</td>
                        </tr>
                        <tr>
                            <th>Data</th>
                            <td>${formatDate(reserva.data_reserva)}</td>
                        </tr>
                        <tr>
                            <th>Horário</th>
                            <td>${reserva.hora_inicio} - ${reserva.hora_fim}</td>
                        </tr>
                        <tr>
                            <th>Motivo</th>
                            <td>${reserva.motivo}</td>
                        </tr>
                        <tr>
                            <th>Valor</th>
                            <td>R$ ${parseFloat(reserva.valor_reserva).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td><span class="badge bg-${getReservaStatusBadge(reserva.status)}">${reserva.status}</span></td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>Pagamento</h5>
                    ${reserva.pagamento ? `
                        <table class="table table-bordered">
                            <tr>
                                <th>Método</th>
                                <td>${reserva.pagamento.metodo}</td>
                            </tr>
                            <tr>
                                <th>Status</th>
                                <td><span class="badge bg-${reserva.pagamento.status === 'Pago' ? 'success' : 'warning'}">${reserva.pagamento.status}</span></td>
                            </tr>
                            <tr>
                                <th>Data Pagamento</th>
                                <td>${reserva.pagamento.data_pagamento ? formatDateTime(reserva.pagamento.data_pagamento) : '---'}</td>
                            </tr>
                            <tr>
                                <th>Valor</th>
                                <td>R$ ${parseFloat(reserva.pagamento.valor).toFixed(2)}</td>
                            </tr>
                        </table>
                    ` : '<p class="text-muted">Nenhum pagamento registrado</p>'}
                    
                    ${reserva.status === 'Pendente' ? `
                    <div class="text-center mt-4">
                        <button class="btn btn-primary" id="pay-now-btn">
                            <i class="fas fa-money-bill-wave me-2"></i> Realizar Pagamento
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal(`Detalhes da Reserva #${reserva.id}`, content, 'modal-lg');
        
        if (reserva.status === 'Pendente') {
            $('#pay-now-btn').click(function() {
                showPaymentOptions(reserva.id, reserva.valor_reserva);
            });
        }
    }).catch(error => {
        showToast('Erro ao carregar detalhes da reserva', 'danger');
        console.error(error);
    });
}

function formatDateTime(dateString) {
    return moment(dateString).format('DD/MM/YYYY HH:mm');
}