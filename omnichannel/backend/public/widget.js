
(function() {
    const WIDGET_ID = window.REPLY_WIDGET_ID;
    const BASE_URL = document.currentScript ? document.currentScript.src.split('/widget.js')[0] : window.location.origin;
    
    if (!WIDGET_ID) { console.error("[Cloudchat.id] Widget ID missing"); return; }

    let config = {};
    let visitorId = localStorage.getItem('reply_visitor_id');
    let sessionToken = localStorage.getItem('reply_session_token');
    let socket = null;
    let pollInterval = null;
    let isChatStarted = !!sessionToken;
    let unreadCount = 0;
    let lastMessageId = 0; 
    const notificationSound = new Audio(`${BASE_URL}/sounds/webchat.mp3`); 

    // --- FONT & STYLES ---
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.innerHTML = `
        #reply-widget-container { 
            position: fixed; 
            z-index: 2147483647; /* Max Z-Index */
            bottom: 20px; 
            right: 20px; 
            font-family: 'Poppins', sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: flex-end; 
            pointer-events: none; /* Container pass-through */
        }
        #reply-widget-container * {
            box-sizing: border-box;
        }
        #reply-widget-launcher, #reply-widget-window {
            pointer-events: auto; /* Restore pointer events for children */
        }
        #reply-widget-launcher { 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            transition: transform 0.2s; 
            margin-top: 16px; 
            position: relative; 
        }
        #reply-widget-launcher:hover { transform: scale(1.05); }
        #reply-unread-badge { position: absolute; top: -5px; right: -5px; background-color: #ef4444; color: white; border-radius: 9999px; padding: 2px 6px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: none; border: 2px solid white; min-width: 18px; text-align: center; z-index: 20; }
        #reply-widget-window { width: 360px; height: 550px; background: white; border-radius: 16px; box-shadow: 0 5px 40px rgba(0,0,0,0.16); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; opacity: 0; transform: translateY(20px); transition: opacity 0.3s, transform 0.3s; }
        #reply-widget-window.open { display: flex; opacity: 1; transform: translateY(0); }
        .reply-header { padding: 16px; color: white; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .reply-body { flex: 1; background: #f9fafb; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .reply-footer { padding: 12px; border-top: 1px solid #f3f4f6; background: white; display: flex; gap: 8px; flex-shrink: 0; align-items: flex-end; }
        .reply-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 20px; padding: 10px 16px; font-size: 14px; outline: none; font-family: 'Poppins', sans-serif; max-height: 100px; resize: none; }
        .reply-send-btn, .reply-attach-btn { width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.2s; }
        .reply-send-btn { background: #6366F1; color: white; }
        .reply-attach-btn { background: #f3f4f6; color: #6b7280; }
        .reply-attach-btn:hover { background: #e5e7eb; }
        .reply-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .reply-msg.bot { background: white; border-bottom-left-radius: 4px; align-self: flex-start; color: #374151; border: 1px solid #f3f4f6; }
        .reply-msg.user { background: #6366F1; color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
        .reply-media-img { max-width: 100%; border-radius: 8px; margin-bottom: 4px; cursor: pointer; }
        .reply-media-video { max-width: 100%; border-radius: 8px; }
        .reply-file-link { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.05); padding: 8px; border-radius: 8px; text-decoration: none; color: inherit; font-size: 12px; font-weight: 600; margin-top: 4px; }
        .reply-msg a { text-decoration: underline; color: inherit; font-weight: 500; }
        .reply-msg.bot a { color: #2563eb; }
        .reply-loader { border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .reply-form input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 14px; box-sizing: border-box; }
        .reply-form button { width: 100%; padding: 12px; background: #6366F1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; box-sizing: border-box; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div'); container.id = 'reply-widget-container';
    const windowEl = document.createElement('div'); windowEl.id = 'reply-widget-window';
    const launcher = document.createElement('div'); launcher.id = 'reply-widget-launcher';
    const badge = document.createElement('div'); badge.id = 'reply-unread-badge';
    const fileInput = document.createElement('input'); 
    fileInput.type = 'file'; fileInput.style.display = 'none';
    
    container.appendChild(windowEl);
    container.appendChild(launcher);
    container.appendChild(fileInput);
    document.body.appendChild(container);

    // BIND CLICK EVENT DIRECTLY TO LAUNCHER
    launcher.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });

    const playNotification = () => { try { notificationSound.play().catch(()=>{}); } catch(e){} };
    
    const resetSession = () => {
        localStorage.removeItem('reply_session_token');
        sessionToken = null;
        isChatStarted = false;
        stopPolling();
        render(); 
    };

    const updateLauncherIcon = (isOpen) => {
        const width = config.appearance?.launcher_width || 60;
        const height = config.appearance?.launcher_height || 60;
        const primaryColor = config.appearance?.primary_color || '#6366F1';
        
        if (isOpen) {
             launcher.style.cssText = `width:60px;height:60px;background-color:${primaryColor};border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;`;
             launcher.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
             badge.style.display = 'none';
             unreadCount = 0;
        } else {
             launcher.style.width = `${width}px`;
             launcher.style.height = `${height}px`;
             
             if (config.appearance?.launcher_logo_url) {
                 launcher.style.backgroundColor = 'transparent';
                 launcher.style.boxShadow = 'none';
                 // Fallback Logic: If image fails, hide img and show fallback div. 
                 // If success, fallback div is hidden by default via style.
                 const imgHtml = `<img src="${BASE_URL}${config.appearance.launcher_logo_url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />`;
                 const fallbackHtml = `<div style="display:none;width:100%;height:100%;background-color:${primaryColor};border-radius:50%;align-items:center;justify-content:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>`;
                 launcher.innerHTML = imgHtml + fallbackHtml;
             } else {
                 launcher.style.backgroundColor = primaryColor;
                 launcher.style.borderRadius = '50%';
                 launcher.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                 launcher.style.display = 'flex';
                 launcher.style.alignItems = 'center';
                 launcher.style.justifyContent = 'center';
                 launcher.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
             }
             launcher.appendChild(badge);
             badge.style.display = unreadCount > 0 ? 'block' : 'none';
             badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
        }
    };

    const loadSocket = () => {
        if (!window.io) {
            const script = document.createElement('script');
            script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
            script.onload = initSocket;
            document.body.appendChild(script);
        } else initSocket();
    };

    const initSocket = () => {
        if (!visitorId || (socket && socket.connected)) return;
        socket = io(BASE_URL, { reconnection: true, transports: ['polling', 'websocket'] });
        socket.on('connect', () => { socket.emit('join_visitor', visitorId); });
        socket.on('new_message', (data) => {
            const message = data.message || data;
            if (!message.from_me) return;
            if (message.id > lastMessageId) {
                lastMessageId = message.id;
                if (!windowEl.classList.contains('open')) {
                    unreadCount++;
                    updateLauncherIcon(false);
                    playNotification();
                } else {
                    playNotification();
                    fetchHistory();
                }
            }
        });
    };

    const linkify = (text) => {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    };

    const renderMessage = (msg) => {
        const div = document.createElement('div');
        div.className = `reply-msg ${msg.from_me ? 'bot' : 'user'}`;
        
        let contentHtml = '';
        if (msg.type === 'image' && msg.media_url) {
            contentHtml += `<img src="${BASE_URL}${msg.media_url}" class="reply-media-img" onclick="window.open(this.src)" />`;
            if (msg.content) contentHtml += `<div style="margin-top:4px;">${linkify(msg.content)}</div>`;
        } else if (msg.type === 'video' && msg.media_url) {
            contentHtml += `<video src="${BASE_URL}${msg.media_url}" controls class="reply-media-video"></video>`;
            if (msg.content) contentHtml += `<div style="margin-top:4px;">${linkify(msg.content)}</div>`;
        } else if ((msg.type === 'document' || msg.type === 'audio') && msg.media_url) {
            const fname = msg.content || 'Attachment';
            contentHtml += `<a href="${BASE_URL}${msg.media_url}" target="_blank" class="reply-file-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ${fname}</a>`;
        } else {
            contentHtml = linkify(msg.content);
        }
        
        div.innerHTML = contentHtml;
        return div;
    };

    const fetchHistory = async () => {
        if (!sessionToken) return;
        try {
            const res = await fetch(`${BASE_URL}/api/public/webchat/messages`, {
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            });
            if (res.status === 401 || res.status === 403) { resetSession(); return; }
            if (!res.ok) return;
            
            const messages = await res.json();
            const msgList = document.getElementById('reply-messages');
            if (!msgList) return;

            msgList.innerHTML = '';
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'reply-msg bot';
            welcomeDiv.innerText = config.text.welcome || 'Hello!';
            msgList.appendChild(welcomeDiv);

            messages.forEach(msg => msgList.appendChild(renderMessage(msg)));
            msgList.scrollTop = msgList.scrollHeight;

            if (messages.length > 0) {
                const last = messages[messages.length-1];
                if(last.id > lastMessageId) {
                    lastMessageId = last.id;
                    if(!windowEl.classList.contains('open')) {
                        unreadCount++; updateLauncherIcon(false); playNotification();
                    }
                }
            }
        } catch (e) {}
    };

    const startPolling = () => {
        if (pollInterval) clearInterval(pollInterval);
        fetchHistory();
        pollInterval = setInterval(fetchHistory, 3000);
    };
    const stopPolling = () => { if (pollInterval) clearInterval(pollInterval); };

    const render = () => {
        const color = config.appearance.primary_color || '#6366F1';
        updateLauncherIcon(false);
        if (config.appearance.position === 'bottom-left') {
            container.style.right = 'auto'; container.style.left = '20px'; container.style.alignItems = 'flex-start';
        }

        windowEl.innerHTML = `
            <div class="reply-header" style="background-color: ${color}">
                ${config.appearance.show_agent_face ? `<img src="${config.appearance.logo_url ? BASE_URL + config.appearance.logo_url : 'https://ui-avatars.com/api/?name=Support'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;background:white;">` : ''}
                <div><div style="font-weight:600;font-size:14px;">Chat Support</div><div style="font-size:11px;opacity:0.9;">Online</div></div>
                <div id="reply-close" style="margin-left:auto;cursor:pointer;">✕</div>
            </div>
            <div class="reply-body" id="reply-messages">
                ${!isChatStarted ? renderForm() : `<div class="reply-msg bot">${config.text.welcome}</div>`}
            </div>
            ${isChatStarted ? renderFooter(color) : ''}
        `;
        
        document.getElementById('reply-close').onclick = (e) => { e.stopPropagation(); toggle(); };
        
        if(!isChatStarted) document.getElementById('reply-start-btn')?.addEventListener('click', startChat);
        else attachListeners();
    };

    const renderForm = () => `
        <div class="reply-msg bot">${config.text.welcome}</div>
        <div style="flex:1;"></div>
        <div class="reply-form">
            <p style="font-size:12px;color:#6b7280;margin-bottom:10px;font-weight:bold;text-transform:uppercase;">Start Chatting</p>
            ${config.form.require_name ? `<input id="reply-name" placeholder="Name" />` : ''}
            ${config.form.require_email ? `<input id="reply-email" placeholder="Email" />` : ''}
            ${config.form.require_phone ? `<input id="reply-phone" placeholder="Phone" />` : ''}
            <button id="reply-start-btn" style="background-color:${config.appearance.primary_color}">Start Chat</button>
        </div>
    `;

    const renderFooter = (color) => `
        <div class="reply-footer">
            <button id="reply-attach-btn" class="reply-attach-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
            <textarea id="reply-input" class="reply-input" rows="1" placeholder="Type a message..."></textarea>
            <button id="reply-send-btn" class="reply-send-btn" style="background-color:${color}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </div>
    `;

    const attachListeners = () => {
        const btn = document.getElementById('reply-send-btn');
        const attach = document.getElementById('reply-attach-btn');
        const input = document.getElementById('reply-input');
        
        if(btn) btn.onclick = () => sendMessage(input.value);
        if(input) {
            input.onkeypress = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }};
        }
        if(attach) attach.onclick = () => fileInput.click();
        
        fileInput.onchange = uploadFile;
    };

    const uploadFile = async () => {
        const file = fileInput.files[0];
        if(!file) return;
        
        // Optimistic UI: Show uploading spinner or message
        const msgList = document.getElementById('reply-messages');
        const div = document.createElement('div');
        div.className = 'reply-msg user';
        div.innerHTML = `<div class="reply-loader"></div> Uploading ${file.name}...`;
        msgList.appendChild(div);
        msgList.scrollTop = msgList.scrollHeight;

        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch(`${BASE_URL}/api/public/webchat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sessionToken}` },
                body: formData
            });
            
            div.remove(); // Remove loader

            if (res.ok) {
                const data = await res.json();
                await sendMessage(file.name, data.url, data.mimetype);
            } else {
                console.error("Upload failed");
            }
        } catch (e) { div.innerHTML = "Upload Failed"; }
        fileInput.value = null;
    };

    const toggle = () => {
        const isOpen = windowEl.classList.contains('open');
        if (isOpen) {
            windowEl.classList.remove('open');
            updateLauncherIcon(false);
        } else {
            windowEl.classList.add('open');
            unreadCount = 0;
            updateLauncherIcon(true);
            if (isChatStarted) fetchHistory(); 
        }
    };

    const startChat = async () => {
        const nameEl = document.getElementById('reply-name');
        const payload = {
            widget_uid: WIDGET_ID,
            visitor_id: visitorId, 
            name: nameEl ? nameEl.value : undefined,
            email: document.getElementById('reply-email')?.value,
            phone: document.getElementById('reply-phone')?.value
        };
        try {
            const res = await fetch(`${BASE_URL}/api/public/webchat/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.token) {
                sessionToken = data.token;
                visitorId = data.visitor_id;
                localStorage.setItem('reply_session_token', sessionToken);
                localStorage.setItem('reply_visitor_id', visitorId);
                isChatStarted = true;
                render(); loadSocket(); startPolling();
            }
        } catch (e) { console.error(e); }
    };

    const sendMessage = async (text, mediaUrl = null, mimetype = null) => {
        if (!text.trim() && !mediaUrl) return;
        const msgList = document.getElementById('reply-messages');
        
        if (!mediaUrl) {
            const div = document.createElement('div');
            div.className = `reply-msg user`;
            div.innerHTML = linkify(text);
            msgList.appendChild(div);
        }
        msgList.scrollTop = msgList.scrollHeight;
        
        const input = document.getElementById('reply-input');
        if(input) input.value = '';

        try {
            const payload = { text };
            if (mediaUrl) {
                payload.media_url = mediaUrl;
                payload.mimetype = mimetype;
                payload.filename = text; // Use text as filename caption
            }

            const res = await fetch(`${BASE_URL}/api/public/webchat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
                body: JSON.stringify(payload)
            });
            
            if (res.status === 401 || res.status === 403) resetSession();
            // If success, the socket or poll will add the real message bubble with correct styling (especially media)
            // We remove the optimistic text bubble if it was media send to avoid dupe or flash
            if (mediaUrl) setTimeout(fetchHistory, 500); 

        } catch (e) { console.error(e); }
    };

    const init = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/public/webchat/config/${WIDGET_ID}`);
            if (!res.ok) throw new Error("Config Load Failed");
            config = await res.json();
            render();
            if (isChatStarted) { loadSocket(); startPolling(); }
        } catch (e) { container.style.display = 'none'; }
    };

    init();
})();

