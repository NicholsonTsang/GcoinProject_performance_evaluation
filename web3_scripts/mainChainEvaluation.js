const Web3 = require('web3');
const contractAbi = require("./contractAbi");

const USDT_Addr = "0x78c65f03b5fa97b41ac63b395fad11dccf915a2a";

const receiver = "0xd4B82B58942a87f6CAF9B1c4d52c63672ECea24F";

const privateKey = "c9e0723ee95a1aa3d12d161be4d210d6ddf4e23e09c65ac1387ec1398a267f71"; //sender
const address = "0x2f56b78D2d3B5EF6FDf0A6c2415089909496C646"

var parentChainWeb3 = new Web3(new Web3.providers.WebsocketProvider("wss://sokol.poa.network/wss"));
var childChainWeb3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/ced2c5d2f8d3400b816ba80f23133260"));

var USDTContract = new parentChainWeb3.eth.Contract(
    contractAbi.USDTAbi,
    USDT_Addr
);

let counts = 0;
let numOfTxSend = 250;
let start;

USDTContract.events.Transfer({}).on('data', async function(event){
    // console.log("event return values:");
    // console.log(event.returnValues);
    counts = counts+ 1;
    // console.log("counts:");
    // console.log(counts);
    // Do something here

    console.log("count: ",counts,"Used time", new Date().getTime() - start);

}).on('error', console.error);

mainChainTPSEvaluation(numOfTxSend);

async function mainChainTPSEvaluation(count){
    let tx = {
        to: USDT_Addr,
        gas: 1000000,
        gasPrice: 10000000000,
        value: 0,
        data: USDTContract.methods.transfer(receiver, 1).encodeABI()
    }
    var nonce = await parentChainWeb3.eth.getTransactionCount(address);
    start = new Date().getTime();
    console.log("start time: ", start);
    let done = 0;
    let fails = 0;

    for (let i = 0; i < count; i++) {
        tx.nonce = nonce;
        nonce++;
        console.log("tx nonce");
        console.log(tx.nonce);
        signTransaction(parentChainWeb3, tx, privateKey,() => {
            done++;
            // console.log("receipt");
        }, null, (err) => {
            fails++;
            console.error("error");
        });
    }

}

function signTransaction(web3, tx,privateKey, receiptCallback, comfirmCallback, errorCallback) {
    const signPromise = web3.eth.accounts.signTransaction(tx, privateKey);
    signPromise.then((signedTx) => {
        const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
        sentTx.on('transactionHash', hash => {
        }).on("receipt", receipt => {
            receiptCallback(receipt);
        }).on("error", error => {
            errorCallback(error);
        }).on("confirmation", (num, obj) => {
        }).catch((err) => console.error(err));
    })
}
