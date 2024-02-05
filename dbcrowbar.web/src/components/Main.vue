<script>
import Layout from './Layout.vue';
import Editor from './Editor.vue';
import Database from '../Database.js';

const endpoint = import.meta.env.VITE_API_ENDPOINT;

const sessionRepository = {};

const extensionRepository = {};

const postSessionClose = (sessionId) => {
  let entry = sessionRepository[sessionId];
  clearInterval(entry.heartbeatInterval);
  delete sessionRepository[sessionId];
  entry = null;
};

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

let implementClient = (window) => {
  window.connect = function(source, opt = {}) {
    let res = requestSync(`${endpoint}/Database/session/connect`, 'POST', { Source: source });
    let db = new Database(res.SessionId);
    let sessionId = res.SessionId;

    sessionRepository[res.SessionId] = {
      instanceDatabase: db,
      heartbeatInterval: setInterval(() => {
        sendHeartbeat(sessionId);
      }, 1000 * 10),
    };

    return db;
  };
};


let exampleCode = `// Write JavaScript code here.
// Select code and press Ctrl+Enter to evaluate.

function example1() {
  return querySync(\`select * from sampletable\`);
}

function example2(name) {
  console.log("hello, " + name);
}

// Press "Reset" to reset current context.
`;

let storageKeyCode = "/dbcrowbar/code";

function storageExists(key) {
  let val = localStorage.getItem(key);
  return val != null;
}

export default {
  components: {
    Layout: Layout,
    Editor: Editor,
  },
  data() {
    return {
      src: (storageExists(storageKeyCode))? localStorage.getItem(storageKeyCode) : exampleCode,
      logEntries: [],
      timeoutSaveLocalStorage: null,
      watches: {}
    }
  },
  watch: {
    logEntries() {
      this.$nextTick(() => { this.$refs.out.scrollIntoView({ block: "end", inline: "nearest" }); });
    }
  },
  methods: {
    msg(text) {
      console.log(text);
    },
    saveCodeToLocalStorage(code) {
      if(this.timeoutSaveLocalStorage) {
        clearTimeout(this.timeoutSaveLocalStorage);
      }

      this.timeoutSaveLocalStorage = setTimeout(() => {
        let c = code;
        localStorage.setItem(storageKeyCode, c);
        this.timeoutSaveLocalStorage = null;
      }, 1000);
    },
    writeLog(msg, prefix = "") {
      let isObject = (value) => {
        return value !== null && typeof value === 'object'
      };

      this.logEntries.push(
        `<span>${prefix + ((isObject(msg))? JSON.stringify(msg) : msg)}</span>`);
    },
    writeError(msg, prefix = "") {
      let isObject = (value) => {
        return value !== null && typeof value === 'object'
      };

      this.logEntries.push(
        `<span style="color:#F00;">${prefix + ((isObject(msg))? JSON.stringify(msg) : msg)}</span>`);
    },
    registerWatch(val, key) {
      this.watches[key] = val;
    },
    resetJavaScriptContext() {
      let target = this.$refs.sandboxes.querySelector('iframe[name="default"]');
      if(target) {
        target.remove();
      }
      let iframe = document.createElement('iframe');
      iframe.name = "default";
      this.$refs.sandboxes.appendChild(iframe);

      implementClient(iframe.contentWindow);

      iframe.contentWindow.consoleListener = (msg) => {
        this.writeLog(msg);
      };

      iframe.contentWindow.querySync = function(sql) {
        const request = new XMLHttpRequest();
        const param = (new URLSearchParams({query: sql})).toString();
        request.open("GET", `${endpoint}/Database?${param}`, false);
        request.send(null);
        
        if (request.status === 200) {
          return JSON.parse(request.responseText);
        } else {
          throw new Error("Error on execute query");
        }
      };

      iframe.contentWindow.addWatch = (val, key) => {
        if(key === "" || key == null || key === undefined) {
          throw new Error("key not specified!");
        }

        this.watches[key] = val;
      };

      iframe.contentWindow.removeWatch = (key) => {
        delete this.watches[key];
      };

      iframe.contentWindow.eval(`
        window.console.__log = console.log;
        window.console.log = (arg) => { console.__log(arg); consoleListener(arg); }
        `);
    },
    evaluateJavaScript(text) {
      // const context = window; //{ ...window };
      // // const func = new Function(...Object.keys(context), `return (() => { ${text} })()`);
      // const func = new Function(...Object.keys(context), `${text}`);
      // // console.log(func(...Object.values(context)));
      // console.log(func.apply(window, ...Object.values(context)));

      // eval.apply(window, [text]);

      // const run = Function(text);
      // run();

      // const run = (code) => Function(`return (functions) => { ${code} }`)()(functions);
      // run();

      // const context = { bar : 123 };
      // const run = new Function(text);
      // run.apply(context, []);

      // let run = new Function(text);
      // run();


    //<iframe ref="sandbox" style="display:none"></iframe>

      // this.$refs.sandboxes.contentWindow.eval(text);
      let context = this.$refs.sandboxes.querySelector('iframe[name="default"]');
      try {
        let result = context.contentWindow.eval(text);
        this.writeLog(result, "> ");
        console.log(result);
      } catch(err) {
        this.writeError(err.toString(), "ERROR: ");
        console.error(err);
      }
    }
  },
  mounted() {
    this.resetJavaScriptContext();
  }
}
</script>

