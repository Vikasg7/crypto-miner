const yargs = require("yargs")
const { main } = require("./miner")
const { log } = require("console")
const algos = require("crypto-algos")

const args =
   yargs
      .usage("npm start -- [options]")
      .options({
         "s": {
            type: "string",
            demandOption: true,
            describe: "host:port",
            alias: "server"
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
         },
         "t": {
            type: "number",
            demandOption: true,
            describe: "threads",
            alias: "threads",
            default: 1
         },
         "a": {
            type: "string",
            demandOption: true,
            describe: Object.keys(algos).join(", "),
            alias: "algo",
            default: 1
         }
      })
      .help()
      .argv

main(args).subscribe(null, log)