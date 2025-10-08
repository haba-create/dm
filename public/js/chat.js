// Gallery Chat Widget - Custom Implementation
class GalleryChat {
    constructor() {
        this.conversationHistory = [];
        this.isOpen = false;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.createChatWidget();
        this.attachEventListeners();
    }

    createChatWidget() {
        // Create chat container
        const chatHTML = `
            <div id="gallery-chat" class="gallery-chat-container">
                <!-- Chat Toggle Button -->
                <button id="chat-toggle" class="chat-toggle" aria-label="Open chat">
                    <svg class="chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg class="close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h3>Daamitha Gallery Assistant</h3>
                            <p class="chat-status">Online</p>
                        </div>
                    </div>

                    <div id="chat-messages" class="chat-messages">
                        <div class="welcome-message">
                            <div class="agent-avatar">🎨</div>
                            <div class="message-content">
                                <p><strong>Namaste! I'm Daamitha's AI assistant.</strong></p>
                                <p>I'm here to help you explore the gallery, learn about the paintings, and answer any questions about the artist's work and cultural inspiration.</p>
                                <p>How may I assist you today?</p>
                            </div>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <textarea
                            id="chat-input"
                            class="chat-input"
                            placeholder="Ask about paintings, artist, or commissions..."
                            rows="1"
                        ></textarea>
                        <button id="chat-send" class="chat-send-button" aria-label="Send message">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chat-toggle');
        const sendBtn = document.getElementById('chat-send');
        const input = document.getElementById('chat-input');

        toggleBtn.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => this.autoResize(input));
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const toggleBtn = document.getElementById('chat-toggle');

        if (this.isOpen) {
            chatWindow.classList.add('open');
            toggleBtn.classList.add('open');
            document.getElementById('chat-input').focus();
        } else {
            chatWindow.classList.remove('open');
            toggleBtn.classList.remove('open');
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || this.isLoading) return;

        // Add user message to UI
        this.addMessageToUI('user', message);
        input.value = '';
        input.style.height = 'auto';

        // Show loading indicator
        this.setLoading(true);

        try {
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    conversationHistory: this.conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Update conversation history
            this.conversationHistory = data.conversationHistory;

            // Add assistant response to UI
            this.addMessageToUI('assistant', data.response);

        } catch (error) {
            console.error('Chat error:', error);
            this.addMessageToUI('error', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    addMessageToUI(role, content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content user-content">
                    <p>${this.escapeHtml(content)}</p>
                </div>
            `;
        } else if (role === 'assistant') {
            messageDiv.innerHTML = `
                <div class="agent-avatar">🎨</div>
                <div class="message-content">
                    <p>${this.formatMessage(content)}</p>
                </div>
            `;
        } else if (role === 'error') {
            messageDiv.innerHTML = `
                <div class="message-content error-content">
                    <p>${this.escapeHtml(content)}</p>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const sendBtn = document.getElementById('chat-send');
        const input = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('chat-messages');

        if (loading) {
            sendBtn.classList.add('loading');
            input.disabled = true;

            // Add typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.className = 'chat-message assistant-message typing-indicator';
            typingDiv.id = 'typing-indicator';
            typingDiv.innerHTML = `
                <div class="agent-avatar">🎨</div>
                <div class="message-content">
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            sendBtn.classList.remove('loading');
            input.disabled = false;

            // Remove typing indicator
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
    }

    formatMessage(text) {
        // Basic markdown-like formatting
        return this.escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new GalleryChat());
} else {
    new GalleryChat();
}
