const fetch = require("node-fetch")
const { splitEvery, join, map, splitAt,
        concat, apply, last, append,
        head, prop, isEmpty, take, length } = require("ramda")
const { isOdd, toBytesLE, toHex, pprint,
        toHexLE, sha256d, toBytes, toBase64,
        scryptHash,  hash160, compactSize } = require("./utils")
const { log } = require("console")
const Rx = require("rxjs")
const RxOp = require("rxjs/operators")

// https://en.bitcoin.it/wiki/BIP_0022
const getBlockTemplate = async (opts) => {
   const options = {
      method: "POST",
      headers: {
         "Authorization": "Basic " + toBase64(`${opts.user}:${opts.pass}`),
         "Content-Type": "application/json"
      },
      body: JSON.stringify({
         "jsonrpc": "1.0",
         "id": "hala",
         "method": "getblocktemplate",
         "params": []
      })
   }
   const url = `http://${opts.address}`
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
      body: JSON.stringify({
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

// coinbase transaction format - https://bitcoin.stackexchange.com/a/20724
// coinbase transaction decoder - https://live.blockcypher.com/btc/decodetx/
const coinbaseTx = (blockTemplate, wallet) => {
   const version = "01000000"
   const inputCount = "01"
   const prevTx = "0000000000000000000000000000000000000000000000000000000000000000"
   const prevOut = "ffffffff"

   // https://bitcoin.stackexchange.com/questions/72130/coinbase-transaction-data
   const heightHexLen = "03"
   const heightHex = 
      toBytesLE(blockTemplate.height, "u64")
      |> take(3)
      |> toHex

   // block height length (3) + little endian block height hex (first 3 bytes) + Arbitrary data
   const scriptSig = heightHexLen + heightHex + toHex("Hala Madrid!")

   const scriptSigLen =
      toBytes(scriptSig, "hex")
      |> length
      |> toHex(?, "u8")

   const sequence = "ffffffff"
   const outCount = "01"
   const txValue = toHexLE(blockTemplate.coinbasevalue, "u64")
   
   // https://en.bitcoin.it/wiki/Script
   // scriptPubKey: OP_DUP OP_HASH160 <Bytes To Push> <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
   const scriptPubKey = "76" + "a9" + "14" + toHex(hash160(wallet)) + "88" + "ac"
   
   const scriptLen =
      toBytes(scriptPubKey, "hex")
      |> length 
      |> toHex(?, "u8")
   
   const locktime = "00000000"
   return [
      version,
      inputCount,
      prevTx,
      prevOut,
      scriptSigLen,
      scriptSig,
      sequence,
      outCount,
      txValue,
      scriptLen,
      scriptPubKey,
      locktime
   ]
}

const merkleLeaves = (txs) =>
   splitEvery(2, txs)
   |> map(apply(concat))
   |> map(sha256d)

// https://www.javatpoint.com/blockchain-merkle-tree
const merkleRoot = (txs) =>
   (txs.length == 1) ? head(txs) :
   isOdd(txs.length) ? merkleRoot(append(last(txs), txs))
                     : merkleRoot(merkleLeaves(txs))

// https://btcinformation.org/en/developer-reference#compactsize-unsigned-integers
const block = (blockTemplate, wallet) => {
   const version = toHexLE(blockTemplate.version, "u32")
   const prevHash = toHexLE(blockTemplate.previousblockhash, "hex")
   const cbTx = coinbaseTx(blockTemplate, wallet).join("")
   const cbTxId = sha256d(cbTx)
   
   const merkleTree =
      blockTemplate.transactions
      |> map(prop("txid"))
      |> map(toHexLE(?, "hex"))

   const merketRoot =
      (isEmpty(merkleTree))
         ? cbTxId
         : merkleRoot([cbTxId, ...merkleTree])
   
   const ntime = toHexLE(blockTemplate.curtime, "u32")
   const nbits = toHexLE(blockTemplate.bits, "hex")
   const nonce = 0
   const txLen = compactSize(merkleTree.length + 1)
   const txs = blockTemplate.transactions |> map(prop("data"))
   return [
      version,
      prevHash,
      merketRoot,
      ntime,
      nbits,
      nonce,
      txLen,
      cbTx,
      ...txs
   ]
}

const MAX_NONCE = 2 ** 32

const report = (nonce, sTime) => {
   const timeTaken = Math.floor((Date.now() - sTime) / 1000)
   const seconds  = timeTaken % 60
   const minutes  = (timeTaken - seconds) / 60
   const hashRate = (nonce / 1000 / timeTaken).toFixed(2)
   log(`nonce      : ${nonce}\n`+
       `time taken : ${minutes}:${seconds}\n`+
       `hashRate   : ${hashRate} KH/sec`)
}

const goldenBlock = (blockTemplate, wallet) => {
   log("\nblockHeight:", blockTemplate.height)
   
   const [head, [nonce, ...tail]] =
      block(blockTemplate, wallet)
      |> splitAt(5)

   const target = blockTemplate.target
   
   const headBytes = 
      head
      |> join("")
      |> toBytes(?, "hex")

   const isGolden = (nonce) =>
      [headBytes, toBytesLE(nonce, "u32")]
      |> Buffer.concat
      |> scryptHash
      |> ((hash) => hash <= target ? [nonce] : [])

   const blockHex = (nonce) =>
      toHexLE(nonce, "u32")
      |> append(?, head)
      |> concat(?, tail)
      |> join("")

   const sTime = Date.now()

   return Rx.range(1, MAX_NONCE, Rx.asyncScheduler)
          |> RxOp.mergeMap(isGolden, 32)
          |> RxOp.take(1)
          |> RxOp.tap(report(?, sTime))
          |> RxOp.map(blockHex)
}

const mine = (blockTemplate, wallet) =>
   hasTransactions(blockTemplate)
      ? goldenBlock(blockTemplate, wallet)
      : Rx.EMPTY

const hasTransactions = (blockTemplate) =>
   blockTemplate.transactions.length > 0

const compareLists = (a, b) =>
   a[0]?.txid == b[0]?.txid

const blockTemplates = (args) =>
   Rx.of(args)
   |> RxOp.delay(1 * 1000)
   |> RxOp.concatMap(getBlockTemplate)
   |> RxOp.repeat()
   |> RxOp.pluck("result")
   |> RxOp.distinctUntilKeyChanged("transactions", compareLists)

const logResult = (resp) => 
   log(`result: ${resp.result}\n`+
       `error : ${pprint(resp.error)}`)

const main = (args) =>
   blockTemplates(args)
   |> RxOp.switchMap(mine(?, args.wallet))
   |> RxOp.mergeMap(submitBlock(args, ?))
   |> RxOp.tap(logResult)

module.exports = {
   coinbaseTx,
   merkleLeaves,
   merkleRoot,
   block,
   getBlockTemplate,
   submitBlock,
   main
}