using dbcrowbar.webapi.Controllers;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace dbcrowbar.webapi.Services
{
    public class DatabaseSessionManagerService : BackgroundService
    {
        private const int intervalMillisec = /* 1 second */1000 * /* times multiply */10;

        private const int removeThresholdMillisec = /* 1 second */1000 * /* times multiply */60;

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(intervalMillisec, stoppingToken);
                await DoSessionSweepAsync();
            }
        }

        private static Task DoSessionSweepAsync()
        {
            if (/* Execution condition */true)
            {
                // Console.WriteLine("Running session sweep...");
                // Console.WriteLine("Currently " + DatabaseController.Connections.Count().ToString() + " Session exists");

                var now = DateTime.Now;
                var keys = DatabaseController.Connections.Keys;
                foreach (var key in keys)
                {
                    var last = DatabaseController.Connections[key].LastHeartbeat;
                    var elapsedLastHeartbeat = (new TimeSpan(now.Ticks - last.Ticks)).TotalMilliseconds;
                    if (elapsedLastHeartbeat > removeThresholdMillisec)
                    {
                        Console.WriteLine("Session [" + key + "] seems not used anymore, last used at [" + last.ToString("O") + "].");
                        Console.WriteLine("Commence sweep procedure...");

                        var session = DatabaseController.Connections[key];
                        if (session.Transaction != null)
                        {
                            Console.WriteLine("Rollback transaction...");
                            session.Transaction.Rollback();
                            Console.WriteLine("Success.");
                        }

                        Console.WriteLine("Closing connection...");
                        session.Connection.Close();
                        Console.WriteLine("Success.");

                        Console.WriteLine("Removing session...");
                        DatabaseController.Connections.Remove(key);
                        Console.WriteLine("Success.");

                        Console.WriteLine("Sweep procedure for session [" + key + "] complete.");
                    }
                }

                // Console.WriteLine("Session sweep complete.");
            }

            return Task.FromResult("Done");
        }
    }
}
