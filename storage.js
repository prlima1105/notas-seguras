/**
 * Notas Seguras - Módulo de Armazenamento
 * Responsável pelo armazenamento local e sincronização com Google Drive
 */

class SecureStorage {
    constructor() {
        this.storageKey = 'notasSeguras';
        this.pinKey = 'notasSegurasPIN';
        this.driveConfigKey = 'notasSegurasDriveConfig';
        this.encryptionSalt = 'NS_SALT_2025';
        this.isAuthenticated = false;
        this.currentPin = null;
        this.driveConfig = null;
        this.data = {
            notes: [],
            lastSync: null
        };
        
        // Inicializar Google Drive API
        this.driveInitialized = false;
        this.driveClient = null;
        this.driveAPI = null;
        this.driveFileName = 'notas_seguras_backup.json';
        this.driveFileId = null;
    }

    /**
     * Inicializa o armazenamento
     */
    async init() {
        // Carregar configuração do Google Drive
        const driveConfigStr = localStorage.getItem(this.driveConfigKey);
        if (driveConfigStr) {
            try {
                this.driveConfig = JSON.parse(driveConfigStr);
                // Se tiver configuração do Drive, inicializa a API
                if (this.driveConfig.enabled) {
                    this.initGoogleDriveAPI();
                }
            } catch (e) {
                console.error('Erro ao carregar configuração do Drive:', e);
                this.driveConfig = null;
            }
        }
        
        // Verificar se já existe um PIN configurado
        return this.hasPIN();
    }

    /**
     * Verifica se já existe um PIN configurado
     */
    hasPIN() {
        return localStorage.getItem(this.pinKey) !== null;
    }

    /**
     * Configura um novo PIN
     * @param {string} pin - PIN de 4 dígitos
     */
    setupPIN(pin) {
        if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
            throw new Error('PIN inválido. Deve conter 4 dígitos numéricos.');
        }
        
        // Salvar o hash do PIN
        const hashedPin = this.hashPin(pin);
        localStorage.setItem(this.pinKey, hashedPin);
        
        // Autenticar com o novo PIN
        this.authenticate(pin);
        
        // Salvar dados iniciais vazios
        this.saveData();
        
