# scrypt-miner  
A getblocktemplate based scrypt crypto miner in Nodejs written in functional style for mining scrypt based coins like dogecoin and litecoin.  

# Usage  
`npm start -- -a <host:port> -u <username> -p <password> -w <wallet>`  

# Motivation  
I wrote this for fun but it was very difficult as I had to do a lot of research. The resources on the internet on this topic are very difficult to find and understand for noob like me. You can go through code and find the links to resources commented out. Code is self declarative and I have commented the explanations whereever needed.  

# How many coins did I mine?  
I tested the code against dogecoin testnet server/wallet. I wasn't able to mine any block as I was getting almost 1 KH/sec as HashRate with single process and network HashRate was 6-7 KH/sec. Blocks was already getting my mined before I could mine them and I was getting 'inconclusive' as a result of submitblock call.