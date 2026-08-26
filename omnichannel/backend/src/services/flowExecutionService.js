import pool from '../config/db.js';
import * as waService from './waGatewayService.js';
import crypto from 'crypto';

/**
 * Main Flow Execution Engine for React Flow JSON
 */
export const processFlow = async (organization_id, conversationId, contactPhone, sessionId, io, incomingText) => {
    // 1. Get Conversation State
    const convRes = await pool.query(
        'SELECT current_flow_id, current_node_id, system_metadata FROM conversations WHERE id = $1 AND organization_id = $2',
        [conversationId, organization_id]
    );
    if (convRes.rows.length === 0) return { handled: false };

    let { current_flow_id, current_node_id, system_metadata } = convRes.rows[0];
    system_metadata = system_metadata || {};
    system_metadata.flow_variables = system_metadata.flow_variables || {};

    let flowData = null;

    // 2. Check for Trigger Keyword if no flow is active
    if (!current_flow_id) {
        if (!incomingText) return { handled: false };
        const textUpper = incomingText.trim().toUpperCase();
        
        const triggerRes = await pool.query(
            "SELECT id, nodes, edges FROM chat_flows WHERE organization_id = $1 AND is_active = true AND trigger_keyword = $2 LIMIT 1",
            [organization_id, textUpper]
        );

        if (triggerRes.rows.length === 0) return { handled: false };

        flowData = triggerRes.rows[0];
        current_flow_id = flowData.id;
        
        let nodes = typeof flowData.nodes === 'string' ? JSON.parse(flowData.nodes) : flowData.nodes;
        let edges = typeof flowData.edges === 'string' ? JSON.parse(flowData.edges) : flowData.edges;
        
        const targetNodeIds = new Set(edges.map(e => e.target));
        const startNode = nodes.find(n => !targetNodeIds.has(n.id) || n.type === 'trigger' || n.type === 'start');
        
        if (!startNode) return { handled: false }; // Malformed flow
        
        current_node_id = startNode.id;
        console.log(`[FlowEngine] Flow ${current_flow_id} triggered for conversation ${conversationId}`);
    } else {
        // Load active flow
        const flowRes = await pool.query(
            "SELECT nodes, edges FROM chat_flows WHERE id = $1 AND organization_id = $2 AND is_active = true",
            [current_flow_id, organization_id]
        );
        if (flowRes.rows.length === 0) {
            // Flow deleted or deactivated, reset state
            await clearFlowState(conversationId);
            return { handled: false };
        }
        flowData = flowRes.rows[0];
    }

    let nodes = typeof flowData.nodes === 'string' ? JSON.parse(flowData.nodes) : flowData.nodes;
    let edges = typeof flowData.edges === 'string' ? JSON.parse(flowData.edges) : flowData.edges;

    // 3. Execution Loop
    let currentNode = nodes.find(n => n.id === current_node_id);
    let keepRunning = true;
    let handled = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 50;

    while (keepRunning && currentNode) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
            console.error(`[FlowEngine] Infinite loop detected for Flow ${current_flow_id}. Aborting.`);
            break;
        }

        console.log(`[FlowEngine] Executing Node: ${currentNode.id} (${currentNode.type})`);
        
        let nextNodeId = null;

        switch (currentNode.type) {
            case 'trigger':
            case 'start':
                // Just pass through
                nextNodeId = getNextNode(currentNode.id, edges);
                break;

            case 'sendMessage':
            case 'message':
                if (currentNode.data?.text) {
                    let text = currentNode.data.text;
                    Object.keys(system_metadata.flow_variables).forEach(key => {
                        text = text.replace(new RegExp(`{{${key}}}`, 'g'), system_metadata.flow_variables[key]);
                    });
                    
                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, text, io);
                }
                nextNodeId = getNextNode(currentNode.id, edges);
                break;

            case 'askQuestion':
            case 'waitInput':
                if (!system_metadata.waiting_for_input) {
                    if (currentNode.data?.text) {
                        await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, currentNode.data.text, io);
                    }
                    system_metadata.waiting_for_input = true;
                    keepRunning = false; // Pause execution
                } else {
                    const varName = currentNode.data?.variableName || 'last_input';
                    system_metadata.flow_variables[varName] = incomingText;
                    system_metadata.waiting_for_input = false;
                    
                    nextNodeId = getNextNode(currentNode.id, edges);
                }
                break;

            case 'condition':
                const conditionVar = currentNode.data?.variableName || 'last_input';
                const conditionVal = currentNode.data?.value || '';
                const userVal = system_metadata.flow_variables[conditionVar] || '';
                
                let isMatch = false;
                if (currentNode.data?.operator === 'contains') {
                    isMatch = userVal.toLowerCase().includes(conditionVal.toLowerCase());
                } else {
                    isMatch = userVal.toLowerCase() === conditionVal.toLowerCase();
                }

                const trueEdge = edges.find(e => e.source === currentNode.id && (e.sourceHandle === 'true' || e.label === 'True' || e.sourceHandle === 'a'));
                const falseEdge = edges.find(e => e.source === currentNode.id && (e.sourceHandle === 'false' || e.label === 'False' || e.sourceHandle === 'b'));

                if (isMatch && trueEdge) nextNodeId = trueEdge.target;
                else if (!isMatch && falseEdge) nextNodeId = falseEdge.target;
                else nextNodeId = getNextNode(currentNode.id, edges); // Fallback
                break;

            case 'interactive_buttons':
            case 'buttons':
            case 'listMenu':
                if (!system_metadata.waiting_for_input) {
                    const header = currentNode.data?.text || currentNode.data?.header || 'Silakan pilih menu berikut:';
                    const buttons = currentNode.data?.buttons || currentNode.data?.options || [];
                    
                    let formattedText = header;
                    if (buttons.length > 0) {
                        formattedText += '\n\n' + buttons.map((b, idx) => `${idx + 1}. ${b.text || b.label || b}`).join('\n');
                    }
                    
                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, formattedText, io);
                    system_metadata.waiting_for_input = true;
                    system_metadata.active_button_node = currentNode.id;
                    keepRunning = false;
                } else {
                    const varName = currentNode.data?.variableName || 'selected_option';
                    system_metadata.flow_variables[varName] = incomingText;
                    system_metadata.waiting_for_input = false;
                    
                    // Match choice to specific branch handle if configured
                    const cleanChoice = (incomingText || '').trim().toLowerCase();
                    const branchEdge = edges.find(e => 
                        e.source === currentNode.id && 
                        (e.sourceHandle?.toLowerCase() === cleanChoice || e.label?.toLowerCase() === cleanChoice)
                    );
                    
                    nextNodeId = branchEdge ? branchEdge.target : getNextNode(currentNode.id, edges);
                }
                break;

            case 'delay': {
                const delayMs = Math.min(5000, Math.max(500, Number(currentNode.data?.delaySeconds || 1) * 1000));
                await new Promise(resolve => setTimeout(resolve, delayMs));
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'http_request':
            case 'webhook': {
                const url = currentNode.data?.url;
                const method = (currentNode.data?.method || 'GET').toUpperCase();
                const responseVar = currentNode.data?.responseVariable || 'api_response';

                if (url) {
                    try {
                        const axios = (await import('axios')).default;
                        let apiRes;
                        if (method === 'POST') {
                            apiRes = await axios.post(url, {
                                phone: contactPhone,
                                variables: system_metadata.flow_variables
                            }, { timeout: 5000 });
                        } else {
                            apiRes = await axios.get(url, {
                                params: { phone: contactPhone, ...system_metadata.flow_variables },
                                timeout: 5000
                            });
                        }
                        system_metadata.flow_variables[responseVar] = typeof apiRes.data === 'object' ? JSON.stringify(apiRes.data) : String(apiRes.data);
                    } catch (apiErr) {
                        console.warn(`[FlowEngine] HTTP Request Node failed: ${apiErr.message}`);
                        system_metadata.flow_variables[responseVar] = 'ERROR';
                    }
                }
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'handoff':
            case 'escalate':
                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                io?.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true, reason: 'Flow Handoff Node' });
                await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, "Menyambungkan ke Agen...", io);
                
                nextNodeId = null;
                break;

            default:
                console.warn(`[FlowEngine] Unknown node type: ${currentNode.type}`);
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
        }

        if (keepRunning) {
            current_node_id = nextNodeId;
            currentNode = nodes.find(n => n.id === current_node_id);
            if (!currentNode) {
                // Flow finished
                keepRunning = false;
                current_flow_id = null;
                current_node_id = null;
                system_metadata.waiting_for_input = false;
            }
        }
    }

    // 4. Save State
    await pool.query(
        'UPDATE conversations SET current_flow_id = $1, current_node_id = $2, system_metadata = $3 WHERE id = $4',
        [current_flow_id, current_node_id, JSON.stringify(system_metadata), conversationId]
    );

    return { handled };
};