        return true;
    }

    /**
     * Autentica o usuário com o PIN
     * @param {string} pin - PIN de 4 dígitos
     */
    authenticate(pin) {
        if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
            return false;
        }
        
        const storedHash = localStorage.getItem(this.pinKey);
        if (!storedHash) {
            return false;
        }
        
        const inputHash = this.hashPin(pin);
        if (inputHash !== storedHash) {
            return false;
        }
        
        // PIN correto, carregar dados
        this.isAuthenticated = true;
        this.currentPin = pin;
        this.loadData();
        
        return true;
    }

    /**
     * Cria um hash simples do PIN
     * @param {string} pin - PIN de 4 dígitos
     */
    hashPin(pin) {
        // Esta é uma implementação simples de hash
        // Em uma aplicação real, usaríamos algo como PBKDF2 ou bcrypt
        let hash = 0;
        const str = pin + this.encryptionSalt;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para inteiro de 32 bits
        }
        return hash.toString(16);
    }

    /**
     * Carrega os dados do armazenamento local
     */
    loadData() {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        const encryptedData = localStorage.getItem(this.storageKey);
        if (!encryptedData) {
            // Nenhum dado encontrado, usar dados vazios padrão
            this.data = {
                notes: [],
                lastSync: null
            };
            return this.data;
        }
        
        try {
            // Descriptografar dados
            const decryptedData = this.decrypt(encryptedData, this.currentPin);
            this.data = JSON.parse(decryptedData);
            return this.data;
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            throw new Error('Erro ao descriptografar dados');
        }
    }

    /**
     * Salva os dados no armazenamento local
     */
    saveData() {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        try {
            // Criptografar dados
            const dataStr = JSON.stringify(this.data);
            const encryptedData = this.encrypt(dataStr, this.currentPin);
            localStorage.setItem(this.storageKey, encryptedData);
            
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            throw new Error('Erro ao criptografar dados');
        }
    }

    /**
     * Criptografa uma string usando o PIN
     * @param {string} text - Texto a ser criptografado
     * @param {string} pin - PIN para criptografia
     */
    encrypt(text, pin) {
        // Esta é uma implementação simples de criptografia
        // Em uma aplicação real, usaríamos algo como AES
        let result = '';
        const pinChars = (pin + this.encryptionSalt).split('');
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const pinChar = pinChars[i % pinChars.length].charCodeAt(0);
            const encryptedChar = String.fromCharCode(charCode ^ pinChar);
            result += encryptedChar;
        }
        
        // Converter para base64 para armazenamento seguro
        return btoa(result);
    }

    /**
     * Descriptografa uma string usando o PIN
     * @param {string} encryptedText - Texto criptografado
     * @param {string} pin - PIN para descriptografia
     */
    decrypt(encryptedText, pin) {
        // Converter de base64
        const text = atob(encryptedText);
        let result = '';
        const pinChars = (pin + this.encryptionSalt).split('');
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const pinChar = pinChars[i % pinChars.length].charCodeAt(0);
            const decryptedChar = String.fromCharCode(charCode ^ pinChar);
            result += decryptedChar;
        }
        
        return result;
    }

    /**
     * Adiciona ou atualiza uma nota
     * @param {Object} note - Objeto da nota
     */
    saveNote(note) {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        // Verificar se a nota já existe (atualização)
        const index = this.data.notes.findIndex(n => n.id === note.id);
        
        if (index >= 0) {
            // Atualizar nota existente
            this.data.notes[index] = {
                ...this.data.notes[index],
                ...note,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Adicionar nova nota
            const newNote = {
                ...note,
                id: this.generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.data.notes.push(newNote);
        }
        
        // Salvar alterações
        this.saveData();
        
        return index >= 0 ? this.data.notes[index] : this.data.notes[this.data.notes.length - 1];
    }

    /**
     * Remove uma nota pelo ID
     * @param {string} id - ID da nota
     */
    deleteNote(id) {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        const initialLength = this.data.notes.length;
        this.data.notes = this.data.notes.filter(note => note.id !== id);
        
        // Se a quantidade de notas mudou, salvar alterações
        if (initialLength !== this.data.notes.length) {
            this.saveData();
            return true;
        }
        
        return false;
    }

    /**
     * Busca notas por texto
     * @param {string} query - Texto para busca
     */
    searchNotes(query) {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        if (!query) {
            return this.data.notes;
        }
        
        const searchLower = query.toLowerCase();
        return this.data.notes.filter(note => {
            return (
                (note.title && note.title.toLowerCase().includes(searchLower)) ||
                (note.username && note.username.toLowerCase().includes(searchLower)) ||
                (note.website && note.website.toLowerCase().includes(searchLower)) ||
                (note.content && note.content.toLowerCase().includes(searchLower))
            );
        });
    }

    /**
     * Gera um ID único para notas
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Faz logout do usuário
     */
    logout() {
        this.isAuthenticated = false;
        this.currentPin = null;
        this.data = {
            notes: [],
            lastSync: null
        };
    }

    /**
     * Inicializa a API do Google Drive
     */
    async initGoogleDriveAPI() {
        if (this.driveInitialized) {
            return;
        }

        try {
            // Carrega a biblioteca gapi se ainda não estiver carregada
            if (!window.gapi) {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            // Carrega o cliente da API
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000
                });
            });

            // Inicializa o cliente
            await gapi.client.init({
                apiKey: 'AIzaSyD9XxOZJQ3X3X3X3X3X3X3X3X3X3X3X3X3X3X',
                clientId: '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: 'https://www.googleapis.com/auth/drive.file'
            });

            this.driveClient = gapi.auth2.getAuthInstance();
            this.driveAPI = gapi.client.drive;
            this.driveInitialized = true;

            // Verifica se o usuário já está logado
            if (this.driveClient.isSignedIn.get()) {
                this.updateDriveUserInfo();
            }
        } catch (error) {
            console.error('Erro ao inicializar Google Drive API:', error);
            throw new Error('Falha ao conectar com o Google Drive. Por favor, recarregue a página e tente novamente.');
        }
    }

    /**
     * Conecta ao Google Drive
     */
    async connectToDrive() {
        if (!this.driveInitialized) {
            await this.initGoogleDriveAPI();
        }
        
        try {
            await this.driveClient.signIn();
            this.updateDriveUserInfo();
            
            // Salvar configuração
            this.driveConfig = {
                enabled: true,
                autoSync: false,
                email: this.driveClient.currentUser.get().getBasicProfile().getEmail(),
                lastSync: null
            };
            
            localStorage.setItem(this.driveConfigKey, JSON.stringify(this.driveConfig));
            
            return this.driveConfig;
        } catch (error) {
            console.error('Erro ao conectar ao Google Drive:', error);
            throw error;
        }
    }

    /**
     * Desconecta do Google Drive
     */
    async disconnectFromDrive() {
        if (!this.driveInitialized || !this.driveClient) {
            return;
        }
        
        try {
            if (this.driveClient.isSignedIn.get()) {
                await this.driveClient.signOut();
            }
            
            // Limpar configuração
            this.driveConfig = null;
            localStorage.removeItem(this.driveConfigKey);
            
            return true;
        } catch (error) {
            console.error('Erro ao desconectar do Google Drive:', error);
            throw error;
        }
    }

    /**
     * Atualiza informações do usuário do Drive
     */
    updateDriveUserInfo() {
        if (!this.driveClient || !this.driveClient.isSignedIn.get()) {
            return null;
        }
        
        const profile = this.driveClient.currentUser.get().getBasicProfile();
        return {
            email: profile.getEmail(),
            name: profile.getName()
        };
    }

    /**
     * Sincroniza dados com o Google Drive
     */
    async syncWithDrive() {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        try {
            // Inicializa a API se necessário
            if (!this.driveInitialized) {
                await this.initGoogleDriveAPI();
            }

            // Verifica se está conectado
            if (!this.driveClient || !this.driveClient.isSignedIn.get()) {
                await this.connectToDrive();
            }

            // Verifica se o arquivo já existe
            if (!this.driveFileId) {
                await this.findOrCreateDriveFile();
            }
            
            // Criptografa dados para upload
            const dataStr = JSON.stringify(this.data);
            const encryptedData = this.encrypt(dataStr, this.currentPin);
            
            // Faz upload do arquivo
            await this.updateDriveFile(encryptedData);
            
            // Atualiza data de sincronização
            const now = new Date().toISOString();
            this.data.lastSync = now;
            this.driveConfig.lastSync = now;
            
            // Salva configuração atualizada
            localStorage.setItem(this.driveConfigKey, JSON.stringify(this.driveConfig));
            this.saveData();
            
            return {
                success: true,
                timestamp: now,
                message: 'Dados sincronizados com sucesso!'
            };
        } catch (error) {
            console.error('Erro ao sincronizar com Google Drive:', error);
            throw new Error(`Falha na sincronização: ${error.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * Encontra ou cria o arquivo de backup no Drive
     */
    async findOrCreateDriveFile() {
        try {
            // Buscar arquivo existente
            const response = await this.driveAPI.files.list({
                q: `name='${this.driveFileName}' and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime)'
            });
            
            const files = response.result.files;
            if (files && files.length > 0) {
                // Arquivo encontrado
                this.driveFileId = files[0].id;
                return this.driveFileId;
            }
            
            // Criar novo arquivo
            const fileMetadata = {
                name: this.driveFileName,
                mimeType: 'application/json'
            };
            
            const createResponse = await this.driveAPI.files.create({
                resource: fileMetadata,
                fields: 'id'
            });
            
            this.driveFileId = createResponse.result.id;
            return this.driveFileId;
        } catch (error) {
            console.error('Erro ao encontrar/criar arquivo no Drive:', error);
            throw error;
        }
    }

    /**
     * Atualiza o conteúdo do arquivo no Drive
     * @param {string} content - Conteúdo criptografado
     */
    async updateDriveFile(content) {
        if (!this.driveFileId) {
            throw new Error('ID do arquivo não encontrado');
        }
        
        try {
            // Criar blob com o conteúdo
            const blob = new Blob([content], { type: 'application/json' });
            
            // Fazer upload do conteúdo
            await this.driveAPI.files.update({
                fileId: this.driveFileId,
                media: {
                    body: blob
                }
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar arquivo no Drive:', error);
            throw error;
        }
    }

    /**
     * Restaura dados do Google Drive
     */
    async restoreFromDrive() {
        if (!this.isAuthenticated) {
            throw new Error('Não autenticado');
        }
        
        try {
            // Inicializa a API se necessário
            if (!this.driveInitialized) {
                await this.initGoogleDriveAPI();
            }

            // Verifica se está conectado
            if (!this.driveClient || !this.driveClient.isSignedIn.get()) {
                await this.connectToDrive();
            }

            // Verifica se o arquivo existe
            if (!this.driveFileId) {
                await this.findOrCreateDriveFile();
            }
            
            if (!this.driveFileId) {
                throw new Error('Nenhum backup encontrado no Drive. Faça uma sincronização primeiro.');
            }
            
            // Baixa o arquivo
            const response = await this.driveAPI.files.get({
                fileId: this.driveFileId,
                alt: 'media'
            });
            
            const encryptedData = response.body;
            
            // Descriptografa dados
            const decryptedData = this.decrypt(encryptedData, this.currentPin);
            const restoredData = JSON.parse(decryptedData);
            
            // Atualiza dados locais
            this.data = restoredData;
            this.saveData();
            
            // Atualiza data de sincronização
            const now = new Date().toISOString();
            this.driveConfig.lastSync = now;
            localStorage.setItem(this.driveConfigKey, JSON.stringify(this.driveConfig));
            
            return {
                success: true,
                timestamp: now,
                notesCount: this.data.notes.length,
                message: 'Dados restaurados com sucesso!'
            };
        } catch (error) {
            console.error('Erro ao restaurar do Google Drive:', error);
            throw new Error(`Falha na restauração: ${error.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * Atualiza configurações do Google Drive
     * @param {Object} config - Configurações
     */
    updateDriveConfig(config) {
        if (!this.driveConfig) {
            this.driveConfig = {
                enabled: false,
                autoSync: false,
                email: null,
                lastSync: null
            };
        }
        
        this.driveConfig = {
            ...this.driveConfig,
            ...config
        };
        
        localStorage.setItem(this.driveConfigKey, JSON.stringify(this.driveConfig));
        return this.driveConfig;
    }

    /**
     * Obtém configurações do Google Drive
     */
    getDriveConfig() {
        return this.driveConfig;
    }
}

// Criar instância global
const secureStorage = new SecureStorage();
