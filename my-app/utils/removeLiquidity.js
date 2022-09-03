import { Contract } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS } from "../constants";

/**
 * 从流动性中移除removeLPTokensWei数量的LP代币，
 * 以及计算出ether和CD代币的数量
 */
export const removeLiquidity = async (signer, removeLPTokensWei) =>{
   //创建交易所合约的实例
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
    );
    const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
    await tx.wait();
};

/**
 * 计算ETH和CD代币的数量，当用户从合约中移除removeLpTokenWei数量的LP代币后，将返回给用户
 */
export const getTokensAfterRemove = async (
    provider,
    removeLPTokensWei,
    _ethBalance,
    cryptoDevTokenReserve
) =>{
    try {
        //实例交易所合约
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        //获取Crypto Dev 的LP代币的总供应量
        const _totalSupply = await exchangeContract.totalSupply();
        //这里我们使用BigNumber方法的乘法和除法
        //用户提取LP代币后将返还给用户的ETH数量
        //是根据比率计算的
        //比率是--(amount of ETH that  would be sent back to the user /ETH reserve) = (LP tokens withdrawn)/(total supply of LP tokens)
        //通过计算我们得到 --（amount of ETH that would be sent back to the user）= (ETH Reserve * LP tokens withDdrawn)/(total supply of LP tokens)
        //同样 我们也为CD代币维持一个比率，所以在我们的例子中
        //比率 -- （amount of CD tokens sent back to the user/CD Token reserve）= (LP tokens withdrawn)/(total supply of LP tokens)
        //计算-- (amount of CD tokens sent back to the user) = (CD token reserve * LP TOKENS withdrawn)/(total supply of LP tokens)
        const _removeEther = _ethBalance
           .mul(removeLPTokensWei)
           .div(_totalSupply);
        const _removeCD = cryptoDevTokenReserve
           .mul(removeLPTokensWei)
           .div(_totalSupply);
        return{
            _removeEther,
            _removeCD,
        };   
    } catch (err) {
        console.error(err);
    }
};