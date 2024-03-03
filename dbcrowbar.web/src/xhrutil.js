
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

export default {
  requestSync: requestSync,
  requestAsync: requestAsync,
};

