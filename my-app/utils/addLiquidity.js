import { Contract } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_AVI } from "../constants";


/**
 * addLiquidity: 有助于为交易所增加流动性
 * 如果用户最终添加代币流动性，用户决定添加ETH 和CD到交易所
 * 如果它在最初的流动性已增加之后再增加流动性
 * 然后我们计算他可以添加的Crypto Dev币，然后给定他想添加的ETH，通过我们保持代数常量
 */
export const addLiquidity = async(
    signer,
    addCDAmountWei,
    addEtherAmountWei
) => {
    //实例代币合约
    const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_AVI,
        signer
    );
    //实例交易所的合约
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
    );
    //因为CD代币是ERC20，所有用户授权
    //从他的合约中取出所需的CD代币数量
    let tx = await tokenContract.approve(
        EXCHANGE_CONTRACT_ADDRESS,
        addCDAmountWei.toString()
    );
    //合约获取批准后，将ETH和CD 代币加入流动性中
    await tx.wait();
    tx = await exchangeContract.addLiquidity(addCDAmountWei,{
        value: addEtherAmountWei,
    });
    await tx.wait()
};

/** 
 * 计算需要添加到流动性中的CD代币
 * 给定_addEtherAmountWei数量的ETH
*/
export const calculateCD = async(
    _addEther = "0",
    etherBalanceContract,
    cdTokenReserve
) => {
    //addEther 是一个字符串，我们需要将其转换为BigNumber才能进行计算
    //我们使用ether.js中的parseEther函数来实现
    const _addEtherAmountWei = utils.parseEther(_addEther);
    //添加流动性时需要保持比率
    //我们需要让用户知道特定数量的ETH有多少CD代币 
    //他可以选择这样的价格影响不大
    //我们遵循的比率是--(amount if Crypto Dev tokens to be added)/(Crypto Dev Tokens balance) = (ETH taht would be added)/(ETH reserve in the contract)
    //因此，通过计算 我么得到--(amount is Crypto Dev Tokens to be added) = (ETH that would be added * Crypto Dev Tokens balance)/(ETH reserve in the contract) 
    const cryptoDevTokenAmount = _addEtherAmountWei
       .mul(cdTokenReserve)
       .div(etherBalanceContract);
       return cryptoDevTokenAmount;
};