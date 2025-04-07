/**
 * Notas Seguras - Aplicativo Principal
 * Gerencia a interface do usuário e a lógica do aplicativo
 */

class NotasSeguras {
    constructor() {
        // Elementos da tela de login
        this.loginScreen = document.getElementById('login-screen');
        this.pinInput = document.getElementById('pin-input');
        this.pinDots = document.querySelectorAll('.pin-dot');
        this.numpadButtons = document.querySelectorAll('.numpad-btn');
        this.setupPinContainer = document.getElementById('setup-pin-container');
        this.setupPinBtn = document.getElementById('setup-pin-btn');
        this.pinError = document.getElementById('pin-error');
        
        // Elementos da tela principal
        this.mainScreen = document.getElementById('main-screen');
        this.addBtn = document.getElementById('add-btn');
        this.syncBtn = document.getElementById('sync-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.searchInput = document.getElementById('search-input');
        this.notesContainer = document.getElementById('notes-container');
        
        // Elementos da tela de edição
        this.editScreen = document.getElementById('edit-screen');
        this.backBtn = document.getElementById('back-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.editTitle = document.getElementById('edit-title');
        this.noteTitle = document.getElementById('note-title');
        this.noteCategory = document.getElementById('note-category');
        this.noteUsername = document.getElementById('note-username');
        this.notePassword = document.getElementById('note-password');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.noteWebsite = document.getElementById('note-website');
        this.noteContent = document.getElementById('note-content');
        this.passwordFields = document.getElementById('password-fields');
        this.cardFields = document.getElementById('card-fields');
        this.cardNumber = document.getElementById('card-number');
        this.cardExpiry = document.getElementById('card-expiry');
        this.cardCVV = document.getElementById('card-cvv');
        this.cardHolder = document.getElementById('card-holder');
        
        // Elementos da tela do Google Drive
        this.driveScreen = document.getElementById('drive-screen');
        this.driveBackBtn = document.getElementById('drive-back-btn');
        this.driveSaveBtn = document.getElementById('drive-save-btn');
        this.driveNotConnected = document.getElementById('drive-not-connected');
        this.driveConnected = document.getElementById('drive-connected');
        this.driveConnectBtn = document.getElementById('drive-connect-btn');
        this.driveEmail = document.getElementById('drive-email');
        this.autoSync = document.getElementById('auto-sync');
        this.syncNowBtn = document.getElementById('sync-now-btn');
        this.driveDisconnectBtn = document.getElementById('drive-disconnect-btn');
        
        // Estado do aplicativo
        this.currentScreen = 'login';
        this.editingNoteId = null;
        this.notes = [];
        this.filteredNotes = [];
        
        // Inicializar
        this.init();
    }
    
    /**
     * Inicializa o aplicativo
     */
    async init() {
        // Inicializar armazenamento
        const hasPIN = await secureStorage.init();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Mostrar tela de configuração de PIN se necessário
        if (!hasPIN) {
            this.setupPinContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Eventos da tela de login
        this.numpadButtons.forEach(button => {
            button.addEventListener('click', () => this.handleNumpadClick(button.dataset.value));
        });
        
        this.pinInput.addEventListener('input', () => this.updatePinDots());
        
        this.setupPinBtn.addEventListener('click', () => {
            this.pinInput.value = '';
            this.updatePinDots();
            this.setupPinContainer.classList.add('hidden');
            alert('Digite um PIN de 4 dígitos para configurar');
        });
        
        // Eventos da tela principal
        this.addBtn.addEventListener('click', () => this.showAddNote());
        this.syncBtn.addEventListener('click', () => this.showDriveScreen());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.searchInput.addEventListener('input', () => this.filterNotes());
        
        // Eventos da tela de edição
        this.backBtn.addEventListener('click', () => this.showMainScreen());
        this.saveBtn.addEventListener('click', () => this.saveNote());
        this.noteCategory.addEventListener('change', () => this.toggleCategoryFields());
        this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Formatação de campos de cartão
        this.cardNumber.addEventListener('input', (e) => this.formatCardNumber(e));
        this.cardExpiry.addEventListener('input', (e) => this.formatCardExpiry(e));
        
        // Eventos da tela do Google Drive
        this.driveBackBtn.addEventListener('click', () => this.showMainScreen());
        this.driveConnectBtn.addEventListener('click', () => this.connectToDrive());
        this.syncNowBtn.addEventListener('click', () => this.syncWithDrive());
        this.driveDisconnectBtn.addEventListener('click', () => this.disconnectFromDrive());
        this.autoSync.addEventListener('change', () => this.updateAutoSync());
        this.driveSaveBtn.addEventListener('click', () => this.showMainScreen());
    }
    
    /**
     * Manipula cliques no teclado numérico
     * @param {string} value - Valor do botão clicado
     */
    handleNumpadClick(value) {
        if (value === 'clear') {
            this.pinInput.value = '';
        } else if (value === 'enter') {
            this.verifyPIN();
        } else {
            // Adicionar dígito se não tiver 4 dígitos ainda
            if (this.pinInput.value.length < 4) {
                this.pinInput.value += value;
            }
        }
        
        this.updatePinDots();
    }
    
    /**
     * Atualiza os pontos visuais do PIN
     */
    updatePinDots() {
        const pinLength = this.pinInput.value.length;
        
        this.pinDots.forEach((dot, index) => {
            if (index < pinLength) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
        
        // Se tiver 4 dígitos e estiver configurando PIN, verificar automaticamente
        if (pinLength === 4 && this.setupPinContainer.classList.contains('hidden') && !secureStorage.hasPIN()) {
            this.setupNewPIN();
        }
    }
    
    /**
     * Configura um novo PIN
     */
    setupNewPIN() {
        try {
            const pin = this.pinInput.value;
            secureStorage.setupPIN(pin);
            this.showMainScreen();
        } catch (error) {
            alert(`Erro ao configurar PIN: ${error.message}`);
            this.pinInput.value = '';
            this.updatePinDots();
        }
    }
    
    /**
     * Verifica o PIN digitado
     */
    verifyPIN() {
        const pin = this.pinInput.value;
        
        // Se não tiver PIN configurado, configurar novo
        if (!secureStorage.hasPIN()) {
            this.setupNewPIN();
            return;
        }
        
        // Verificar PIN
        if (pin.length !== 4) {
            this.showPinError('Digite 4 dígitos');
            return;
        }
        
        const authenticated = secureStorage.authenticate(pin);
        if (authenticated) {
            this.pinError.classList.add('hidden');
            this.showMainScreen();
            this.loadNotes();
        } else {
            this.showPinError('PIN incorreto');
            this.pinInput.value = '';
            this.updatePinDots();
        }
    }
    
    /**
     * Mostra mensagem de erro no PIN
     * @param {string} message - Mensagem de erro
     */
    showPinError(message) {
        this.pinError.textContent = message;
        this.pinError.classList.remove('hidden');
        
        // Esconder após 3 segundos
        setTimeout(() => {
            this.pinError.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * Mostra a tela principal
     */
    showMainScreen() {
        this.hideAllScreens();
        this.mainScreen.classList.add('active');
        this.currentScreen = 'main';
        
        // Recarregar notas se estiver vindo da tela de edição
        if (this.editingNoteId !== null) {
            this.loadNotes();
            this.editingNoteId = null;
        }
        
        // Atualizar configurações do Drive
        this.updateDriveStatus();
    }
    
    /**
     * Mostra a tela de adição/edição de nota
     * @param {string} noteId - ID da nota a ser editada (opcional)
     */
    showEditScreen(noteId = null) {
        this.hideAllScreens();
        this.editScreen.classList.add('active');
        this.currentScreen = 'edit';
        
        // Limpar campos
        this.noteTitle.value = '';
        this.noteCategory.value = 'senha';
        this.noteUsername.value = '';
        this.notePassword.value = '';
        this.noteWebsite.value = '';
        this.noteContent.value = '';
        this.cardNumber.value = '';
        this.cardExpiry.value = '';
        this.cardCVV.value = '';
        this.cardHolder.value = '';
        
        // Mostrar campos de senha por padrão
        this.toggleCategoryFields();
        
        // Se for edição, carregar dados da nota
        if (noteId) {
            this.editingNoteId = noteId;
            this.editTitle.textContent = 'Editar Nota';
            
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                this.noteTitle.value = note.title || '';
                this.noteCategory.value = note.category || 'senha';
                this.noteContent.value = note.content || '';
                
                // Preencher campos específicos da categoria
                if (note.category === 'senha') {
                    this.noteUsername.value = note.username || '';
                    this.notePassword.value = note.password || '';
                    this.noteWebsite.value = note.website || '';
                } else if (note.category === 'cartao') {
                    this.cardNumber.value = note.cardNumber || '';
                    this.cardExpiry.value = note.cardExpiry || '';
                    this.cardCVV.value = note.cardCVV || '';
                    this.cardHolder.value = note.cardHolder || '';
                }
                
                // Atualizar campos visíveis
                this.toggleCategoryFields();
            }
        } else {
            this.editingNoteId = null;
            this.editTitle.textContent = 'Nova Nota';
        }
    }
    
    /**
     * Mostra a tela de adição de nota
     */
    showAddNote() {
        this.showEditScreen();
    }
    
    /**
     * Mostra a tela do Google Drive
     */
    showDriveScreen() {
        this.hideAllScreens();
        this.driveScreen.classList.add('active');
        this.currentScreen = 'drive';
        
        // Atualizar status do Drive
        this.updateDriveStatus();
    }
    
    /**
     * Esconde todas as telas
     */
    hideAllScreens() {
        this.loginScreen.classList.remove('active');
        this.mainScreen.classList.remove('active');
        this.editScreen.classList.remove('active');
        this.driveScreen.classList.remove('active');
    }
    
    /**
     * Carrega as notas do armazenamento
     */
    loadNotes() {
        try {
            this.notes = secureStorage.data.notes || [];
            this.filteredNotes = [...this.notes];
            this.renderNotes();
        } catch (error) {
            console.error('Erro ao carregar notas:', error);
            alert('Erro ao carregar notas');
        }
    }
    
    /**
     * Filtra as notas com base na pesquisa
     */
    filterNotes() {
        const query = this.searchInput.value.trim().toLowerCase();
        
        if (!query) {
            this.filteredNotes = [...this.notes];
        } else {
            this.filteredNotes = this.notes.filter(note => {
                return (
                    (note.title && note.title.toLowerCase().includes(query)) ||
                    (note.username && note.username.toLowerCase().includes(query)) ||
                    (note.website && note.website.toLowerCase().includes(query)) ||
                    (note.content && note.content.toLowerCase().includes(query))
                );
            });
        }
        
        this.renderNotes();
    }
    
    /**
     * Renderiza as notas na tela
     */
    renderNotes() {
        // Limpar container
        this.notesContainer.innerHTML = '';
        
        // Mostrar estado vazio se não tiver notas
        if (this.filteredNotes.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-lock empty-icon"></i>
                <p>Nenhuma nota segura encontrada</p>
                <p>Clique no botão + para adicionar</p>
            `;
            this.notesContainer.appendChild(emptyState);
            return;
        }
        
        // Renderizar cada nota
        this.filteredNotes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.dataset.id = note.id;
            
            // Ícone e cor baseados na categoria
            let categoryName = 'Nota';
            let categoryIcon = 'fa-sticky-note';
            
            switch (note.category) {
                case 'senha':
                    categoryName = 'Senha';
                    categoryIcon = 'fa-key';
                    break;
                case 'cartao':
                    categoryName = 'Cartão';
                    categoryIcon = 'fa-credit-card';
                    break;
                case 'documento':
                    categoryName = 'Documento';
                    categoryIcon = 'fa-file-alt';
                    break;
                case 'outro':
                    categoryName = 'Outro';
                    categoryIcon = 'fa-box';
                    break;
            }
            
            // Conteúdo da prévia
            let previewContent = '';
            if (note.category === 'senha') {
                previewContent = note.username || note.website || note.content || '';
            } else if (note.category === 'cartao') {
                const lastFour = note.cardNumber ? note.cardNumber.replace(/\s/g, '').slice(-4) : '';
                previewContent = lastFour ? `**** ${lastFour}` : '';
            } else {
                previewContent = note.content || '';
            }
            
            // Limitar tamanho da prévia
            if (previewContent.length > 50) {
                previewContent = previewContent.substring(0, 50) + '...';
            }
            
            noteCard.innerHTML = `
                <span class="category-badge"><i class="fas ${categoryIcon}"></i> ${categoryName}</span>
                <h3>${note.title || 'Sem título'}</h3>
                <p class="note-preview">${previewContent}</p>
            `;
            
            // Evento de clique para editar
            noteCard.addEventListener('click', () => this.showEditScreen(note.id));
            
            this.notesContainer.appendChild(noteCard);
        });
    }
    
    /**
     * Alterna os campos visíveis com base na categoria
     */
    toggleCategoryFields() {
        const category = this.noteCategory.value;
        
        if (category === 'cartao') {
            this.passwordFields.classList.add('hidden');
            this.cardFields.classList.remove('hidden');
        } else {
            this.passwordFields.classList.remove('hidden');
            this.cardFields.classList.add('hidden');
        }
    }
    
    /**
     * Alterna a visibilidade da senha
     */
    togglePasswordVisibility() {
        const type = this.notePassword.type;
        this.notePassword.type = type === 'password' ? 'text' : 'password';
        
        const icon = this.togglePasswordBtn.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
    
    /**
     * Formata o número do cartão enquanto digita
     */
    formatCardNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Adicionar espaços a cada 4 dígitos
        if (value.length > 0) {
            value = value.match(/.{1,4}/g).join(' ');
        }
        
        // Limitar a 19 caracteres (16 dígitos + 3 espaços)
        if (value.length > 19) {
            value = value.substring(0, 19);
        }
        
        e.target.value = value;
    }
    
    /**
     * Formata a data de validade do cartão enquanto digita
     */
    formatCardExpiry(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Adicionar barra após os primeiros 2 dígitos
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        
        // Limitar a 5 caracteres (MM/AA)
        if (value.length > 5) {
            value = value.substring(0, 5);
        }
        
        e.target.value = value;
    }
    
    /**
     * Salva a nota atual
     */
    saveNote() {
        try {
            // Validar título
            if (!this.noteTitle.value.trim()) {
                alert('Por favor, digite um título para a nota');
                this.noteTitle.focus();
                return;
            }
            
            // Preparar objeto da nota
            const note = {
                title: this.noteTitle.value.trim(),
                category: this.noteCategory.value,
                content: this.noteContent.value.trim()
            };
            
            // Adicionar campos específicos da categoria
            if (note.category === 'senha') {
                note.username = this.noteUsername.value.trim();
                note.password = this.notePassword.value;
                note.website = this.noteWebsite.value.trim();
            } else if (note.category === 'cartao') {
                note.cardNumber = this.cardNumber.value.trim();
                note.cardExpiry = this.cardExpiry.value.trim();
                note.cardCVV = this.cardCVV.value.trim();
                note.cardHolder = this.cardHolder.value.trim();
            }
            
            // Se for edição, incluir ID
            if (this.editingNoteId) {
                note.id = this.editingNoteId;
            }
            
            // Salvar nota
            secureStorage.saveNote(note);
            
            // Voltar para a tela principal
            this.showMainScreen();
        } catch (error) {
            console.error('Erro ao salvar nota:', error);
            alert(`Erro ao salvar nota: ${error.message}`);
        }
    }
    
    /**
     * Faz logout do usuário
     */
    logout() {
        if (confirm('Tem certeza que deseja sair?')) {
            secureStorage.logout();
            this.notes = [];
            this.filteredNotes = [];
            this.pinInput.value = '';
            this.updatePinDots();
            this.hideAllScreens();
            this.loginScreen.classList.add('active');
            this.currentScreen = 'login';
        }
    }
    
    /**
     * Atualiza o status do Google Drive na interface
     */
    updateDriveStatus() {
        const config = secureStorage.getDriveConfig();
        
        if (config && config.enabled) {
            this.driveNotConnected.classList.add('hidden');
            this.driveConnected.classList.remove('hidden');
            this.driveEmail.textContent = config.email || '';
            this.autoSync.checked = config.autoSync || false;
        } else {
            this.driveNotConnected.classList.remove('hidden');
            this.driveConnected.classList.add('hidden');
        }
    }
    
    /**
     * Conecta ao Google Drive
     */
    async connectToDrive() {
        try {
            await secureStorage.connectToDrive();
            this.updateDriveStatus();
        } catch (error) {
            console.error('Erro ao conectar ao Google Drive:', error);
            alert(`Erro ao conectar ao Google Drive: ${error.message}`);
        }
    }
    
    /**
     * Sincroniza dados com o Google Drive
     */
    async syncWithDrive() {
        try {
            const result = await secureStorage.syncWithDrive();
            if (result.success) {
                alert('Sincronização concluída com sucesso!');
                this.updateDriveStatus();
            }
        } catch (error) {
            console.error('Erro ao sincronizar com Google Drive:', error);
            alert(`Erro ao sincronizar: ${error.message}`);
        }
    }
    
    /**
     * Desconecta do Google Drive
     */
    async disconnectFromDrive() {
        if (confirm('Tem certeza que deseja desconectar do Google Drive?')) {
            try {
                await secureStorage.disconnectFromDrive();
                this.updateDriveStatus();
            } catch (error) {
                console.error('Erro ao desconectar do Google Drive:', error);
                alert(`Erro ao desconectar: ${error.message}`);
            }
        }
    }
    
    /**
     * Atualiza a configuração de sincronização automática
     */
    updateAutoSync() {
        try {
            secureStorage.updateDriveConfig({
                autoSync: this.autoSync.checked
            });
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
        }
    }
}

// Inicializar aplicativo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotasSeguras();
});
