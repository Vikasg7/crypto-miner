const fetch = require("node-fetch")
const { splitEvery, join, map, splitAt,
        concat, apply, last, append,
        head, prop, isEmpty, take, length } = require("ramda")
const { update, isOdd, toBytesLE, toHex, 
        pprint, toHexLE, sha256d, toBytes,
        scryptHash, toBase64, hash160, 
        wait, compactSize } = require("./utils")
const { log } = require("console")

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
   // block height length (3) + little endian block height hex + Arbitrary data
   const heightHexLen = "03"
   const heightHex = 
      toBytesLE(blockTemplate.height, "u64")
      |> take(3)
      |> toHex
   const scriptSig = heightHexLen + heightHex + toHex("Hala Madrid!")
   const scriptSigLen =
      toBytes(scriptSig, "hex")
      |> length
      |> toHex(?, "u8")
   const sequence = "ffffffff"
   const outCount = "01"
   const txValue = toHexLE(blockTemplate.coinbasevalue, "u64")
   // https://en.bitcoin.it/wiki/Script
   // scriptPubKey: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
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
   isOdd(txs.length) ? merkleRoot(append(last(txs), txs)) :
                       merkleRoot(merkleLeaves(txs))

// https://btcinformation.org/en/developer-reference#compactsize-unsigned-integers
const block = (blockTemplate, cbTx) => {
   const version = toHexLE(blockTemplate.version, "u32")
   const prevHash = toHexLE(blockTemplate.previousblockhash, "hex")
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

const goldenNonce = (blockHeader, target) => {
   const bytesBeforeNonce = 
      take(5, blockHeader)
      |> join("")
      |> toBytes(?, "hex")
   let hashCnt = 0

   for (let nonce = 1; nonce <= MAX_NONCE; nonce++) {
      hashCnt++
      let hash =
         [bytesBeforeNonce, toBytesLE(nonce, "u32")]
         |> Buffer.concat
         |> scryptHash
      if (hash <= target) 
         return [hashCnt, hash, nonce]
   }

   return [hashCnt, null, null]
}

const miner = async (args) => {
   const resp = await getBlockTemplate(args)
   const blockTemplate = resp.result
   
   if (isEmpty(blockTemplate.transactions)) {
      await wait(0.5)
      return miner(args)
   }
   
   log("\nblockHeight:", blockTemplate.height)
   log("transactionCount:", blockTemplate.transactions.length)
   const cbTx = coinbaseTx(blockTemplate, args.wallet)
   // log("cbTx:", pprint(cbTx))
   const [blockHeader, tail] = 
      block(blockTemplate, cbTx.join(""))
      |> splitAt(6)
   // log("block:", pprint(blockHeader.concat(tail)))
   const target = blockTemplate.target
   const sTime = Date.now()
   const [hashCnt, hash, nonce] = goldenNonce(blockHeader, target)
   const eTime = Date.now()
   const timeTaken = (eTime - sTime) / 1000
   log("%d hashes checked in %s minutes at hashRate: %s KH/sec", hashCnt, (timeTaken / 60).toFixed(2) , (hashCnt / 1000 / timeTaken).toFixed(2))
   log("nonce: ", nonce)
   log("target:", target)
   log("hash:", hash)
   
   if (nonce == null) 
      return miner(args)

   const blockHex =
      toHexLE(nonce, "u32")
      |> update(blockHeader, 5)
      |> concat(?, tail)
      |> join("")
   const submitResp = await submitBlock(args, blockHex)
   log("submitResp:", submitResp.result)
   return miner(args)
}

module.exports = {
   coinbaseTx,
   merkleLeaves,
   merkleRoot,
   block,
   getBlockTemplate,
   submitBlock,
   goldenNonce,
   miner
}