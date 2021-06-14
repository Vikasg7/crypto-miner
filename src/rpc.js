const fetch = require("node-fetch")
const { toBase64 } = require("./utils")

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
         "Content-Type": "application/json"
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

module.exports = {
   getBlockTemplate,
   submitBlock
}