<template>
  <div ref="sandboxes" style="display:none">
  </div>
  <Layout layout-id="layout-outer"
    border-width="4"
    size-north="48" size-west="24" size-south="24" size-east="100"
    class-north="p-3" class-south="p-3 bg-forbidden" class-east="p-3" class-west="p-3 bg-forbidden" class-center="p-3"
    disable-east="true" disable-west="true"
    resizable-north="false" resizable-south="false" >
    <template v-slot:north>
      <img src="../assets/dbcrowbar-icon.svg" class="logo" alt="dbcrowbar logo" height="50" style="margin-top:-2px; transform:rotate(0deg);" />
      <span style="position:absolute; top:20px; left:20px;">
        <span style="color:#FFF">db</span><span style="margin-left:2px">crowbar</span>
      </span>
    </template>

    <template v-slot:west>
      <!-- tools and components -->
    </template>

    <template v-slot:center>

      <Layout layout-id="layout-inner"
        border-width="4"
        size-north="24"
        disable-east="true" disable-west="true" disable-south="true" disable-north="false"
        class-north="p-3 bg-forbidden" class-south="p-3" class-east="p-3" class-west="p-3" class-center="p-3"
        resizable-north="false" >
        <template v-slot:north>
          <!-- tabbar -->
        </template>

        <template v-slot:center>

          <!-- tab page 1 -->
          <Layout layout-id="layout-content1"
            border-width="4"
            size-east="20"
            class-north="p-3" class-south="p-3" class-east="p-5" class-west="p-3" class-center="p-3"
            style-east="overflow:auto"
            disable-west="true" disable-north="true" disable-south="true"
            >

            <template v-slot:east>
              <div v-for="k1 in Object.keys(watches)" :key="k1">
                <span>{{ k1 }}</span><button class="button1 small" style="margin:2px" @click="delete watches[k1]">X</button>
                <table v-if="watches[k1].length > 0" class="result">
                  <tr>
                    <th v-for="k in Object.keys(watches[k1][0])">{{ k }}</th>
                  </tr>
                  <tr v-for="row in watches[k1]">
                    <td v-for="k in Object.keys(row)">{{ row[k] }}</td>
                  </tr>
                </table>
                <br />
              </div>
            </template>

            <template v-slot:center>
              <Layout layout-id="layout-content1-inner1"
                border-width="4"
                size-north="32" size-south="100"
                class-south="p-3" class-east="p-3" class-west="p-3" class-center="p-3"
                disable-west="true" disable-east="true" 
                style-south="overflow:auto; font-size:0.9em; background-color:#FAFAFA;">
                <template v-slot:north>
                  <div class="button-container">
                    <button class="button1" @click="evaluateJavaScript($refs.editor.editor.getSelectedText())">
                      Evaluate<span style="font-size:0.7em;">&nbsp;(Ctrl+Enter)</span></button>
                    <button class="button1" @click="resetJavaScriptContext()">Reset</button>
                  </div>
                </template>
                <template v-slot:center>
                  <Editor ref="editor" editorId="editor1" :content="src" theme="textmate" lang="javascript"
                    @keydown.ctrl.enter="evaluateJavaScript($refs.editor.editor.getSelectedText())"
                    @change-content="saveCodeToLocalStorage">
                  </Editor>
                </template>
                <template v-slot:south>
                  <button class="button1" @click="logEntries = []">Clear</button>
                  <div style="white-space:pre;" ref="out">
                    <div v-for="log in logEntries" :key="log" v-html="log" style="padding:5px; background-color:#FFF; margin:3px;">
                    </div>
                  </div>
                  <!--
                  <Editor editorId="editor2" :content="logEntries" theme="textmate" lang="text">
                  </Editor>
                  -->
                </template>
              </Layout>
            </template>
          </Layout>

        </template>
      </Layout>

      <!-- tab page -->
      <!--
      <Layout
        layout-id="layout-inner-center"
        border-width="4"
        size-north="24"
        size-west="250"
        size-south="100"
        size-east="300"
        disable-west="true"
        >
        <template v-slot:center>
          editor
        </template>
        
        <template v-slot:east>
          viewer
        </template>

        <template v-slot:south>
          log
        </template>
      </Layout>
      -->

    </template>

    <template v-slot:south>
      
    </template>
  </Layout>
</template>

<style scoped>
</style>
