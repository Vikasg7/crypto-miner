const { sha256, sha256d, toHex, littleEndian, 
        toBase64, hexToBytes, merkleRoot, bigEndian, 
        scryptHash } = require("../src/miner")
const { log } = require("console")

const transactions = [
   // coinbase txid
   "9cb7e337f2fbedf341c665fff53780f80ac584a0f8f84e9d3349168e699b1f4a",
   // other txids
   "ca8e9210796796d8626865e4d9260a02f505e5e8cd2e64c40703c0b83b212cc5",
   "24aeebf69d8defb850be4f0d33a7a9a77b0cd2db7b18f40b774d981869c43861",
   "9aad747f79b7da57b98f10ab43b38258710f2e0f513d97dee93915b55e994af5",
   "4ddc7177859633e34540d4f82cd2963454c9f545ae6a6c3e536050d5ec819ef3",
   "b5d41d003fcbdc075eab7507462e38cef23fe511dff5aa4c0c01e2dcd1f0b4af",
   "2e1c73f4456379866816f245f3b7d48683f8f3164ea9846102525454e30fdbfa",
   "814acbeb140e6f0b419feaf5586645460d25658d063a055a5528cdff5a2c2697",
   "90b9f6e0f9651f518a3b227b3e0d5764aab6220e464fcd21266c192c755b07b1"
]

const main = () => {
   const hex = toHex("Vikas Gautam")
   log("toHex:", toHex("Vikas Gautam") == "56696b61732047617574616d")
   log("sha256:", sha256(hex) == "2c247e64035102b8efb7cb2a351d7d02c55b99058c03462c7e6132a8c05839d0")
   log("sha256d:", sha256d(hex) == "0ad80ff443a9c68f85787621f494467fda454902c0a9b45de4b9ae0d1a46b094")
   log("littleEndian:", littleEndian("4ebb191a") == "1a19bb4e")
   log("toBase64:", toBase64("Vikas Gautam") == "VmlrYXMgR2F1dGFt")
   log("hexToBytes:", hexToBytes(hex).toString() == "Vikas Gautam")

   const merkleTree = transactions.map(littleEndian)
   log("merkleRoot:", bigEndian(merkleRoot(merkleTree)) == "60e96914503b6fba05feb27c343263471e8da0d855665f80c0f65a5cc0c6e6fd")

   const blk = "040062002385f417d64d2b45597c23cac28c9a7cf0a3ffedbc54f7a926775a0956415d66c5e6b1d78037d8debd6337f4b7786126cb98f96f2e259586073bf235867f35e3da14ea5fffff0f1e13d40000"
   log("scryptHash:", scryptHash(Buffer.from(blk, "hex")) == "00000b4bdd2b7681ea81fe1f060f1306a516f726f01ddbc07d81171e8c697f2c")
}

module.exports = main