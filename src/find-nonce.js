const Rx = require("rxjs")
const RxOp = require("rxjs/operators")
const algos = require("crypto-algos")
const { lteLE, toBytesLE, toBytes } = require("./utils")

// This can also be done using while loop but I don't
// want to burder the cpu, so doing it in the async way
const findNonce = (head, target, algo, [f, t]) => {
   const hashFn = algos[algo]
   const targetBytes = toBytes(target, "hex")
   const headBytes =
      head.join("")
      |> toBytes(?, "hex")

   const isGolden = (nonce) =>
      [headBytes, toBytesLE(nonce, "u32")]
      |> Buffer.concat
      |> hashFn
      |> ((hash) => lteLE(hash, targetBytes) ? [nonce] : [])

   return Rx.range(f, t - f, Rx.asyncScheduler)
          |> RxOp.mergeMap(isGolden)
}

module.exports = findNonce