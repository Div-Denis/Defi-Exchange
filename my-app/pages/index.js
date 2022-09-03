import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import styles from '../styles/Home.module.css'
import { BigNumber,providers,utils} from "ethers";
import { getCDTokensBalance, getEtherBalance, getLPTokensBalance, getReserveOfCDTokens } from '../utils/getAmount';
import { getAmountOfTokensReceivedFromSwap, swapTokens } from '../utils/swap';
import { addLiquidity, calculateCD } from '../utils/addLiquidity';
import { getTokensAfterRemove, removeLiquidity } from '../utils/removeLiquidity';
import Web3Modal from "web3Modal";


export default function Home() {
  /*一般性状态变量 */
  //跟踪是否在价值
 const [loading, setLoading] = useState(false);
 //这个变量时大数字形式的0
 const zero = BigNumber.from(0);
 //我们在这个dapp中有两个选项卡，流动性选项卡和交换选项卡。
 //此变量保留用户所在的选项卡的跟踪
 //如果为true，则表示用户位于流动性选项卡上
 //否则位于交换的选项卡上
 const [liquidityTab,setLiquidityTab] = useState(false);

 /*跟踪金额的变量 */
 //ethBalance跟踪用户账户持有的ETH的数量
 const [etherBalance, setEtherBalance] = useState(zero);
 //CDBlance 跟踪用户账户持有的CD代币数量
 const [cdBalance, setCDBalance] = useState(zero);
 //LPBlance 跟踪用户账户持有的LP代币数量
 const [lpBalance, setLPLPBalance] = useState(zero);
 //跟踪交易所合约中CD代币的储备余额
 const [reservedCD, setReservedCD] = useState(zero);
 //跟踪合约中的ETH余额
 const [etherBalanceContract, setEtherBalanceContract] = useState(zero);

 /*用户跟踪交换功能 */
 //用户想要交换的金额
 const [swapAmount, setSwapAmount] = useState("");
 //跟踪完成后用户将接收后的代币数量
 const [tokenToBeReceivedAfterSwap, setTokenToBeReveivedAfterSwap] = useState(zero);
 //跟踪ETH或CD代币是否被删除。如果ETH被删除，
 //这意味着用户想要用一些ETH交换一些CD代币，反之亦然，如果ETH没有被选中
 const [ethSelected, setEthSelected] = useState(true);

 /**用户跟踪要添加或删除的流动性的变量 */
 //跟踪用户想要添加到流动性的CD代币的数量
 //以防没有初始流动性并且在添加流动性之后
 //它会跟踪用户可以添加的CD代币，给定一定量的ETH
 const [addCDTokens, setAddCDTokens] = useState(zero);
 //跟踪用户想要添加到流动性中的Ether的数量
 const [addEther, setAddEther] = useState(zero);
 //根据一定数量的LP代币返回给用户Ether代币的数量
 const [removeEthre, setRemoveEther] = useState(zero);
 //是CD代币的数量，该代币将根据用户提取一定数量的LP 代币发送回给用户
 const [removeCD, setRemoveCD] = useState(zero);
 //用户想要从流动性中移除的LP代币数量
 const [removeLPTokens, setRemoveLPTokens] = useState("0");

  /*用于钱包连接 */
  //跟踪钱包是否连接
  const [walletConnected, setWalletConnected] = useState(false);
  //创造一个指向Web3 Modal(用户连接钱包)的引用，只要页面打开，他就一直存在
  const web3ModalRef = useRef();

  /**
   * 调用各种函数来检索ethBalance,LP代币等的金额
   */
  const getAmounts =async () =>{
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      //获取用户账户中的ETH数量
      const _ethBalance = await getEtherBalance(provider,address);
      //获取用户持有的CD代币数量
      const _cdBalance = await getCDTokensBalance(provider,address);
      //获取用户持有的LP代币数量
      const _lpBalance = await getLPTokensBalance(provider,address);
      //获取交易所合约中存在的CD代币的储备
      const _reservedCD= await getReserveOfCDTokens(provider);
      //在合约中获取ETH的储备
      const _ethBalanceContract = await getEtherBalance(provider,null,true);
      setEtherBalance(_ethBalance);
      setCDBalance(_cdBalance);
      setLPLPBalance(_lpBalance);
      setReservedCD(_reservedCD);
      setReservedCD(_reservedCD);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };

  /*******交换功能 ********/
  
  /**用ETH/CD代币的tokenToBeReceivedAfterAwap数量交换CD/ETH代币的swapAmountWei数量 */
  const _swapTokens = async () => {
    try {
      //使用ether.js中的parseEther库将用户输入的金额转换为一个BigNumber
      const swapAmountWei = utils.parseEther(swapAmount);
      //检查用户是否输入为0
      //我们在这里使用了ether.js 中的BigNumber类的eq方法
      if(!swapAmountWei.eq(zero)){
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        //从utils文件夹调用swapTokenss函数
        await swapTokens(
          signer,
          swapAmountWei,
          tokenToBeReceivedAfterSwap,
          ethSelected
        );
        setLoading(false);
        //获取交换后所有更新的金额
        await getAmounts();
        setSwapAmount("");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");
    }
  };

  /**
   * 返回当用户交换_swapAmountWEI数量的ETH/CD代币时，可以接收到CD/ETH代币的数量
   */
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      //使用ether.js中parseEther库将用户输入的金额转换为BigNumber
      const _swapAmountWEI = utils.parseEther(_swapAmount.toString());
      //检查用户是否输入了0
      //我们在这里使用了ether.js中的BigNumber类的eq方法
      if(!_swapAmountWEI.eq(zero)){
        const provider = await getProviderOrSigner();
        //获取合约中ETH的数量
        const _ethBalance = await getEtherBalance(provider,null,true);
        //从utils文件夹中调用getAmountOfTokensReceivedFromSwap
        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          _swapAmountWEI,
          provider,
          ethSelected,
          _ethBalance,reservedCD
        );
        setTokenToBeReveivedAfterSwap(amountOfTokens);
      }else{
        setTokenToBeReveivedAfterSwap(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };
  /******* END ********/

  /******* 增加流动性的功能 ********/

  /**
   * 有助于增加交易所的流动性
   * 如果用户正在添加初始流动性，则用户决定要添加到交易所的ETH和CD代币。
   * 如果他在已经添加了初始流动性之后添加流动性，那么我们计算他可以添加的CD代币，
   * 给定他想通过保持比率恒定来添加的ETH
   */
  const _addLiquidity = async () =>{
    try {
      //将用户输入的ETH金额转换为BIgnumber
      const addEtherWei = utils.parseEther(addEther.toString());
      //检查值是否为0
      if(!addCDTokens.eq(zero) && !addEtherWei.eq(zero)){
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        //从utils文件夹调用addLiquidity函数
        await addLiquidity(
          signer,
          addCDTokens,
          addEtherWei
        );
        setLoading(false);
        //重新初始化CD代币
        setAddCDTokens(zero);
        //在增加流动性之后，获取所有值的金额
        await getAmounts();
      }else{
        setAddCDTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
    }
  };
  /******* END ********/


  /******* 删除流动性功能 ********/
  /**
   * 从流动性中删除LPTokensWei的删除LPTokensWei数量，以及计算出的ETH和CD代币数量
   */
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      //将用户输入的LP代币转化为BigNumber
      const removeLPTokenWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      await removeLiquidity(signer,removeLPTokenWei);
      setLoading(false);
      await getAmounts();
      setRemoveCD(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error();
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    }
  };
  
  /**
   * 计算用户从合约中移除LP代币removLPTokenWei数量后将返回给用户的ETH和CD代币的数量
   */
  const _getTokensAfterRemove = async (_removeLPTokens) =>{
    try {
      const provider = await getProviderOrSigner();
      //将用户输入的LP 转换为BigNumber
      const removeLPTokenWei = utils.parseEther(_removeLPTokens);
      //获取交易所合约中的ETH储备金
      const _ethBalance = await getEtherBalance(provider,null,true);
      //获取合约中CD代币的储备
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);
      //从utils文件夹调用getTokensAfterRemove
      const {_removeEther, _removeCD } = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        cryptoDevTokenReserve
      );
      setRemoveEther(_removeEther);
      setRemoveCD(_removeCD);
    } catch (err) {
      console.error(err);
    }
  };
  /******* END ********/



  /**
   * 连接钱包
   */
  const connectWallet = async () =>{
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };
  
  /**
   * 返回一个Provider或signer对象，表示以太坊RPC，带或不带钱包的签名功能
   * 需要一个provider来与区块链来交互--读取事务。读取余额。读取状态
   * 
   * signer是一种特殊的提供程序，用于在需要向区块链发送写的事务的情况下，
   * 这涉及到连接的账户需要做出数字签名来授权正在发送的事务，
   * 钱包公开了一个Signer API ，允许你的网站使用Signer函数从用户请求签名
   * @param {*} needsigner 需要签名者为true,否则为false
   * @returns 
   */
  const getProviderOrSigner = async (needSigner = false) =>{
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const{chainId} = await web3Provider.getNetwork();
    if(chainId !== 4){
      window.alert("Change the network to Rinkeby");
      throw new Error("Change the network to Rinkeby");
    }

    if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /**
   * 用于对网站状态的变化做出反应
   * 函数待用末尾的数组表示什么状态会触发这个效果
   * 在这种情况下，每当walletConnected的值发生变化时，都会调用此效果
   */
  useEffect(() =>{
    //如果钱包没有连接，创建一个新的Web3Modal实例连接钱包
    if(!walletConnected){
      //通过设置它的current值，将Web3Modal类分配给引用对象
      //只要此页面打开，current值就会一直存在
      web3ModalRef.current = new Web3Modal({
        network:"rinkeby",
        providerOptions:{},
        disableInjectedProvider:false,
      });
      connectWallet();
      getAmounts();
    }
  },[walletConnected]);

  /**
   * 根据dapp的状态返回一个按钮
   */
  const renderButton = () =>{
    //如果钱包没有连接，返回一个允许他们连接钱包的按钮
    if(!walletConnected){
      return(
        <button onClick={connectWallet} className={styles.button}>
          Connect your Wallet
        </button>
      );
    }
    
    //如果我们正在等待，返回一个加载按钮
    if(loading){
      return <button className={styles.button}>Loading...</button>
    }

    if(liquidityTab){
      return(
        <div>
          <div className={styles.description}>
            You have:
            <br/>
            {/* 使用ether.js中的formatEther函数将BigNumber转换为字符串*/}
            {utils.formatEther(cdBalance)} Crypto Dev Tokens
            <br/>
            {utils.formatEther(etherBalance)}Ether
            <br/>
            {utils.formatEther(lpBalance)}Crypto Dev LP tokens
          </div>
          <div>
            {/*如果预留的CD代币为0，则将流动性状态呈现为0，
              我们询问用户他想要添加多少初始流动性，否则只呈现流动性不为0的状态，
              我们根据用户指定的ETH数量计算如何可以添加许多CD代币*/}
            {utils.parseEther(reservedCD.toString()).eq(zero)?(
              <div>
                <input
                   type="number"
                   placeholder='Amount of Ether'
                   onChange={(e) => setAddEther(e.target.value || "0")}
                   className={styles.input}
                   />
                <input
                   type="number"
                   placeholder='Amount of CryptoDev Tokens'
                   onChange={(e) => setAddCDTokens(
                    BigNumber.from(utils.parseEther(e.target.value || "0"))
                   )}
                   className={styles.input}
                   />
                   <button className={styles.button} onClick={_addLiquidity}>
                    Add
                   </button>
              </div>
            ):(
              <div>
                <inpu 
                  type="number"
                  placeholder="Amount of Ether"
                  onChange={async (e) => {
                    setAddEther(e.target.value || "0");
                    //计算CD代币的数量
                    //可以添加给定e.tatget.value的ETH数量
                    const _addCDTokens = await calculateCD(
                      e.target.value || "0",
                      etherBalanceContract,
                      reservedCD
                    );
                    setAddCDTokens(_addCDTokens);
                  }}
                  className={styles.input}
                  />
                  <div className={styles.inputDiv}>
                    {/*使用ether.js 中的formarEther函数将BigNumber转换为字符串*/}
                    {`You will need ${utils.formatEther(addCDTokens)}}Crypto Dev Tokens `}
                  </div>
                  <button className={styles.button} onClick={_addLiquidity}>
                    Add
                  </button>
              </div>
            )}
            <div>
              <input 
                 type="number"
                 placeholder='Amount of LP Tokens'
                 onChange={async(e) => {
                  setRemoveLPTokens(e.target.value || "0");
                  //计算用户将收到的以太币和CD代币的数量
                  //在他移除e.target,value之后代币的数量
                  await _getTokensAfterRemove(e.target.value || "0");
                 }}
                 className={styles.input}
                 />
                 <div className={styles.inputDiv}>
                  {/*使用ether.js 中的formatEther函数将BigNumber转换成字符串*/}
                  {`You will get ${utils.formatEther(removeCD)} 
                   Crypto Dev Tokens and ${utils.formatEther(removeEthre)} Eth`}
                 </div>
                 <button className={styles.button1} onClick={_removeLiquidity}>
                  Remove
                 </button>
            </div>
          </div>
        </div>
      );
    }else{
      return(
        <div>
          <input 
             type="number"
             placeholder="Amount"
             onChange={async (e) => {
              setSwapAmount(e.target.value || "");
              //计算交换后用户将收到的代币数量
              await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
             }}
             className={styles.input}
             value={swapAmount}
             />
             <select 
               className={styles.select}
               name="dropdown"
               id="dropdown"
               onChange={async () => {
                setEthSelected(!ethSelected);
                //将值初始化为0
                await _getAmountOfTokensReceivedFromSwap(0);
                setSwapAmount("");
               }}
             >
              <option value="eth">Ether</option>
              <option value="cryptoDevToken">Crypto Dev Token</option>
             </select>
             <br/>
             <div className={styles.inputDiv}>
              {/*使用ether.js 中的formatEther函数将BigNumber转换成字符串*/}
              {ethSelected
              ?`You will get ${utils.formatEther(tokenToBeReceivedAfterSwap)}Crypto Dev Tokens`
               : `You will get ${utils.formatEther(tokenToBeReceivedAfterSwap)}Eth`}
             </div>
             <button className={styles.button} onClick={_swapTokens}>
              Swap
             </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content='Whitelist-Dapp'/>
        <link rel='icon' href='/favicon.ico'/>
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs Exchange!</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Ctypto Dev Tokens
          </div>
          <div>
            <button 
               className={styles.button}
               onClick={() =>{
                setLiquidityTab(true)
               }}>
                Liquidity
            </button>
            <button 
               className={styles.button}
               onClick={() =>{
                setLiquidityTab(false)
               }}
               >
                Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
        <img className={styles.image} src="./cryptodev.svg"/>
        </div>
      </div>

      <footer className={styles.footer}>
        Made with by Crypto Devs
      </footer>
    </div>
  )
}
