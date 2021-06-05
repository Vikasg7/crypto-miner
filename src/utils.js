const { createHash, scryptSync } = require("crypto")
const { curry, is } = require("ramda")
const base58 = require("bs58")

const update = (list, idx, item) => {
   list.splice(idx, 1, item)
   return list
}

const isOdd = (num) => (num % 2) === 1

const sha256 = (input) =>
   createHash("sha256")
      .update(input, "hex")
      .digest("hex")

const sha256d = (input) =>
   input
   |> sha256
   |> sha256

// https://litecoin.info/index.php/Scrypt
const scryptHash = (bytes) =>
   scryptSync(bytes, bytes, 32, { N: 1024, r: 1, p: 1 })
   |> toHexBE

// https://bitcoin.stackexchange.com/a/59782
const hash160 = (pubKey) =>
   base58
      .decode(pubKey)
      .slice(1,21) // 20 bytes

const uIntToBytes = (num, size, method) => {
   const arr = new ArrayBuffer(size)
   const view = new DataView(arr)
   view[method + (size * 8)](0, num)
   return Buffer.from(arr)
}

const toBytes = (data, type) =>
   type == "u8"  ? uIntToBytes(data, 1, "setUint") :
   type == "u16" ? uIntToBytes(data, 2, "setUint") :
   type == "u32" ? uIntToBytes(data, 4, "setUint") :
   type == "u64" ? uIntToBytes(BigInt(data), 8, "setBigUint")
                 : Buffer.from(data, type)

const toHex = (data, type) =>
   is(Buffer, data) 
      ? data.toString("hex")
      : toHex(toBytes(data, type)) 

const toBytesLE = (data, type) => toBytes(data, type).reverse()
const toBytesBE = toBytesLE

const toHexLE = (data, type) => toBytesLE(data, type) |> toHex
const toHexBE = toHexLE

const toBase64 = (string) => Buffer.from(string).toString("base64")
const pprint = (json) => JSON.stringify(json, null, 2)
const wait = (seconds) =>
   new Promise((resolve, reject) => setTimeout(() => resolve(), seconds * 1000))

// https://btcinformation.org/en/glossary/compactsize
// https://btcinformation.org/en/developer-reference#compactsize-unsigned-integers
const compactSize = (size) =>
   size <= 252    ? toHex(size, "u8") :
   size < 2 ** 16 ? fd + toHex(size, "u16") :
   size < 2 ** 32 ? fe + toHex(size, "u32")
                  : ff + toHex(size, "u64")

module.exports = {
   update: curry(update),
   isOdd,
   sha256,
   sha256d,
   scryptHash,
   toBytes,
   toHex,
   toBytesLE,
   toBytesBE,
   toHexBE,
   toHexLE,
   toBase64,
   pprint,
   hash160,
   wait,
   compactSize
}