/**
 * Notas Seguras - Aplicativo Principal
 * Gerencia a interface do usuário e a lógica do aplicativo
 */

// Configurações do Google Drive
const GOOGLE_API_KEY = 'AIzaSyCBEiN7MzQLJ5mNjubdhjzBMys1Z_MwmZU';
const GOOGLE_CLIENT_ID = '407660085834-8s0pohe42hiu474vhd617a84bvnmq46m.apps.googleusercontent.com';

class NotasSeguras {
    constructor() {
        // [Previous constructor code remains the same...]
    }
    
    /**
     * Sincroniza dados com o Google Drive
     */
    async syncWithDrive() {
        const syncBtn = document.getElementById('sync-btn');
        const syncStatus = document.getElementById('sync-status');
        
        try {
            syncBtn.disabled = true;
            syncStatus.textContent = 'Sincronizando...';
            
            const result = await secureStorage.syncWithDrive();
            
            if (result.success) {
                syncStatus.textContent = result.message;
                this.updateDriveStatus();
            }
        } catch (error) {
            console.error('Erro ao sincronizar com Google Drive:', error);
            syncStatus.textContent = `Erro: ${error.message || 'Falha na sincronização'}`;
        } finally {
            syncBtn.disabled = false;
            
            // Limpar status após 5 segundos
            setTimeout(() => {
                syncStatus.textContent = '';
            }, 5000);
        }
    }

    // [Rest of the class implementation remains the same...]
}

// Inicializar aplicativo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotasSeguras();
});
