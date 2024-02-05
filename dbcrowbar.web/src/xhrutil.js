
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

export default {
  requestSync: requestSync
};

