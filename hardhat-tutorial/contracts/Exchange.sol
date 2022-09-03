// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract Exchange is ERC20{

    address public  cryptoDevTokenAdress;
    
    //Exchange正在继承ERC20，因为我们的交换将跟踪ctypeoDev LP 代币
    constructor(address _CryptoDevToken)ERC20("CryptoDev LP Token","CDLP"){
        require(_CryptoDevToken != address(0),"Token address passed is a null address");
        cryptoDevTokenAdress = _CryptoDevToken;
    }

    /**
    * 返回合约所持有的Crypro Dev Token的金额
     */
    function getReserve()public view returns(uint){
        return ERC20(cryptoDevTokenAdress).balanceOf(address(this));
    }

    /**
    *@dev 向交易所（exchange）增加流动性
     */
    function addLiquidity(uint _amount) public payable returns(uint) {
        uint liquidity;//流动性
        uint ethBalance = address(this).balance;
        uint cryptoDevTokenReserve = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAdress);
        /*
            如果预留(reserve)为空，则接收用户提供的任何值
            Ether 和 Crypto Dev Token ,因为目前没有比率
         */
        if(cryptoDevTokenReserve == 0){
            //将cryptodevtoken 从用户的账户转移到合同
            cryptoDevToken.transferFrom(msg.sender,address(this),_amount);
            //获取当前的ethBalance并向用户发送ethBalance数量的LP代币
            //提供的‘流动性’等于ethBalance，因为这是第一次使用
            //就是在合约中加入ETH,所以无论ETH的合约是什么，都等于所提供的合约
            //当前addLiquidity调用中的用户
            //需要在addLiquidity调用中铸造给用户流动性代币应该总是成比例的
            //d对用户指定ETH
            liquidity = ethBalance;
            //_mint是ERC20的智能合约公道，铸币ERC20代币
            _mint(msg.sender, liquidity);
        }else{
            /*
               如果预留不是空的，则吸收任何用户提供的Ether的价值，
               并根据比例确定需要提供多少Crypto Dev代币，
               以防止由于额外的流通性造成的任何大的价格影响。
             */
             //ethserve应该是当前ethBalance 减去用户发送的ether值
             //在当前ethreserve调用
            uint ethReserve = ethBalance - msg.value;
             //应该始终保持比率，以便在增加流动性时不会对价格产生重大影响
             //这里的比率是----(cryptoDevTokenAmount user can add/cryptoDevTokenReserve in the contract) = (ETH sent by the user/ ETH Reserve in the contract)
             //所以要这样计算 ---(cryptoDevTokenAmount user can add)= (ETH Sent by the user *cryptoDevTokenReserve / ETH reserve)
            uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve)/(ethReserve);
            require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimun tokens required");
             //仅从转移（cryptoDevTokenAmount user can add）来自用户账户的crypto dev token的数量到合约
            cryptoDevToken.transferFrom(msg.sender, address(this),cryptoDevTokenAmount);
            //将发送给用户的LP代币金额应该与流动性成正比
            //用户添加ether
            //这里要维持的比率是
            //(LP tokens to be sent to the user(liquidity)/totalSupply of LP tokens in contract)= (ETH sent by the user)/(ETH reserve in the contract)
            //所有要这样计算---liquidity = (totulSupply of LP tokens in contract * (ETH sent bt the user))/(ETH reserve in the contract)
            liquidity = (totalSupply()* msg.value)/ethReserve;
            _mint(msg.sender, liquidity);
        }
        return liquidity;       
    }
    
    /**
    *@dev 清除流动性 返回将在交换中返回给用户的ETH/Crypto Dev 代币数量
     */
    function removeLiquidity(uint _amount) public returns(uint, uint){
        require(_amount > 0 ,"_amount should be greater than zero");
        uint ethReserve = address(this).balance;
        uint _totalSupply = totalSupply();
         //将发送回用户的ETH数量基于一个比率
         //比率是---(ETH sent back to the user)/(current ETH reserve) = (amount of LP tokens than user wants to withdraw)/(total supply of LP tokens)
         //公式是---(ETH sent back to the user)= (current ETH reserve * amount of LP tokens that user wants to withdraw)/(total supply of LP tokens)
        uint ethAmount = (ethReserve * _amount)/_totalSupply;
         //将发回给用户的Crypto Dev代币的数量是基于一个比率
         //比率是---（Crypto Dev sent back to the user）/(current Crypto Dev token reserve)= (amount of LP tokens that user wants to withdraw)/ (total supply of LP tokens)
         //公式是---(Crypto Dev sent back to the user) = (current Crypto Dev token reserve * _amount of LP tokens that user wants to withdraw)/(totul supply of LP tokens )
        uint cryptoDevTokenAmount = (getReserve() * _amount)/_totalSupply;
        //从用户的钱包中烧毁发送的LP 代币，因为它们已经被发送已删除流动性
        _burn(msg.sender, _amount);
        //将ETH 的EthAmount 从用户的钱包转移到合约中
        payable(msg.sender).transfer(ethAmount);
        // 将Crypto Dev的CryptoDev TokenAmount 从用户钱包转移到合约中
        ERC20(cryptoDevTokenAdress).transfer(msg.sender,cryptoDevTokenAmount);
        return (ethAmount,cryptoDevTokenAmount);
    }

    /**
    *@dev 返回将交换中的返回给用户的ETH/CryptoDev代币数量
    *输入储备和输出储备将取决与我们正在实施的交换。eth代币或CryptoDev反之亦然
     */
    function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
        ) public pure returns(uint256){
            require(inputReserve > 0 && outputReserve > 0 ,"invalid reserves");
             //我们收取的费用是1%
             //Input amount with fee = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100
            uint256 inputAmountWithFee = inputAmount * 99;
             //因为我们需要遵循是--XY = K curve 的曲线概念
             //我们需要确保 --(x + Δx) * (y - Δy) = x * y
             //因此，最终公式为--Δy = (y * Δx) / (x + Δx)
             //在我们的例子下，Δy是要接收的代币
             //Δx = ((input amount)*99)/100, x= inpuntReserve, y= outputReserve
             //因此，通过将值放进公式中，可以获得分子和分母
            uint256 numerator = inputAmountWithFee * outputReserve;
            uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
            return numerator / denominator;
        } 

    /**
    *@dev  用户ETH交换 CryptoDev代币
     */
    function ethToCryptoDevToken(uint _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        //调用getAmountOfTokens来获取Crypto Dev代币的数量
        /*
           请注意，我们发送的inputReserve等于address(this).balance - msg.value
           而不仅仅是address(this).balance,
           因为address(this).balance已经包含用户在给定调用中发送的msg.value,
           所以我们需要减去它才能得到实际的输入储备
         */
        uint256 tokensBought = getAmountOfTokens(
            msg.value, 
            address(this).balance - msg.value, 
            tokenReserve
            );
        require(tokensBought >= _minTokens, "insufficient output amount"); 
        //将Crypto Dev代币转移给用户
        ERC20(cryptoDevTokenAdress).transfer(msg.sender, tokensBought);   
    }

    /**
    *@dev 为ETH交换CryptoDev代币
     */
    function cryptoDevTokenToEth(uint _tokensSold, uint _minEth) public {
        uint256 tokenReserve = getReserve();
        //调用getAmountOfTokens来获取ETH的数量
        //交换后返回给用户
        uint256 ethBought = getAmountOfTokens(
            _tokensSold, 
            tokenReserve, 
            address(this).balance
            );
        require(ethBought >= _minEth, "insufficient output amount");
        //将CryptoDev代币从用户地址转移到合约中
        ERC20(cryptoDevTokenAdress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        //从合约中将ETHBought发送给用户
        payable(msg.sender).transfer(ethBought);    
    }
}