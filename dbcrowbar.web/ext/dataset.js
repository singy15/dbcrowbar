var dataset = {
  implement(db) {
    let self = {};
    
    let baseConfig = {
      placeholderTable: "{TABLE}",
      placeholderDataset: "{DATASET}",
    };
    
    let defaultTemplate = 
      `DCDS__${baseConfig.placeholderDataset}__${baseConfig.placeholderTable}`;
    
    let userConfig = {
      template: defaultTemplate,
      logger: console.log,
    };
    self.config = userConfig;
    
    let log = userConfig.logger;
    
    function tablename(dataset, table) {
      return userConfig.template
        .replace(baseConfig.placeholderDataset, dataset)
        .replace(baseConfig.placeholderTable, table);
    }
    
    function dessectTablename(table) {
      let m = table.match(tablename('(?<dataset>.+?)', '(?<table>.+)'));
      return { dataset: m.groups.dataset, table: m.groups.table };
    }
    
    async function currentSchema() {
      return (await db.$$(`SELECT USERNAME FROM USER_USERS`))[0].USERNAME;
    }
    
    async function list(opt = {}) {
      let schema = opt.schema || await currentSchema();
      let tables = await db.$$(`SELECT OWNER,TABLE_NAME FROM ALL_TABLES `
        + `WHERE OWNER = '${schema}' `
        + `AND TABLE_NAME LIKE '${tablename('%', '%')}' `
        + `ORDER BY OWNER,TABLE_NAME`);
      return tables.map(x => {
        let dessected = dessectTablename(x.TABLE_NAME);
        return {
          dataset: dessected.dataset,
          sourceSchema: schema,
          sourceTable: x.TABLE_NAME,
          destinationTable: dessected.table,
        };
      });
    }
    self.list = list;
    
    async function find(dataset, opt = {}) {
      return (await list(opt)).filter(x => x.dataset === dataset);
    }
    
    async function create(datasource, dataset, tables, opt = {}) {
      async function ctas(sourceSchema, sourceTable, 
          destinationSchema, destinationTable, database) {
        return await database.$$(`CREATE TABLE `
          + `${destinationSchema}.${destinationTable} AS `
          + `SELECT * FROM ${sourceSchema}.${sourceTable}`);
      }
      
      async function create1(datasource, dataset, sourceSchema, sourceTable, 
          destinationSchema) {
        let subdb = await $connect(datasource);
        let destTable = tablename(dataset, sourceTable);
        await ctas(sourceSchema, sourceTable, 
          destinationSchema, destTable, subdb);
        await subdb.$close();
        // log(`- ${destTable} created.`);
      }
      
      let curSchema = await currentSchema();
      let srcSchema = opt.sourceSchema || curSchema;
      let destSchema = opt.destinationSchema || curSchema;
      
      // log(`creating...`);
      let ps = tables.map(table => create1(datasource, dataset, srcSchema, table, 
          destSchema, tablename(dataset, table)));
      await Promise.all(ps);
      // log(`done.`);
    }
    self.create = create;
    
    async function purge(datasource, dataset, opt = {}) {
      async function purge1(datasource, dataset, sourceSchema, sourceTable) {
        let subdb = await $connect(datasource);
        await subdb.$$(`DROP TABLE ${sourceSchema}.${sourceTable}`);
        await subdb.$close();
        // log(`- ${sourceTable} purged.`);
      }
      
      let curSchema = await currentSchema();
      let srcSchema = opt.sourceSchema || curSchema;
      
      // log(`purging...`);
      let ds = await find(dataset, { schema: srcSchema });
      let ps = ds.map(d => purge1(datasource, d.dataset, 
        d.sourceSchema, d.sourceTable));
      await Promise.all(ps);
      // log(`done.`);
    }
    self.purge = purge;
    
    async function restore(datasource, dataset, opt = {}) {
      async function restore1(datasource, dataset, sourceSchema, sourceTable,
          destinationSchema, destinationTable) {
        let subdb = await $connect(datasource);
        await subdb.$$(`TRUNCATE TABLE ${destinationSchema}.${destinationTable}`);
        await subdb.$$(`INSERT INTO ${destinationSchema}.${destinationTable}`
          + ` SELECT * FROM ${sourceSchema}.${sourceTable}`);
        await subdb.$close();
        // log(`- ${destinationTable} restored.`);
      }
      
      let curSchema = await currentSchema();
      let srcSchema = opt.sourceSchema || curSchema;
      let destSchema = opt.destinationSchema || curSchema;
      
      // log(`restoring...`);
      let ds = await find(dataset, { schema: srcSchema });
      let ps = ds.map(d => restore1(datasource, dataset, 
        d.sourceSchema, d.sourceTable, destSchema, d.destinationTable));
      await Promise.all(ps);
      // log(`done.`);
    }
    self.restore = restore;
    
    db.ext.dataset = self;
  }
};

