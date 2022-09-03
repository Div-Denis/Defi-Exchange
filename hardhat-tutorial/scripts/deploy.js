const{ethers} = require("hardhat");
require("dotenv").config({path:".env"});
const{ CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } = require("../constants");

async function main(){
  const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;
  const exChangeContrct = await ethers.getContractFactory("Exchange");

  const deployedExChangeContract = await exChangeContrct.deploy(
    cryptoDevTokenAddress
  );

  await deployedExChangeContract.deployed();
  console.log("Exchange Contract Address",deployedExChangeContract.address);
}

main()
 .then(()=>process.exit(0))
 .catch((error)=>{
  console.error(error);
  process.exit(1);
 });