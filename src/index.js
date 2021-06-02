const yargs = require("yargs")
const { log } = require("console")
const { getBlockTemplate, block, nTimeNonceCombos,
        findValidBlock, submitBlock } = require("./miner")

const pprint = (json) => JSON.stringify(json, null, 2)

const main = async (args) => {
   const resp = await getBlockTemplate(args)
   const blockTemp = resp.Result
   log("blockTemp:", pprint(blockTemp))
   const blck = block(blockTemp, args.wallet)
   const target = blockTemp.target
   const nTimeNonces = nTimeNonceCombos(blockTemp)
   const sTime = Date.now()
   const [hashCnt, validBlock] = findValidBlock(blck, target, nTimeNonces, 0)
   const eTime = Date.now()
   log("validBlock: ", validBlock)
   log("hashRate: %f khash/sec", (hashCnt/1000/(eTime - sTime)).toFixed(2))
   if (validBlock == null) return main(args);
   const submitResp = await submitBlock(args, validBlock)
   log("submitResp:", submitResp)
   return main(args)
}

const args =
   yargs
    .usage("")
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

main(args).catch(log)