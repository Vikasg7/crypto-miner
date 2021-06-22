const { splitEvery, join, map, splitAt,
        concat, apply, last, append, tap,
        head, prop, take, length } = require("ramda")
const { isOdd, toBytesLE, toHex, report, toHexLE,
        toBytes, lteLE, sha256d, hash160, compactSize, 
        splitNumToRanges, toHexBE } = require("./utils")
const Rx = require("rxjs")
const RxOp = require("rxjs/operators")
const { getBlockTemplate, submitBlock } = require("./rpc")
const threadCall = require("thread-call")

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
   
   return [ version
          , inputCount
          , prevTx
          , prevOut
          , scriptSigLen
          , scriptSig
          , sequence
          , outCount
          , txValue
          , scriptLen
          , scriptPubKey
          , locktime
          ]
}

const merkleLeaves = (txs) =>
   splitEvery(2, txs)
   |> map(apply(concat))
   |> map(sha256d)

// https://www.javatpoint.com/blockchain-merkle-tree
// Big Endian MerkleRoot
const merkleRoot = (txs) =>
   (txs.length == 1) ? head(txs) |> toHexBE(?, "hex") :
   isOdd(txs.length) ? merkleRoot(append(last(txs), txs))
                     : merkleRoot(merkleLeaves(txs))

const block = (blockTemplate, wallet) => {
   const version = toHexLE(blockTemplate.version, "u32")
   const prevHash = toHexLE(blockTemplate.previousblockhash, "hex")
   const cbTx = coinbaseTx(blockTemplate, wallet).join("")
   const cbTxId = sha256d(cbTx)
   
   const merkleTree =
      blockTemplate.transactions
      |> map(prop("txid"))
      |> map(toHexLE(?, "hex"))

   const merkelRoot = 
      merkleRoot([cbTxId, ...merkleTree])
      |> toHexLE(?, "hex")

   const ntime = toHexLE(blockTemplate.curtime, "u32")
   const nbits = toHexLE(blockTemplate.bits, "hex")
   const nonce = 0
   const txLen = compactSize(merkleTree.length + 1)
   const txs = 
      blockTemplate.transactions
      |> map(prop("data"))

   return [ version
          , prevHash
          , merkelRoot
          , ntime
          , nbits
          , nonce
          , txLen
          , cbTx
          , ...txs
          ]
}

const MAX_NONCE = 2 ** 32

const mineBlock = (blockTemplate, args) => {
   const { wallet, threads, algo } = args

   const [head, [nonce, ...tail]] =
      block(blockTemplate, wallet)
      |> splitAt(5)

   const target = 
      blockTemplate.target
      |> toHexLE(?, "hex")
   
   const findGoldenNonce = (nonceRange) =>
      threadCall("./find-nonce", head, target, algo, nonceRange)

   const blockHex = (nonce) =>
      toHexLE(nonce, "u32")
      |> append(?, head)
      |> concat(?, tail)
      |> join("")

   return Rx.from(splitNumToRanges(MAX_NONCE, threads))
          |> RxOp.mergeMap(findGoldenNonce)
          |> RxOp.take(1)
          |> RxOp.tap(report("nonce ", ?))
          |> RxOp.map(blockHex)
}

const txnCount = (blockTemplate) => blockTemplate.transactions.length

const compareResult = (a, b) =>
   a.height == b.height &&
   txnCount(a) == txnCount(b)

const blockTemplates = (args) =>
   Rx.of(args)
   |> RxOp.delay(1 * 1000)
   |> RxOp.concatMap(getBlockTemplate)
   |> RxOp.repeat()
   |> RxOp.distinctUntilKeyChanged("result", compareResult)
   |> RxOp.pluck("result")

const main = (args) =>
   blockTemplates(args)
   |> RxOp.tap(report("height", ?))
   |> RxOp.switchMap(mineBlock(?, args))
   |> RxOp.mergeMap(submitBlock(args, ?))
   |> RxOp.tap(report(["result", "error "], ?))

module.exports = {
   coinbaseTx,
   merkleLeaves,
   merkleRoot,
   block,
   main
}