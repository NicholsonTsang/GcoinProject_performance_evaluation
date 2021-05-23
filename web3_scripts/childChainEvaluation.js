const Web3 = require('web3');
const contractAbi = require("./contractAbi");

const Gcoin_Addr = "0x78c65f03b5fa97b41ac63b395fad11dccf915a2a";

const receiver = "0xd4B82B58942a87f6CAF9B1c4d52c63672ECea24F";

const privateKey = "c9e0723ee95a1aa3d12d161be4d210d6ddf4e23e09c65ac1387ec1398a267f71"; //sender
const address = "0x2f56b78D2d3B5EF6FDf0A6c2415089909496C646"

var childChainWeb3 = new Web3(new Web3.providers.WebsocketProvider("wss://ec2-18-222-183-209.us-east-2.compute.amazonaws.com"));

var GcoinContract = new childChainWeb3.eth.Contract(
    contractAbi.GcoinAbi,
    Gcoin_Addr
);

let counts = 0;
let numOfTxSend = 5000;
let start;

GcoinContract.events.Transfer({}).on('data', async function(event){
    counts = counts+ 1;

    console.log("count: ",counts,"Used time", new Date().getTime() - start);

}).on('error', console.error);

childChainTPSEvaluation(numOfTxSend);

async function childChainTPSEvaluation(count){
    let tx = {
        to: Gcoin_Addr,
        gas: 1000000,
        gasPrice: 10000000000,
        value: 0,
        data: GcoinContract.methods.transfer(receiver, 1).encodeABI()
    }
    var nonce = await childChainWeb3.eth.getTransactionCount(address);
    start = new Date().getTime();
    console.log("start time: ", start);
    let done = 0;
    let fails = 0;

    for (let i = 0; i < count; i++) {
        tx.nonce = nonce;
        nonce++;
        console.log("tx nonce");
        console.log(tx.nonce);
        signTransaction(childChainWeb3, tx, privateKey,() => {
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
