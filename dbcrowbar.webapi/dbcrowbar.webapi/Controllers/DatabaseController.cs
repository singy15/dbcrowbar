using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Data;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Cors;
using System.Data.Common;
using System;
using System.Collections.Generic;

namespace dbcrowbar.webapi.Controllers
{
    public class SessionRequest
    {
        public string Source { get; set; }
    }

    public class SessionInfo
    {
        public string SessionId { get; set; }
    }

    public class QueryRequest
    {
        public string Query { get; set; }

        public string SessionId { get; set; }
    }

    public class DatabaseSession
    {
        public IDbConnection Connection { get; set; }

        public DateTime LastUsed { get; set; }

        public string SessionId { get; set; }

        public IDbTransaction Transaction { get; set; }

        public bool AutoCommit { get; set; }

        public int Timeout { get; set; }

        public bool Opend { get; set; }

        public DateTime LastHeartbeat { get; set; }
    }

    [ApiController]
    [Route("[controller]")]
    public class DatabaseController : ControllerBase
    {
        private readonly ILogger<DatabaseController> _logger;

        private IConfiguration _configuration;

        public static Dictionary<string, DatabaseSession> Connections = new Dictionary<string, DatabaseSession>();

        public DatabaseController(ILogger<DatabaseController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        private IDbTransaction CreateTransaction(IDbConnection conn)
        {
            return conn.BeginTransaction();
        }

        private IDbConnection GetConnection(string datasourceName)
        {
            bool validSource = false;
            string connStr = null;
            string type = null;

            foreach (var src in _configuration.GetSection("DataSources").GetChildren())
            {
                if (src.Key == datasourceName)
                {
                    type = (string)src.GetValue(typeof(string), "Type");
                    connStr = (string)src.GetValue(typeof(string), "ConnectionString");
                    validSource = true;
                    break;
                }
            }

            if (!validSource)
            {
                throw new InvalidOperationException("Invalid datasource " + datasourceName + " designated");
            }

            var conn = DbProviderFactories.GetFactory(type).CreateConnection();
            conn.ConnectionString = connStr;

            return conn;
        }

        private DataTable Query(IDbTransaction tx, string sql)
        {
            using (var cmd = tx.Connection.CreateCommand())
            {
                cmd.CommandTimeout = 1;
                cmd.CommandText = sql;
                var reader = cmd.ExecuteReader();
                var dt = new DataTable();
                dt.Load(reader);
                return dt;
            }
        }

        [Route("session/connect")]
        [HttpPost(Name = "GetSession")]
        [EnableCors]
        public string GetSession([FromBody] SessionRequest request)
        {
            IDbConnection conn = GetConnection(request.Source);

            conn.Open();

            var sessionId = Guid.NewGuid().ToString();

            Connections.Add(sessionId, new DatabaseSession()
            {
                Connection = conn,
                SessionId = sessionId,
                LastUsed = DateTime.Now,
                AutoCommit = false,
                Timeout = 1000 * 60 /* 60 seconds */,
                Transaction = null,
                LastHeartbeat = DateTime.Now
            });

            return JsonConvert.SerializeObject(new { Success = true, SessionId = sessionId });
        }

        [Route("session/heartbeat")]
        [HttpPost(Name = "SessionHeartbeat")]
        [EnableCors]
        public string SessionHeartbeat([FromBody] SessionInfo request)
        {
            if(!Connections.ContainsKey(request.SessionId))
            {
                return JsonConvert.SerializeObject(new { Success = false, Message = "Invalid sessionId, the session does not exist or already closed." });
            }

            var cinfo = Connections[request.SessionId];
            cinfo.LastHeartbeat = DateTime.Now;
            return JsonConvert.SerializeObject(new { Success = true, Last = cinfo.LastHeartbeat.ToString("O") });
        }

        [Route("session/close")]
        [HttpPost(Name = "CloseSession")]
        [EnableCors]
        public string CloseSession([FromBody] SessionInfo request)
        {
            var cinfo = Connections[request.SessionId];
            if (cinfo.Transaction != null)
            {
                cinfo.Transaction.Rollback();
            }
            cinfo.Connection.Close();
            Connections.Remove(request.SessionId);

            return JsonConvert.SerializeObject(new { Success = true });
        }


        [Route("query")]
        [HttpPost(Name = "GetQueryResult")]
        [EnableCors]
        public string GetQueryResult([FromBody] QueryRequest info)
        {
            string result = null;

            if(!Connections.ContainsKey(info.SessionId))
            {
                return JsonConvert.SerializeObject(new { Success = false, Message = "Invalid sessionId, the session does not exist or already closed." });
            }

            var cinfo = Connections[info.SessionId];
            using (var tx = CreateTransaction(cinfo.Connection))
            {
                var dt = Query(tx, info.Query);
                result = JsonConvert.SerializeObject(dt);
                tx.Commit();
            }

            return result;
        }

    }
}
