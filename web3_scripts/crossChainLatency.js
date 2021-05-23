const Web3 = require('web3');
const contractAbi = require("./contractAbi");

const Bridgeable_Token_Addr = "0x5362490a5c48cBc2a686DEE73695CE52f7eBbD3c";
const Parent_Bridgeable_Token_Addr = "0x10fd971Dab524A87537E0Ea8af7EC7Eb7d117f95"
const Bridge_ERC677_Extension_Mediator_Addr = "0xaE3E850013D4045709610893156175354340Bb19";

const privateKey = "0xa8722239642858ff15eaea6be734903a9d45323026de080f73a48eb540fb738f";
const address = "0x4d8d003045a78701312733AEfD13eB22d43ce378"

var parentChainWeb3 = new Web3(new Web3.providers.HttpProvider("https://sokol.poa.network"));
var childChainWeb3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/e7f0b1ef3e524603bf17ce7172436601"));

var childBridgeableToken = new childChainWeb3.eth.Contract(
	contractAbi.bridgeTokenAbi,
	Bridgeable_Token_Addr
);

var parentBridgeableToken = new parentChainWeb3.eth.Contract(
	contractAbi.bridgeTokenAbi,
	Parent_Bridgeable_Token_Addr, 
	{from: address}
);

const counts = [300, 500, 1000];
// const fs = require('fs');
// var writerStream = fs.createWriteStream('latency.txt');

async function run() {
	await crosschain_test(1);
	// writerStream.end();
}


async function crosschain_test(count) {
	console.log("start testing");

	let tx = {
		to: Bridgeable_Token_Addr,
		gas: 1000000,
		gasPrice: 10000000000,
		value: 0,
		data: childBridgeableToken.methods.transferAndCall(Bridge_ERC677_Extension_Mediator_Addr, 1, '0x').encodeABI()
	}

	const { balanceOf } = parentBridgeableToken.methods;
	let startValue = await balanceOf(address).call();
	// console.log(`startValue: ${startValue}`);

    var nonce = await childChainWeb3.eth.getTransactionCount(address);

    let done = 0;
    let totalSentTime = 0;
    let totalExecutedTime = 0;
    let totalMinedTime = 0;
    let totalOracleTime = 0;
    let totalTime = 0;

    for (let i = 0; i < count; i++) {
        tx.nonce = nonce;
        nonce++;

        let start = new Date().getTime();
        let sentEnd, executedEnd, confirmedEnd;
        let hasError = false;

    	signTransaction(childChainWeb3, tx, privateKey, () => {
            sentEnd = new Date().getTime();
            // console.log(`sentEnd: ${sentEnd}`);
            // console.log(`sent: ${sentEnd - start}`);
        }, () => {
            executedEnd = new Date().getTime();
            done++;
            // console.log(`executedEnd: ${executedEnd}`);
    		// console.log(`executed: ${executedEnd - sentEnd}`);
    	}, () => {
            confirmedEnd = new Date().getTime();
            // console.log(`confirmedEnd: ${confirmedEnd}`);
            // console.log(`mined: ${confirmedEnd - executedEnd}`);
        }, (err) => {
            hasError = true;
    		console.error("error");
    	});

        let increased = 0;
        while (!hasError && increased < 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            increased = await balanceOf(address).call() - startValue;
        }
        let oracleEnd = new Date().getTime();
        // console.log(`oracleEnd: ${oracleEnd}`);
        // console.log(`oracle: ${oracleEnd - executedEnd}`);

        totalSentTime += (sentEnd - start);
        totalExecutedTime += (executedEnd - sentEnd);
        totalMinedTime += (confirmedEnd - executedEnd);
        totalOracleTime += (oracleEnd - executedEnd);
        totalTime += (oracleEnd - start);
        startValue += increased;

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

	console.log(`Total: ${count}. Succeeds: ${done}\n` 
			+ `Total time: ${totalTime / (done * 1000)}s\n`
	       	+ `Sending time: ${totalSentTime / (done * 1000)}s\n`
            + `Execution time: ${totalExecutedTime / (done * 1000)}s\n`
            + `Oracle time: ${totalOracleTime / (done * 1000)}s\n`);
}

function signTransaction(web3, tx,privateKey, hashCallback, receiptCallback, comfirmCallback, errorCallback) {
    const signPromise = web3.eth.accounts.signTransaction(tx, privateKey);
    var mined = false;
    signPromise.then((signedTx) => {
        const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
        sentTx.once('transactionHash', hash => {
            hashCallback(hash);
        }).once("receipt", receipt => {
        	receiptCallback(receipt);
        }).on("error", error => {
            errorCallback(error);
        }).once("confirmation", (num, obj) => {
            if (!mined && num == 0) {
                mined = true;
                confirmCallback(num, obj);
            }
        }).catch((err) => console.error(err));
    })
}

run().then(() => {
}).catch((err) => {
    console.error(err);
});
