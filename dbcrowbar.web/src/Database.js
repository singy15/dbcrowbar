
const endpoint = import.meta.env.VITE_API_ENDPOINT;

const requestSync = (url, method, body = null) => {
  const request = new XMLHttpRequest();
  request.open(method, url, false);
  if(body != null) {
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify(body));
  }
  
  if (request.status === 200) {
    return JSON.parse(request.responseText);
  } else {
    throw new Error("Error on request.");
  }
};

export default class Database {
  #sessionId = null;

  constructor(sessionId) {
    this.#sessionId = sessionId;
    this.ext = {};
  }

  #addExtensionImpl(extension) {
    this.ext[extension.name] = extension.implement(this);
  }

  addExtension(extension) {
    this.#addExtensionImpl(extension);
  }

  $(query) {
    let res = requestSync(`${endpoint}/Database/query`, 'POST', { 
      SessionId: this.#sessionId,
      Query: query,
    });
    return res;
  }

  #closeSession() {
    let res = requestSync(`${endpoint}/Database/session/close`, 'POST', { 
      SessionId: this.#sessionId,
    });
    postSessionClose(this.#sessionId);
    return true;
  }

  close() {
    return this.#closeSession();
  }
};

