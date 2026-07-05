const { spawnSync } = require("child_process");
const path = require("path");

const nodeDir = path.dirname(process.execPath);
const env = Object.assign({}, process.env, {
  PATH: `${nodeDir}:${process.env.PATH || ""}`,
});

const npmCli = path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js");

const result = spawnSync(process.execPath, [npmCli, "start"], {
  cwd: __dirname,
  env,
  stdio: "inherit",
});

process.exit(result.status === null ? 1 : result.status);
