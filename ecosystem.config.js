require("json5/lib/register");
const pm2 = require("pm2");

const config = require("./config.json5");
const name = config.spinalConnector.name;

module.exports = {
  apps: [
    {
      name,
      script: "./dist/index.js",
      cwd: "./",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_memory_restart: "3G",
      node_args: "--max-old-space-size=4096",
    },
  ],
};
