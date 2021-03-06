const { createHash } = require("crypto")
const { is, range, concat, map, multiply, 
        splitEvery, apply, zip, update, not } = require("ramda")
const base58 = require("bs58")
const { log } = require("console")
const Rx = require("rxjs")
const RxOp = require("rxjs/operators")

const isOdd = (num) => (num % 2) === 1

const sha256 = (input) =>
   createHash("sha256")
      .update(input, "hex")
      .digest("hex")

const sha256d = (input) =>
   input
   |> sha256
   |> sha256

// https://bitcoin.stackexchange.com/a/59782
const hash160 = (pubKey) =>
   base58
      .decode(pubKey)
      .slice(1,21) // 20 bytes

const uIntToBytes = (num, size, method, endianess = "") => {
   const buf = Buffer.allocUnsafe(size) 
   buf[method + (size * 8) + endianess](num, 0)
   return buf
}

const toBytes = (data, type) =>
   type == "hex" ? Buffer.from(data, "hex") :
   type == "u8"  ? uIntToBytes(data, 1, "writeUInt") :
   type == "u16" ? uIntToBytes(data, 2, "writeUInt", "BE") :
   type == "u32" ? uIntToBytes(data, 4, "writeUInt", "BE") :
   type == "u64" ? uIntToBytes(BigInt(data), 8, "writeBigUInt", "BE")
                 : Buffer.from(data, type)

const toHex = (data, type) =>
   is(Buffer, data) 
      ? data.toString("hex")
      : toBytes(data, type) |> toHex 

const toBytesLE = (data, type) => 
   is(Buffer, data)
      ? data.reverse()
      : toBytes(data, type).reverse()

const toHexLE = (data, type) =>
   toBytesLE(data, type)
   |> toHex

const toBytesBE = toBytesLE
const toHexBE = toHexLE

const toBase64 = (string) => Buffer.from(string).toString("base64")
const pprint = (json) => JSON.stringify(json, null, 2)

// https://btcinformation.org/en/glossary/compactsize
// https://btcinformation.org/en/developer-reference#compactsize-unsigned-integers
const compactSize = (size) =>
   size <= 252    ? toHex(size, "u8") :
   size < 2 ** 16 ? "fd" + toHex(size, "u16") :
   size < 2 ** 32 ? "fe" + toHex(size, "u32")
                  : "ff" + toHex(size, "u64")

const splitNumToRanges = (num, divBy) => 
   concat(range(0, divBy), range(1, divBy + 1))
   |> map(multiply(?, Math.ceil(num / divBy)))
   |> update(-1, num)
   |> splitEvery(divBy)
   |> apply(zip)
   
const isObject = (value) =>
   typeof value === "object"   &&
   typeof value !== "function" &&
   not(Array.isArray(value))   &&
   value !== null

const report = (k, v) =>
   Array.isArray(k) ? k.forEach(report(?, v)) :
   isObject(v)      ? log(`${k} : ${v[k.trim()]}`)
                    : log(`${k} : ${v}`)

// Compares two little-endian buffers in reverse order
const lteLE = (a, b) => {
   for (let i = a.length - 1; i > -1; i--) {
      let x = a[i]
      let y = b[i]
      if (x == y) continue;
      return x < y ? true : false
   }
   return true
}

// Mirrors an Observable of values returned
// from a fn called every n seconds repeatedly
const repeatEvery = (n, fn, ...args) =>
   Rx.of(null)
   |> RxOp.delay(n * 1000)
   |> RxOp.concatMap(_ => fn(...args))
   |> RxOp.repeat()

module.exports = {
   isOdd,
   sha256,
   sha256d,
   toBytes,
   toHex,
   toBytesLE,
   toBytesBE,
   toHexBE,
   toHexLE,
   toBase64,
   pprint,
   hash160,
   compactSize,
   splitNumToRanges,
   isObject,
   report,
   lteLE,
   repeatEvery
}