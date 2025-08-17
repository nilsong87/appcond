function initVotacoesPage() {
    loadVotacoesList();
    setupVotacaoForm();
    
    // Set up filter events
    $('#filter-status').change(loadVotacoesList);
}

function loadVotacoesList() {
    const status = $('#filter-status').val();
    
    $('#votacoes-list').html(`
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </td>
        </tr>
    `);
    
        apiRequest(`votacoes?status=${status}`).then(response => {
        if (response.data.length === 0) {
            $('#votacoes-list').html(`
                <tr>
                    <td colspan="5" class="text-center py-4">
                        Nenhuma votação encontrada
                    </td>
                </tr>
            `);
            return;
        }
        
        let html = '';
        response.data.forEach(votacao => {
            html += `
                <tr>
                    <td>${votacao.id}</td>
                    <td>${votacao.titulo}</td>
                    <td>${formatDate(votacao.data_inicio)} - ${formatDate(votacao.data_fim)}</td>
                    <td><span class="badge bg-${getVotacaoStatusBadge(votacao.status)}">${votacao.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary view-votacao" data-id="${votacao.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${votacao.status === 'Em andamento' ? `
                        <button class="btn btn-sm btn-outline-success vote-votacao" data-id="${votacao.id}">
                            <i class="fas fa-vote-yea"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        $('#votacoes-list').html(html);
    }).catch(error => {
        showToast('Erro ao carregar votações', 'danger');
        console.error(error);
    });
}

function setupVotacaoForm() {
    // Form validation
    $('#votacao-form').validate({
        rules: {
            titulo: 'required',
            descricao: 'required',
            data_inicio: 'required',
            data_fim: 'required'
        },
        messages: {
            titulo: 'Por favor, informe o título da votação',
            descricao: 'Por favor, descreva a pauta da votação',
            data_inicio: 'Por favor, informe a data de início',
            data_fim: 'Por favor, informe a data de término'
        },
        submitHandler: function(form) {
            registerVotacao(form);
        }
    });
    
    // Initialize date pickers
    $('#data_inicio, #data_fim').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'pt-BR'
    });
    
    // Add option field
    $('#add-option').click(function() {
        const optionCount = $('.opcao-item').length + 1;
        const optionHtml = `
            <div class="opcao-item mb-2">
                <div class="input-group">
                    <input type="text" class="form-control" name="opcoes[]" placeholder="Opção ${optionCount}" required>
                    <button type="button" class="btn btn-outline-danger remove-option">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        $('#opcoes-container').append(optionHtml);
    });
    
    // Remove option field
    $(document).on('click', '.remove-option', function() {
        $(this).closest('.opcao-item').remove();
    });
}

function registerVotacao(form) {
    const formData = $(form).serializeArray();
    const data = {};
    const opcoes = [];
    
    formData.forEach(item => {
        if (item.name === 'opcoes[]') {
            opcoes.push(item.value);
        } else {
            data[item.name] = item.value;
        }
    });
    
    // Convert dates to ISO format
    data.data_inicio = moment(data.data_inicio, 'DD/MM/YYYY').format('YYYY-MM-DD');
    data.data_fim = moment(data.data_fim, 'DD/MM/YYYY').format('YYYY-MM-DD');
    data.opcoes = opcoes;
    
    $('#votacao-submit').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Criando...
    `);
    
    apiRequest('votacoes', 'POST', data).then(response => {
        showToast('Votação criada com sucesso!', 'success');
        $(form).trigger('reset');
        $('#opcoes-container').empty();
        loadVotacoesList();
    }).catch(error => {
        showToast('Erro ao criar votação', 'danger');
        console.error(error);
    }).finally(() => {
        $('#votacao-submit').prop('disabled', false).text('Criar Votação');
    });
}

function getVotacaoStatusBadge(status) {
    switch (status) {
        case 'Em andamento': return 'success';
        case 'Agendada': return 'info';
        case 'Encerrada': return 'secondary';
        case 'Cancelada': return 'danger';
        default: return 'warning';
    }
}

// Event delegation for dynamic elements
$(document).on('click', '.view-votacao', function() {
    const votacaoId = $(this).data('id');
    viewVotacaoDetails(votacaoId);
});

$(document).on('click', '.vote-votacao', function() {
    const votacaoId = $(this).data('id');
    showVoteOptions(votacaoId);
});

function viewVotacaoDetails(votacaoId) {
    apiRequest(`votacoes/${votacaoId}`).then(response => {
        const votacao = response.data;
        
        // Prepare results chart data
        const labels = votacao.opcoes.map(opcao => opcao.texto);
        const data = votacao.opcoes.map(opcao => opcao.votos);
        const backgroundColors = [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(153, 102, 255, 0.7)'
        ];
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Informações da Votação</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>ID</th>
                            <td>${votacao.id}</td>
                        </tr>
                        <tr>
                            <th>Título</th>
                            <td>${votacao.titulo}</td>
                        </tr>
                        <tr>
                            <th>Período</th>
                            <td>${formatDate(votacao.data_inicio)} - ${formatDate(votacao.data_fim)}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td><span class="badge bg-${getVotacaoStatusBadge(votacao.status)}">${votacao.status}</span></td>
                        </tr>
                        <tr>
                            <th>Total de Votos</th>
                            <td>${votacao.total_votos}</td>
                        </tr>
                    </table>
                    
                    <h5 class="mt-4">Descrição</h5>
                    <div class="card">
                        <div class="card-body">
                            <p class="card-text">${votacao.descricao}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h5>Resultados</h5>
                    <div class="chart-container" style="position: relative; height:300px;">
                        <canvas id="results-chart"></canvas>
                    </div>
                    
                    <div class="mt-4">
                        <h5>Opções</h5>
                        <ul class="list-group">
                            ${votacao.opcoes.map(opcao => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${opcao.texto}
                                    <span class="badge bg-primary rounded-pill">${opcao.votos} votos</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        showModal(`Detalhes da Votação: ${votacao.titulo}`, content, 'modal-xl');
        
        // Render chart
        const ctx = document.getElementById('results-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votos',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
        showToast('Erro ao carregar detalhes da votação', 'danger');
        console.error(error);
    });
}

function showVoteOptions(votacaoId) {
    apiRequest(`votacoes/${votacaoId}`).then(response => {
        const votacao = response.data;
        
        const content = `
            <div class="text-center">
                <h4 class="mb-4">${votacao.titulo}</h4>
                <p>${votacao.descricao}</p>
                
                <div class="mt-4">
                    <h5>Selecione sua opção:</h5>
                    <div class="list-group">
                        ${votacao.opcoes.map(opcao => `
                            <button type="button" class="list-group-item list-group-item-action vote-option" data-votacao="${votacao.id}" data-opcao="${opcao.id}">
                                ${opcao.texto}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="alert alert-info mt-4">
                    <i class="fas fa-info-circle"></i> Você pode votar apenas uma vez nesta votação.
                </div>
            </div>
        `;
        
        showModal('Votar', content);
        
        $('.vote-option').click(function() {
            const opcaoId = $(this).data('opcao');
            submitVote(votacaoId, opcaoId);
        });
    }).catch(error => {
        showToast('Erro ao carregar opções de votação', 'danger');
        console.error(error);
    });
}

function submitVote(votacaoId, opcaoId) {
    apiRequest(`votacoes/${votacaoId}/vote`, 'POST', { opcao_id: opcaoId }).then(response => {
        showToast('Seu voto foi registrado com sucesso!', 'success');
        $('.modal').modal('hide');
        loadVotacoesList();
    }).catch(error => {
        showToast('Erro ao registrar voto', 'danger');
        console.error(error);
    });
}