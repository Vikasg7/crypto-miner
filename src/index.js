const yargs = require("yargs")
const { log } = require("console")
const { getBlockTemplate, block, nTimeNonceCombos,
        findValidBlock, submitBlock } = require("./miner")

const main = async (args) => {
   const resp = await getBlockTemplate(args)
   log(resp)
   const blockTemp = resp.Result
   const blck = block(blockTemp, args.wallet)
   const target = blockTemp.target
   const nTimeNonces = nTimeNonceCombos(blockTemp)
   const validBlock = findValidBlock(blck, target, nTimeNonces)
   log("validBlock: ", validBlock)
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