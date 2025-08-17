function initVisitantesPage() {
    loadVisitantesList();
    setupVisitantesForm();
    
    // Set up filter events
    $('#filter-date').change(loadVisitantesList);
    $('#filter-status').change(loadVisitantesList);
}

function loadVisitantesList() {
    const date = $('#filter-date').val();
    const status = $('#filter-status').val();
    
    $('#visitantes-list').html(`
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
    let url = 'visitantes?';
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}`;
    
    apiRequest(url).then(response => {
        if (response.data.length === 0) {
            $('#visitantes-list').html(`
                <tr>
                    <td colspan="7" class="text-center py-4">
                        Nenhum visitante encontrado
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(visitante => {
            html += `
                <tr>
                    <td>${visitante.id}</td>
                    <td>${visitante.nome}</td>
                    <td>${visitante.documento}</td>
                    <td>${visitante.morador.nome}</td>
                    <td>${formatDate(visitante.data_visita)}</td>
                    <td>${visitante.hora_entrada} ${visitante.hora_saida ? `- ${visitante.hora_saida}` : ''}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-visitante" data-id="${visitante.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!visitante.hora_saida ? `
                        <button class="btn btn-sm btn-outline-danger checkout-visitante" data-id="${visitante.id}">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        $('#visitantes-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar visitantes', 'danger');
        console.error(error);
    });
}

function setupVisitantesForm() {
    // Form validation
    $('#visitante-form').validate({
        rules: {
            nome: 'required',
            documento: 'required',
            morador_id: 'required',
            data_visita: 'required',
            hora_entrada: 'required',
            motivo: 'required'
        },
        messages: {
            nome: 'Por favor, informe o nome do visitante',
            documento: 'Por favor, informe o documento',
            morador_id: 'Por favor, selecione o morador',
            data_visita: 'Por favor, informe a data da visita',
            hora_entrada: 'Por favor, informe o horário de entrada',
            motivo: 'Por favor, informe o motivo da visita'
        },
        submitHandler: function(form) {
            registerVisitante(form);
        }
    });
    
    // Initialize date picker
    $('#data_visita').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
    
    // Load moradores
    loadMoradores();
}

function loadMoradores() {
    apiRequest('moradores').then(response => {
        let options = '<option value="">Selecione o morador</option>';
        response.data.forEach(morador => {
            options += `<option value="${morador.id}">${morador.nome} - ${morador.apartamento}</option>`;
        });
        
        $('#morador_id').html(options);
    }).catch(error => {
        showToast('Erro ao carregar moradores', 'danger');
        console.error(error);
    });
}

function registerVisitante(form) {
    const formData = $(form).serializeArray();
    const data = {};
    
    formData.forEach(item => {
        data[item.name] = item.value;
    });
    
    // Convert date to ISO format
    data.data_visita = moment(data.data_visita, 'DD/MM/YYYY').format('YYYY-MM-DD');
    
    $('#visitante-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Registrando...
    `);
    
    apiRequest('visitantes', 'POST', data).then(response => {
        showToast('Visitante registrado com sucesso!', 'success');
        $(form).trigger('reset');
        loadVisitantesList();
        
        // Generate QR Code for visitante
        generateVisitanteQR(response.data.id);
    }).catch(error => {
        showToast('Erro ao registrar visitante', 'danger');
        console.error(error);
    }).finally(() => {
        $('#visitante-submit').prop('disabled', false).text('Registrar Visitante');
    });
}

function generateVisitanteQR(visitanteId) {
    apiRequest(`visitantes/${visitanteId}/qr-code`).then(response => {
        const qrCodeUrl = response.data.qr_code_url;
        
        const content = `
            <div class="text-center">
                <h4 class="mb-3">QR Code de Acesso</h4>
                <p>Este QR Code deve ser apresentado na portaria para acesso ao condomínio</p>
                
                <div class="my-4">
                    <img src="${qrCodeUrl}" alt="QR Code" class="img-fluid" style="max-width: 300px;">
                </div>
                
                <div class="d-flex justify-content-center gap-2">
                    <a href="${qrCodeUrl}" download="qr-code-visitante-${visitanteId}.png" class="btn btn-primary">
                        <i class="fas fa-download me-2"></i> Baixar QR Code
                    </a>
                    <button class="btn btn-outline-primary" id="print-qr-code">
                        <i class="fas fa-print me-2"></i> Imprimir
                    </button>
                </div>
            </div>
        `;
        
        showModal('QR Code de Acesso', content);
        
        $('#print-qr-code').click(function() {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>QR Code Visitante</title>
                        <style>
                            body { text-align: center; padding: 20px; }
                            img { max-width: 100%; height: auto; }
                        </style>
                    </head>
                    <body>
                        <h3>QR Code de Acesso</h3>
                        <img src="${qrCodeUrl}">
                        <p>Apresente este QR Code na portaria para acesso ao condomínio</p>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        });
    }).catch(error => {
        showToast('Erro ao gerar QR Code', 'warning');
        console.error(error);
    });
}

function checkoutVisitante(visitanteId) {
    const content = `
        <div class="mb-3">
            <label for="hora_saida" class="form-label">Horário de Saída</label>
            <input type="time" class="form-control" id="hora_saida" required>
        </div>
        <div class="mb-3">
            <label for="observacoes" class="form-label">Observações</label>
            <textarea class="form-control" id="observacoes" rows="3"></textarea>
        </div>
    `;
    
    showModal('Registrar Saída do Visitante', content);
    
    // Set current time as default
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    $('#hora_saida').val(`${hours}:${minutes}`);
    
    // Set up submit button
    $('#modal-container .modal-footer').append(`
        <button type="button" class="btn btn-primary" id="confirm-checkout">Confirmar Saída</button>
    `);
    
    $('#confirm-checkout').click(function() {
        const hora_saida = $('#hora_saida').val();
        const observacoes = $('#observacoes').val();
        
        if (!hora_saida) {
            showToast('Informe o horário de saída', 'warning');
            return;
        }
        
        const data = {
            hora_saida: hora_saida,
            observacoes: observacoes
        };
        
        $(this).prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Processando...
        `);
        
        apiRequest(`visitantes/${visitanteId}/checkout`, 'PUT', data).then(response => {
            showToast('Saída do visitante registrada com sucesso!', 'success');
            $('.modal').modal('hide');
            loadVisitantesList();
        }).catch(error => {
            showToast('Erro ao registrar saída do visitante', 'danger');
            console.error(error);
        });
    });
}

// Event delegation for dynamic elements
$(document).on('click', '.view-visitante', function() {
    const visitanteId = $(this).data('id');
    viewVisitanteDetails(visitanteId);
});

$(document).on('click', '.checkout-visitante', function() {
    const visitanteId = $(this).data('id');
    checkoutVisitante(visitanteId);
});

function viewVisitanteDetails(visitanteId) {
    apiRequest(`visitantes/${visitanteId}`).then(response => {
        const visitante = response.data;
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações do Visitante</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${visitante.id}</td>
                        </tr>
                        <tr>
                            <th>Nome</th>
                            <td>${visitante.nome}</td>
                        </tr>
                        <tr>
                            <th>Documento</th>
                            <td>${visitante.documento}</td>
                        </tr>
                        <tr>
                            <th>Morador Visitado</th>
                            <td>${visitante.morador.nome} (${visitante.morador.apartamento})</td>
                        </tr>
                        <tr>
                            <th>Data da Visita</th>
                            <td>${formatDate(visitante.data_visita)}</td>
                        </tr>
                        <tr>
                            <th>Horário</th>
                            <td>${visitante.hora_entrada} ${visitante.hora_saida ? `- ${visitante.hora_saida}` : ''}</td>
                        </tr>
                        <tr>
                            <th>Motivo</th>
                            <td>${visitante.motivo}</td>
                        </tr>
                        ${visitante.observacoes ? `
                        <tr>
                            <th>Observações</th>
                            <td>${visitante.observacoes}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>QR Code de Acesso</h5>
                    ${visitante.qr_code_url ? `
                    <div class="text-center">
                        <img src="${visitante.qr_code_url}" alt="QR Code" class="img-fluid mb-3" style="max-width: 200px;">
                    </div>
                                        ` : '<p class="text-muted">Nenhum QR Code gerado</p>'}
                    
                    ${!visitante.hora_saida ? `
                    <div class="text-center mt-4">
                        <button class="btn btn-primary me-2" id="generate-qr-btn">
                            <i class="fas fa-qrcode me-2"></i> Gerar QR Code
                        </button>
                        <button class="btn btn-danger" id="checkout-now-btn">
                            <i class="fas fa-sign-out-alt me-2"></i> Registrar Saída
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal(`Detalhes do Visitante #${visitante.id}`, content, 'modal-lg');
        
        if (!visitante.hora_saida) {
            $('#generate-qr-btn').click(function() {
                generateVisitanteQR(visitante.id);
            });
            
            $('#checkout-now-btn').click(function() {
                checkoutVisitante(visitante.id);
            });
        }
    }).catch(error => {
        showToast('Erro ao carregar detalhes do visitante', 'danger');
        console.error(error);
    });
}