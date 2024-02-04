using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;

namespace dbcrowbar.webapi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            //DbProviderFactories.RegisterFactory("sqlite3", typeof(System.Data.SQLite.SQLiteFactory));
            DbProviderFactories.RegisterFactory("oracle", typeof(Oracle.ManagedDataAccess.Client.OracleClientFactory));

            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
