export default (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_organization', (orgId) => {
      if (orgId) {
        const roomName = `org_${orgId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on('join_visitor', (visitorId) => {
        if (visitorId) {
            const roomName = `visitor_${visitorId}`;
            socket.join(roomName);
            console.log(`Socket ${socket.id} joined visitor room: ${roomName}`);
        }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // --- AGENT COLLISION DETECTION ---
    socket.on('agent_presence', (data) => {
        // data: { orgId, conversationId, agentId, agentName, action: 'viewing' | 'typing' | 'blur' }
        if (data && data.orgId) {
            // Broadcast to everyone else in the organization room
            socket.to(`org_${data.orgId}`).emit('agent_presence_update', data);
        }
    });
  });
};