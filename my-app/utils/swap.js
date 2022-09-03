import { Contract } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS } from "../constants";

/** 
 * d当用户交换——swapAmountWei的数量的ETH/CD代币时，可以收到CD/ETH代币的数量
*/
export const getAmountOfTokensReceivedFromSwap = async(
   _swapAmountWei,
   provider,
   ethSelected,
   ethBalance,
   reservedCD
) =>{
    //创建一个交易所合约的新实例
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        provider
    );
    let amountOfTokens;
    //如果选择了ETH，这意味这我们的输入值为ETH，这意味着我们的输入量将是 _swapAmountWei
    //输入储备将是合约的ethBalance 和输出储备将是CD代币的储备
    if(ethSelected){
        amountOfTokens = await exchangeContract.getAmountOfTokens(
            _swapAmountWei,
            ethBalance,
            reservedCD
        );
    //如果没有选择ETH，这意味着我们的输入值是CD代币，这意味着我们的输入量是_swapAmountWei
    //输入储备是合约的CD代币储备, 输出储备是ETH
    }else {
        amountOfTokens = await exchangeContract.getAmountOfTokens(
            _swapAmountWei,
            reservedCD,
            ethBalance
        );
    }
    return amountOfTokens;
};

/**ETH/CD代币交换一定数量的CD/ETH代币 */
export const swapTokens = async (
    signer,
    swapAmountWei,
    tokenToBeReceivedAfterSwap,
    ethSelected
) =>{
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
    );
    const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ADDRESS,
        signer
    );
    let tx;
    //如果选择了ETH，则调用ethToCryptoDevToken函数，
    //否则从合约中调用cryptoDevToken函数
    //如你所见，你需要将swapAmount 作为值传递给函数，
    //因为这是我们支付给合约的以太币，而不是我们传递给函数的值
    if(ethSelected){
        tx = await exchangeContract.ethToCryptoDevToken(
            tokenToBeReceivedAfterSwap,
            {
                value: swapAmountWei,
            }
        );
    }else{
        //用户必须批准合约的swapAmountWei,因为CD代币是一个ERC20
        tx = await tokenContract.approve(
            EXCHANGE_CONTRACT_ADDRESS,
            swapAmountWei.toString()
        );
        await tx.wait();
        // 调用cryptoDevTokenToEth函数，该函数将接受CD代币的swapAmountWei
        // 并将ETH的toBeRecrivedAfterSwap发送回给用户
        tx = await exchangeContract.cryptoDevTokenToEth(
            swapAmountWei,
            tokenToBeReceivedAfterSwap
        );
    }
    await tx.wait();
};

