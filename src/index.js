const { createHash, scryptSync } = require("crypto")

const yargs = require("yargs")

const R = {
   splitEvery: require("ramda/src/splitEvery"),
   join: require("ramda/src/join"),
   reverse: require("ramda/src/reverse"),
   map: require("ramda/src/map"),
   concat: require("ramda/src/concat"),
   apply: require("ramda/src/apply"),
   last: require("ramda/src/last"),
   append: require("ramda/src/append"),
   head: require("ramda/src/head"),
   prop: require("ramda/src/prop"),
   isNil: require("ramda/src/isNil"),
   isEmpty: require("ramda/src/isEmpty")
}

const range = function * (n, m) {
   let [i, j] = R.isNil(m) ? [0, n] : [n, m];
   for (; i < j; i++) yield i;
}

const cartesian = function* (head, ...tail) {
   const remainder = tail.length ? combinations(tail) : [[]];
   for (let r of remainder) for (let h of head) yield [h, ...r];
}

const isOdd = (num) => (num % 2) === 1

const MAX_NONCE = 2 ** 32

const sha256 = (input) =>
   createHash("sha256")
      .update(input, "hex")
      .digest("hex")

const sha256d = (input) =>
   input
   |> sha256
   |> sha256

const littleEndian = (input) =>
   input
   |> R.splitEvery(2)
   |> R.reverse
   |> R.join("")

const bigEndian = littleEndian

const toHex = (input) => Buffer.from(input).toString("hex")
const toBinary = (input) => input.toString("binary")

// coinbase transaction format - https://bitcoin.stackexchange.com/a/20724
const coinbaseTx = (cbValue, minerAddress) => {
   const version = "01000000"
   const inputCount = "01"
   const prevTx = "0000000000000000000000000000000000000000000000000000000000000000"
   const cbScript = toHex("Hala Madrid!")
   const cbScriptLen = toHex(12)
   const sequence = "ffffffff"
   const outCount = "01"
   const txValue = toHex(cbValue)
   const script = toHex(minerAddress)
   const scriptLen = minerAddress.length
   const locktime = "00000000"
   const txHex = [
      version,
      inputCount,
      prevTx,
      cbScriptLen,
      cbScript,
      sequence,
      outCount,
      txValue,
      scriptLen,
      script,
      locktime
   ]
   return txHex.join("")
}

const merkleLeaves = (txs) =>
   R.splitEvery(2, txs)
   |> R.map(R.apply(R.concat))
   |> R.map(sha256d)

// https://www.javatpoint.com/blockchain-merkle-tree
// little endian merkleRoot
const merkleRoot = (txs) =>
   (txs.length == 1) ? R.head(txs) :
   isOdd(txs.length) ? merkleRoot(R.append(R.last(txs), txs)) :
                       merkleRoot(merkleLeaves(txs))

const block = (blockTemp, minerAddress) => {
   const version = toHex(blockTemp.version)
   const prevHash = littleEndian(blockTemp.previousblockhash)
   const cbTx = coinbaseTx(blockTemp.coinbasevalue, minerAddress)
   const cbTxId = sha256d(cbTx)
   const merkleTree =
      blockTemp.transactions
      |> R.map(R.prop("txid"))
      |> R.map(littleEndian)
   const merketRoot =
      (R.isEmpty(merkleTree))
         ? cbTxId
         : merkleRoot([cbTxId, ...merkleTree])
   const time = toHex(blockTemp.mintime)
   const nbits = littleEndian(blockTemp.bits)
   nonce = toHex(1)
   const txLen = toHex(merkleTree.length + 1)
   const txs =
      blockTemp.transactions
      |> R.map(R.prop("data"))
   return [
      version,
      prevHash,
      merketRoot,
      time,
      nbits,
      nonce,
      txLen,
      cbTx,
      ...txs
   ]
}

const scryptHash = (block) =>
   scryptSync(block, block, 64, { N: 1024, r: 1, p: 1 })
   .toString("hex")
   |> bigEndian

const getBlockTemplate = async (opts) => {
   const options = {
      method: "POST",
      headers: {
         "Authorization": "Basic " + toBase64(`${opts.user}:${opts.pass}`),
         "Content-Type": "Application/json" 
      },
      data: JSON.stringify({
         "jsonrpc": "1.0",
         "id": "hala",
         "method": "getblocktemplate",
         "params": []
      })
   }
   const url = `http://${opts.host}:${opts.port}`
   const resp = await fetch(url, options)
   return resp.json()
}

const submitBlock = async (opts, blockhex) => {
   const options = {
      method: "POST",
      headers: {
         "Authorization": "Basic " + toBase64(`${opts.user}:${opts.pass}`),
         "Content-Type": "Application/json"
      },
      data: JSON.stringify({
         "jsonrpc": "1.0",
         "id": "hala",
         "method": "submitblock",
         "params": [blockhex]
      })
   }
   const url = `http://${opts.address}`
   const resp = await fetch(url, options)
   return resp.json()
}

const miner = async (args) => {
   const blockTemp = await getBlockTemplate(args)
   const blk = block(blockTemp.Result, args.wallet)
   
}

const args =
   yargs.usage("")
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

main(args).catch(console.log)