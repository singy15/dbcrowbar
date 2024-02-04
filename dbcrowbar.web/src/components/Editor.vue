<script>
import ace from 'ace-builds';
// import 'ace-builds/webpack-resolver';
// import 'ace-builds/src-noconflict/ext-language_tools';
// import 'ace-builds/src-noconflict/ext-searchbox';
// import 'ace-builds/src-noconflict/keybinding-vim';
import 'ace-builds/src-noconflict/mode-javascript';
// import 'ace-builds/src-noconflict/worker-base';
import 'ace-builds/src-noconflict/worker-javascript';
import 'ace-builds/src-noconflict/worker-css';
// import 'ace-builds/src-noconflict/worker-javascript';
// import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-textmate';
// import 'ace-builds/src-noconflict/mode-lisp';
// import 'ace-builds/src-noconflict/mode-html';

export default {
  props: [
    "editorId", "content", "lang", "theme"
  ],
  data() {
    return {
      editor: Object,
      beforeContent: "",
      lastPosition: null,
    };
  },
  watch: {
    content(value) {
      this.lastPosition = this.editor.getCursorPosition();

      if (this.beforeContent !== value) {
        this.editor.setValue(value, 1);
        this.editor.moveCursorTo(
          this.lastPosition.row,
          this.lastPosition.column
        );
      }
    },
  },
  mounted() {
    const lang = this.lang || "text";
    const theme = this.theme || "github";

    this.editor = window.ace.edit(this.editorId);
    
    this.editor.setOptions({
      // enableBasicAutocompletion: true,
      // enableSnippets: true,
      // enableLiveAutocompletion: true,
      // showGutter: false
    });

    this.editor.$blockScrolling = Infinity;

    this.editor.setValue(this.content, 1);

    this.editor.getSession().setMode(`ace/mode/${lang}`);
    this.editor.setTheme(`ace/theme/${theme}`);

    this.editor.getSession().setTabSize(2);
    this.editor.getSession().setUseSoftTabs(true);

    this.editor.on("change", () => {
      this.beforeContent = this.editor.getValue();
      this.$emit("change-content", this.editor.getValue());
    });

    this.$emit("on-mounted", this.editor);
  },
}
</script>

<template>
  <div :id="editorId" style="width: 100%; height: 100%;"></div>
</template>

<style scoped>
</style>

