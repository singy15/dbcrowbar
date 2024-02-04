
function querySync(sql) {
  const request = new XMLHttpRequest();
  const endpoint = 'https://localhost:7016';
  const param = (new URLSearchParams({query: sql})).toString();
  request.open("GET", `${endpoint}/Database?${param}`, false);
  request.send(null);
  
  if (request.status === 200) {
    return JSON.parse(request.responseText);
  } else {
    throw new Error("Error on execute query");
  }
}

function connect(connString) {
  let db = {
    connectionString: connString,
  };
  
  let handler = {
    get(target, prop, receiver) {
      return target[prop];
    }
  };
  return new Proxy(db, handlerDb);
}  

