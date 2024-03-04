
import sessionRepository from './sessionRepository.js';

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

const requestAsync = async (url, method, bodyObj = null) => {
  const body = JSON.stringify(bodyObj);
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  return fetch(url, {method, headers, body});
};

export default class Database {
  #sessionId = null;
  #source = null;

  constructor(sessionId, source) {
    this.#sessionId = sessionId;
    this.#source = source;
    this.ext = {};
  }

  source() {
    return this.#source;
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

  async $$(query, raw = false) {
    let p = await requestAsync(`${endpoint}/Database/query`, 'POST', { 
      SessionId: this.#sessionId,
      Query: query,
    });
    if(!raw) {
      p = JSON.parse(await p.json());
    }
    return p;
  }

  #closeSession() {
    let res = requestSync(`${endpoint}/Database/session/close`, 'POST', { 
      SessionId: this.#sessionId,
    });
    sessionRepository.unregisterSession(this.#sessionId);
    return true;
  }

  async #$closeSession() {
    let res = await requestAsync(`${endpoint}/Database/session/close`, 'POST', { 
      SessionId: this.#sessionId,
    });
    sessionRepository.unregisterSession(this.#sessionId);
    return true;
  }

  close() {
    return this.#closeSession();
  }

  async $close() {
    return await this.#$closeSession();
  }
};

