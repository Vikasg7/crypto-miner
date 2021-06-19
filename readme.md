# crypto-miner  
A getblocktemplate based crypto miner in Nodejs written in functional style for mining crypto currency.  

# Usage
```
npm start -- [options]

Options:
      --version  Show version number                                   [boolean]
  -s, --server   host:port                                   [string] [required]
  -u, --user     username                                    [string] [required]
  -p, --pass     password                                    [string] [required]
  -w, --wallet   miner's wallet                              [string] [required]
  -t, --threads  threads                        [number] [required] [default: 1]
  -a, --algo     sha256, scrypt                 [string] [required] [default: 1]
      --help     Show help                                             [boolean]
```

# Command  
`npm start -- -s <host:port> -u <username> -p <password> -w <wallet> -t <threads> -a <algo>`  

# Motivation  
I wrote this for fun but it was very difficult as I had to do a lot of research. The resources on the internet on this topic are very difficult to find and understand. You can go through code and find the links to resources commented out. Code is self declarative and I have commented the explanations whereever needed.  

# How many coins did I mine?  
I tested the code against dogecoin testnet server/wallet. I wasn't able to mine any block as I was getting almost 1 KH/sec as HashRate with single process and network HashRate was 6-7 KH/sec. Blocks was already getting my mined before I could mine them and I was getting 'inconclusive' as a result of submitblock call.  
PS. I succesfully mined [3201211](https://chain.so/block/DOGETEST/3201211) on sochain DOGETEST and many others.  

# Control flow  
Miner is designed to switches to the new blocks as they are available while cancelling the processing of the old ones as they are deemed already mined.