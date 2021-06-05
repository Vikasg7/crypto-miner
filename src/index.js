const yargs = require("yargs")
const { miner } = require("./miner")
const { log } = require("console")

const args =
   yargs
    .usage("npm start -- [options]")
    .options({
       "a": {
          type: "string",
          demandOption: true,
          describe: "host:port",
          alias: "address"
       },
       "u": {
          type: "string",
          demandOption: true,
          describe: "username",
          alias: "user"
       },
       "p": {
          type: "string",
          demandOption: true,
          describe: "password",
          alias: "pass"
       },
       "w": {
          type: "string",
          demandOption: true,
          describe: "miner's wallet",
          alias: "wallet"
       }
    })
    .help()
    .argv

miner(args).catch(log)