const getNextNode = (sourceId, edges) => {
    const edge = edges.find(e => e.source === sourceId);
    return edge ? edge.target : null;
};

const clearFlowState = async (conversationId) => {
    await pool.query(
        "UPDATE conversations SET current_flow_id = NULL, current_node_id = NULL, system_metadata = system_metadata - 'waiting_for_input' WHERE id = $1",
        [conversationId]
    );
};

const sendMessageToContact = async (conversationId, orgId, phone, sessionId, text, io) => {
    const tempWaMessageId = `flow.res.${crypto.randomUUID()}`;
    const insertRes = await pool.query(
        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING id', 
        [conversationId, orgId, 'text', text, 'sent', tempWaMessageId]
    );
    const dbMessageId = insertRes.rows[0]?.id;
    
    if (io) {
        io.to(`org_${orgId}`).emit('new_message', { 
            conversationId, 
            message: { id: dbMessageId || tempWaMessageId, wa_message_id: tempWaMessageId, content: text, type: 'text', from_me: true, status: 'sent' }
        });
    }
    
    await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [text, conversationId]);
    
    try {
        const sendResult = await waService.sendText(sessionId, phone, text);
        const realWamid = sendResult?.data?.key?.id || sendResult?.messageId || sendResult?.id || sendResult?.key?.id;
        if (realWamid && dbMessageId) {
            await pool.query('UPDATE messages SET wa_message_id = $1 WHERE id = $2', [realWamid, dbMessageId]);
        }
    } catch (sendErr) {
        console.error('[FlowEngine] Error sending text to contact:', sendErr.message);
        if (dbMessageId) {
            await pool.query("UPDATE messages SET status = 'failed' WHERE id = $1", [dbMessageId]);
        }
    }
};
