// Main Application Controller
$(document).ready(function() {
    // Initialize the application
    initApp();
    
    // Load navigation
    loadNavigation();
    
    // Check authentication
    checkAuth();
});

function initApp() {
    // Set up moment.js for date handling
    if (typeof moment !== 'undefined') {
        moment.locale('pt-br');
    }
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
    
    // Set current year in footer
    $('#current-year').text(new Date().getFullYear());
    
    // Set up event listeners after navigation is loaded
    $(document).on('navigation-loaded', function() {
        setupEventListeners();
    });
}

function loadNavigation() {
    // Load sidebar
    $.get('templates/sidebar.html', function(data) {
        $('#sidebar').html(data);
        
        // Load navbar
        $.get('templates/navbar.html', function(navData) {
            $('.top-navbar').html(navData);
            
            // Trigger event when both navigations are loaded
            $(document).trigger('navigation-loaded');
        }).fail(function() {
            console.error('Failed to load navbar');
        });
    }).fail(function() {
        console.error('Failed to load sidebar');
    });
}

function setupEventListeners() {
    // Sidebar toggle for mobile
    $(document).on('click', '#sidebar-toggle', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });
    
    // Close sidebar when clicking outside
    $(document).on('click', function(e) {
        if ($('#sidebar').hasClass('active') && 
            !$(e.target).closest('#sidebar, #sidebar-toggle').length) {
            closeSidebar();
        }
    });
    
    
    
    // Navigation links
    $(document).on('click', '.nav-link:not([href="#"])', function(e) {
        e.preventDefault();
        const page = $(this).attr('href').substring(1);
        loadPage(page);
        closeSidebar(); // Close sidebar after navigation on mobile
    });
    
    // Logout button
    $(document).on('click', '#logout-btn', function(e) {
        e.preventDefault();
        logout();
    });
}

function toggleSidebar() {
    $('#sidebar').toggleClass('active');
    $('.main-content').toggleClass('active');
    toggleSidebarIcon();
    
    // Add overlay when sidebar is active
    if ($('#sidebar').hasClass('active')) {
        $('body').append('<div class="sidebar-overlay"></div>');
        $('.sidebar-overlay').on('click', closeSidebar);
    } else {
        $('.sidebar-overlay').remove();
    }
}

function closeSidebar() {
    $('#sidebar').removeClass('active');
    $('.main-content').removeClass('active');
    $('#sidebar-icon').removeClass('fa-times').addClass('fa-bars');
    $('.sidebar-overlay').remove();
}

function toggleSidebarIcon() {
    const icon = $('#sidebar-icon');
    icon.toggleClass('fa-bars fa-times');
}

function checkAuth() {
    const token = localStorage.getItem('condapp_token');
    if (!token && !['#login', '#register'].includes(window.location.hash)) {
        window.location.hash = 'login';
        loadPage('login');
    } else if (token && ['#login', '#register', ''].includes(window.location.hash)) {
        window.location.hash = 'dashboard';
        loadPage('dashboard');
    } else if (!token) {
        return;
    } else {
        loadPage(window.location.hash.substring(1));
    }
}

function loadPage(page) {
    if (!page) return;
    
    // Show loading indicator
    $('#main-content-area').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
        </div>
    `);
    
    // Load page content
    $.get(`pages/${page}.html`, function(data) {
        $('#main-content-area').html(data);
        
        // Initialize page-specific JS
        if (typeof window[`init${page.charAt(0).toUpperCase() + page.slice(1)}Page`] === 'function') {
            window[`init${page.charAt(0).toUpperCase() + page.slice(1)}Page`]();
        }
        
        // Update active menu item
        $('.nav-link').removeClass('active');
        $(`.nav-link[href="#${page}"]`).addClass('active');
        
        // Update browser history
        if (window.location.hash.substring(1) !== page) {
            window.location.hash = page;
        }
    }).fail(function() {
        $('#main-content-area').html(`
            <div class="alert alert-danger">
                <h4>Página não encontrada</h4>
                <p>A página solicitada não pôde ser carregada.</p>
                <button class="btn btn-primary" onclick="loadPage('dashboard')">Voltar ao início</button>
            </div>
        `);
    });
}

function logout() {
    localStorage.removeItem('condapp_token');
    localStorage.removeItem('condapp_user');
    window.location.hash = 'login';
    loadPage('login');
    showToast('Logout realizado com sucesso', 'success');
}

function showToast(message, type = 'info') {
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">CondApp</strong>
                <small>Agora</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body bg-${type} text-white">
                ${message}
            </div>
        </div>
    `;
    
    $('#toast-container').append(toastHtml);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        $(`#${toastId}`).remove();
    }, 5000);
}

function showModal(title, content, size = '') {
    const modalId = `modal-${Date.now()}`;
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
            <div class="modal-dialog ${size}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${modalId}-label">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#modal-container').html(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
    
    // Remove modal from DOM after it's hidden
    $(`#${modalId}`).on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

// API Helper Functions
function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('condapp_token');
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return $.ajax({
        url: `api/${endpoint}`,
        method: method,
        headers: headers,
        data: data ? JSON.stringify(data) : null,
        dataType: 'json'
    });
}