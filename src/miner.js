const { createHash, scryptSync } = require("crypto")
const { splitEvery, join, reverse, map, 
        concat, apply, last, append,
        head, prop, isEmpty, take } = require("ramda")
const { range, cartesian, update, isOdd } = require("./utils")

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
   |> splitEvery(2)
   |> reverse
   |> join("")

const bigEndian = littleEndian

const toHex = (input) => Buffer.from(input).toString("hex")
const toBase64 = (input) => Buffer.from(input).toString("base64")
const hexToBytes = (input) => Buffer.from(input, "hex")

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
   const scriptLen = toHex(minerAddress.length)
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
   splitEvery(2, txs)
   |> map(apply(concat))
   |> map(sha256d)

// https://www.javatpoint.com/blockchain-merkle-tree
const merkleRoot = (txs) =>
   (txs.length == 1) ? head(txs) :
   isOdd(txs.length) ? merkleRoot(append(last(txs), txs)) :
                       merkleRoot(merkleLeaves(txs))

const block = (blockTemp, minerAddress) => {
   const version = toHex(blockTemp.version)
   const prevHash = littleEndian(blockTemp.previousblockhash)
   const cbTx = coinbaseTx(blockTemp.coinbasevalue, minerAddress)
   const cbTxId = sha256d(cbTx)
   const merkleTree =
      blockTemp.transactions
      |> map(prop("txid"))
      |> map(littleEndian)
   const merketRoot =
      (isEmpty(merkleTree))
         ? cbTxId
         : merkleRoot([cbTxId, ...merkleTree])
   const ntime = toHex(Date.now())
   const nbits = littleEndian(blockTemp.bits)
   const nonce = toHex(1)
   const txLen = toHex(merkleTree.length + 1)
   const txs =
      blockTemp.transactions
      |> map(prop("data"))
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

// https://litecoin.info/index.php/Scrypt
const scryptHash = (block) => {
   const bytes = hexToBytes(block)
   return scryptSync(bytes, bytes, 32, { N: 1024, r: 1, p: 1 })
          .toString("hex")
          |> bigEndian
}

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

const nTimeNonceCombos = (blockTemp) => {
   const { curtime, mintime } = blockTemp
   const nTimeRange = range(mintime, (curtime + 1))
   const nonceRange = range(1, MAX_NONCE + 1)
   return cartesian(nTimeRange, nonceRange)
}

const updateBlock = (block) => ([ntime, nonce]) =>
   block
   |> update(3, ntime)
   |> update(5, nonce)

const findValidBlock = (block, target, nTimeNonces) => {
   const { nTimeNonce, done } = nTimeNonces.next()
   if (done) return null
   const blck = 
      nTimeNonce 
      |> map(toHex)
      |> updateBlock(block)
   const hash =
      take(6, blck) // upto nonce
      |> join("")
      |> scryptHash
   return hash >= target 
            ? blck.join("")
            : findValidBlock(block, target, nTimeNonces)
}

module.exports = {
   sha256,
   sha256d,
   littleEndian,
   bigEndian,
   toHex,
   toBase64,
   hexToBytes,
   coinbaseTx,
   merkleLeaves,
   merkleRoot,
   block,
   scryptHash,
   getBlockTemplate,
   submitBlock,
   nTimeNonceCombos,
   updateBlock,
   findValidBlock
}