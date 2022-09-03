//这个文件用于检索资产的余额和准备金
import{Contract} from "ethers";
import { 
    EXCHANGE_CONTRACT_ABI,
    EXCHANGE_CONTRACT_ADDRESS, 
    TOKEN_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_AVI
} from "../constants";

/**
 * getEtherBalance: 获取用户或合约的Etheryue
 */
export const getEtherBalance = async (provider, address,contract) =>{
    try {
        //如果调用者的合约为true,则在exchange 合约中获取ETH的余额
        //如果为false,则在用户的address获取ETH的余额
        if(contract){
            const balance = await provider.getBalance(EXCHANGE_CONTRACT_ADDRESS);
            return balance;
        }else{
            const balance = await provider.getBalance(address);
            return balance
        }
    } catch (err) {
        console.error(err);
        return 0;
    }
};

/**
 * 检索提供地址的账户中的Cryoto Dev代币数量
 */
export const getCDTokensBalance = async(provider,address) =>{
    try {
        const tokenContract = new Contract(
            TOKEN_CONTRACT_ADDRESS,
            TOKEN_CONTRACT_AVI,
            provider
        );
        const balanceOfCryptoDevTokens = await tokenContract.balanceOf(address);
        return balanceOfCryptoDevTokens;
    } catch (err) {
        console.error(err);
    }
};

/**
 *  检索提供的地址的账户中的LP代币数量
 */
export const getLPTokensBalance = async (provider, address) =>{
    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        const balanceOfLpTokens = await exchangeContract.balanceOf(address);
        return balanceOfLpTokens;
    } catch (err) {
        console.error(err);
    }
};

/**
 * 检索交易所地址中的CD代币的数量
 */
export const getReserveOfCDTokens = async(provider) =>{
    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        const reserve = await exchangeContract.getReserve();
        return reserve;
    } catch (err) {
        console.error(err);
    }
};