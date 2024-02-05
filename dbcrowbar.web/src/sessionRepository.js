
const endpoint = import.meta.env.VITE_API_ENDPOINT;

let sessions = {};

const sendHeartbeat = (sessionId) => {
  fetch(`${endpoint}/Database/session/heartbeat`, {
    method:"POST", 
    body:JSON.stringify({
      SessionId: sessionId
    }), 
    headers: {"Content-Type": "application/json"} 
  })
    .then(res => res.json())
    .then(json => json);
};

export default {
  registerSession(sessionId, db) {
    sessions[sessionId] = {
      instanceDatabase: db,
      heartbeatInterval: setInterval(() => {
        sendHeartbeat(sessionId);
      }, 1000 * 10)
    };
  },
  unregisterSession(sessionId) {
    let entry = sessions[sessionId];
    clearInterval(entry.heartbeatInterval);
    delete sessions[sessionId];
    entry = null;
  }
};
