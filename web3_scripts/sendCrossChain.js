const Web3 = require('web3');
const contractAbi = require("./contractAbi");

const Bridgeable_Token_Addr = "0x5362490a5c48cBc2a686DEE73695CE52f7eBbD3c";
const Parent_Bridgeable_Token_Addr = "0x10fd971Dab524A87537E0Ea8af7EC7Eb7d117f95"
const Bridge_ERC677_Extension_Mediator_Addr = "0xaE3E850013D4045709610893156175354340Bb19";

const privateKey = "0xa8722239642858ff15eaea6be734903a9d45323026de080f73a48eb540fb738f";
const address = "0x4d8d003045a78701312733AEfD13eB22d43ce378"

var parentChainWeb3 = new Web3(new Web3.providers.HttpProvider("https://sokol.poa.network"));
var childChainWeb3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/7abfcd3ee73b406ea84fd1bb5f10a45d"));

var childBridgeableToken = new childChainWeb3.eth.Contract(
	contractAbi.bridgeTokenAbi,
	Bridgeable_Token_Addr
);

var parentBridgeableToken = new parentChainWeb3.eth.Contract(
	contractAbi.bridgeTokenAbi,
	Parent_Bridgeable_Token_Addr, 
	{from: address}
);

const counts = [10];
const fs = require('fs');
var writerStream = fs.createWriteStream('throughput.txt');

async function run() {
	for (var count of counts) {
		writerStream.write(`TXNum: ${count}\n`);
		await crosschain_test(count);
		writerStream.write(`\n`);
	}
	writerStream.end();
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
	console.log(`startValue: ${startValue}`);

	var nonce = await childChainWeb3.eth.getTransactionCount(address);

	let start = new Date().getTime();
    let done = 0;
    let fails = 0;

    for (let i = 0; i < count; i++) {
    	tx.nonce = nonce;
    	nonce++;
    	console.log(tx.nonce);
    	signTransaction(childChainWeb3, tx, privateKey,() => {
    		done++;
    		console.log("receipt");
    	}, (err) => {
    		fails++;
    		console.error("error");
    	});
    }

    var first_time = true;
    var increased = await balanceOf(address).call() - startValue;
    while(done + fails < count || increased < done) {
    	if (first_time) {
    		console.log(`current progress: ${done + fails}`);
    	} else {
    		increased = await balanceOf(address).call() - startValue;
    		console.log(`current increase: ${increased}`);
    	}
   		
    	if (first_time && done + fails >= count) {
    		increased = await balanceOf(address).call() - startValue;
    		let end = new Date().getTime();
	    	let time = end - start;

    		fs.appendFile('throughput.txt', `TXNum: ${count}`, function (err) {
			 	if (err) throw err;
			});

	    	console.log('Execution time: ' + time);
        	console.log('TPS: ' + (count * 1000 / time));
        	console.log('Failed tx count: ', fails);
        	console.log("Account tx count: ", increased);
       		console.log("Account tx count incl pending:", done - increased);
       		writerStream.write(`Execution time: ${time}\n` 
       			+ `TPS: ${count * 1000 / time}\n`
       			+ `Failed tx count: ${fails}\n`
       			+ `Account tx count: ${increased}\n`
       			+ `Account tx count incl pending: ${done - increased}\n\n`);
    		first_time = false;
    	} 
    	await new Promise(resolve => setTimeout(resolve, 1000));    	
    }
    let end = new Date().getTime();
	let time = end - start;
    console.log('Execution time: ' + time);
	console.log('TPS: ' + (count * 1000 / time));
	console.log("Account tx count:", done);
	writerStream.write(`Execution time: ${time}\n` 
			+ `TPS: ${count * 1000 / time}\n`
	       	+ `Account tx count: ${done}\n`);
}

function signTransaction(web3, tx,privateKey, receiptCallback, errorCallback) {
    const signPromise = web3.eth.accounts.signTransaction(tx, privateKey);
    signPromise.then((signedTx) => {
        const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
        sentTx.once("receipt", receipt => {
        	receiptCallback(receipt);
        }).on("error", error => {
            errorCallback(error);
        }).catch((err) => console.error(err));
    })
}

run().then(() => {
}).catch((err) => {
    console.error(err);
});
