//const OptionPair = artifacts.require('TokenOption') // for live
const OptionFactory = artifacts.require('MockOptionFactory')
const OptionFactoryWeth = artifacts.require("MockWethOptionFactory")
const OptionPair = artifacts.require('MockOptionPair') // for test
const TestToken1 = artifacts.require('MockToken1')
const TestToken2 = artifacts.require('MockToken2')
const TokenOption = artifacts.require('TokenOption')
const TokenAntiOption = artifacts.require('TokenAntiOption')
const SimpleFeeCalculator = artifacts.require('SimpleFeeCalculator')
const SimpleFeeCalculatorWethDai = artifacts.require('SimpleFeeCalculatorTest')
const ERC20 = artifacts.require('ERC20')
const DAI = artifacts.require('DAI')
const Weth = artifacts.require('Weth')
const ExchangeAdapter = artifacts.require('MockExchangeAdapter')
const ExchangeAdapterOasis = artifacts.require('ExchangeAdapterOasisImpl')
const MockOasisDirect = artifacts.require('MockOasisDirect')
const OptionSerieToken = artifacts.require('OptionSerieToken')
const RequestHandler = artifacts.require('OSDirectRequestHandler')
const FeeCalculator = artifacts.require('IFeeCalculator')

var BigNumber = require('bignumber.js')

const DECIMAL_FACTOR = 10 ** 18

//const EBOE = artifacts.require('EBOE')
/* const OptionFactory = artifacts.require('MockOptionFactory')
 // for test
const TestToken1 = artifacts.require('MockToken1')
const TestToken2 = artifacts.require('MockToken2') */


const BasisToken = TestToken2
const UnderlyingToken = TestToken1

const buyer1 = '0x627306090abab3a6e1400e9345bc60c78a8bef57'
const writer1 = '0xf17f52151ebef6c7334fad080c5704d77216b732'
const buyer2 = '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef'
const optionSerieCreator = '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2'
const optionSerieTokenBuyer = '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e'
const writer2 = '0x2191ef87e392377ec08e7c08eb105ef5448eced5'

const tokensOwner = '0x5aeda56215b167893e80b4fe645ba6d5bab767de'
const optionFactoryCreator = '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc'
const optionTokenCreator = '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5'




/* const accounts = ['0x627306090abab3a6e1400e9345bc60c78a8bef57',
   '0xf17f52151ebef6c7334fad080c5704d77216b732',
   '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef']  */

if (typeof web3 !== 'undefined') {
  console.log('web3 is defined');

} else {
  throw 'web3 is not defined'
  console.log('web3 is not defined');
}


async function getAccountsBalances(token, accs) {
  const res = await Promise.all(accs.map((acc) =>  token.balanceOf(acc, {from: acc}).valueOf()))
  return res
}

var basisToken
var underlyingToken
var eboeToken
const fee = 2
var optFactory
var optionPair
var tokenOption
var optionSerieToken

contract ("Tokens:", async  () =>  {

  it ('token1: account tokenOwner balance should be 1000000000, others 0', async () => {
    const token = await TestToken1.deployed()
    underlyingToken = token
    let bals = await getAccountsBalances(token, [tokensOwner, buyer1, writer1])
    assert.equal(1000000000, bals[0])
    assert.equal(0, bals[1])
    assert.equal(0, bals[2])
  })

  it ('token2 account tokenOwner balance should be 100000, for others 0', async () => {
    const token = await TestToken2.deployed()
    basisToken = token
    let bals = await getAccountsBalances(token, [tokensOwner, buyer1, writer1])
    assert.equal(100000, bals[0])
    assert.equal(0, bals[1])
    assert.equal(0, bals[2])
  })

  it ("giving 1000000 underlying token to writer1 should function", async () => {
    const transferAmount = 100000
    await underlyingToken.transfer(buyer1, transferAmount, {from: tokensOwner})
    const  bal = await underlyingToken.balanceOf(buyer1)
    assert.equal(transferAmount, bal)
    }
  )

  it ("giving 10000 basis token to buyer1 should function", async () => {
    const transferAmount = 10000
    await basisToken.transfer(buyer1, transferAmount, {from: tokensOwner})
    const  bal = await basisToken.balanceOf(buyer1)
    assert.equal(transferAmount, bal)
  })

   it ("giving 1000 basis token to writer1 should function", async () => {
     const transferAmount = 1000
     await basisToken.transfer(writer1, transferAmount, {from: tokensOwner})
     const  bal = await basisToken.balanceOf(writer1)
     assert.equal(transferAmount, bal)
    })
})

contract ("DAI", async () => {
  it("should be created and caller owns the supply", async () => {
    let dai = await DAI.new({from: tokensOwner})
    assert.equal((await dai.balanceOf.call(tokensOwner)).toNumber(), (await dai.totalSupply.call()).toNumber())
  })

  it("deployed DAI should be ditributed over accounts", async () => {
    let dai = await DAI.deployed()
    let bals = await Promise.all(web3.eth.accounts
      .map((acc) => dai.balanceOf(acc)))
    assert(bals.every(bal => bal >= 1000*(10**18)))
  })
})

contract("Mocked Exchange should function", () => {
  var weth, dai, exchange
  it ("initialized", async () => {
    weth = await Weth.deployed()
    dai = await DAI.deployed()
    exchange = await ExchangeAdapter.deployed()
    await dai.transfer(exchange.address, 1000 * DECIMAL_FACTOR, {from: buyer1})
    await weth.deposit({from: buyer1, value: 20 * DECIMAL_FACTOR})
    await weth.approve(exchange.address, 20 * DECIMAL_FACTOR,
      {from: buyer1})
  })

  it ("should fail if limit amount to get exceeds amount which exchange provides", async () => {
    try {
      await exchange.sell(weth.address, 5, dai.address, 120, buyer1, {from: buyer1})
      assert(false) //should not be here
    } catch (e) {
      //NOP
    }
  })

  it ("should correct exchange", async () => {

    let startBalanceWethBuyer1 = await weth.balanceOf(buyer1)
    let startBalanceDaiBuyer1 = await dai.balanceOf(buyer1)
    let startBalanceWethExch = await weth.balanceOf(exchange.address)
    let startBalanceDaiExch = await dai.balanceOf(exchange.address)

    await exchange.sell(weth.address, 5, dai.address, 1, buyer1, {from: buyer1})
    let endBalanceWethBuyer1 = await weth.balanceOf(buyer1)
    let endBalanceDaiBuyer1 = await dai.balanceOf(buyer1)
    let endBalanceWethExch = await weth.balanceOf(exchange.address)
    let endBalanceDaiExch = await dai.balanceOf(exchange.address)

    assert.ok(startBalanceWethBuyer1.sub(endBalanceWethBuyer1).toNumber() == 5,
    "balance of weth for buyer1 should decreasem for sold amount")
    assert.ok(endBalanceWethExch.sub(startBalanceWethExch).toNumber() == 5,
    "balance of weth for exchange should decrease for sold amount")
    assert.ok(endBalanceDaiBuyer1.sub(startBalanceDaiBuyer1).toNumber() == 5 * 110,
    "balance of dai for buyer1 should increase for sold amount of weth multiply by exRate(110)")
    assert.ok(startBalanceDaiExch.sub(endBalanceDaiExch).toNumber() == 5 * 110,
    "balance of dai for buyer1 should increase for sold amount of weth multiply by exRate(110)")

  })
})

contract("Mocked Oasis.Direct Exchange should function", () => {
  var weth, dai, exchange, mockOasisDirect
  it ("initialized", async () => {
    weth = await Weth.deployed()
    dai = await DAI.deployed()
    exchange = await ExchangeAdapterOasis.deployed()
    mockOasisDirect = await MockOasisDirect.deployed()
    await dai.transfer(mockOasisDirect.address, 1000 * DECIMAL_FACTOR, {from: buyer1})
    await weth.deposit({from: buyer1, value: 20 * DECIMAL_FACTOR})
    await weth.approve(exchange.address, 20 * DECIMAL_FACTOR,
      {from: buyer1})
  })

  it ("should fail if limit amount to get exceeds amount which exchange provides", async () => {
    try {
      await exchange.sell(weth.address, 5, dai.address, 120, buyer1, {from: buyer1})
      assert(false) //should not be here
    } catch (e) {
      //NOP
    }
  })

  it ("should correct exchange", async () => {

    let startBalanceWethBuyer1 = await weth.balanceOf(buyer1)
    let startBalanceDaiBuyer1 = await dai.balanceOf(buyer1)
    let startBalanceWethExch = await weth.balanceOf(exchange.address)
    let startBalanceDaiExch = await dai.balanceOf(exchange.address)

    await exchange.sell(weth.address, 5, dai.address, 1, buyer1, {from: buyer1})
    let endBalanceWethBuyer1 = await weth.balanceOf(buyer1)
    let endBalanceDaiBuyer1 = await dai.balanceOf(buyer1)
    let endBalanceWethExch = await weth.balanceOf(exchange.address)
    let endBalanceDaiExch = await dai.balanceOf(exchange.address)

    assert.ok(startBalanceWethBuyer1.sub(endBalanceWethBuyer1).toNumber() == 5,
    "balance of weth for buyer1 should decrease for sold amount")
    assert.ok(endBalanceDaiBuyer1.sub(startBalanceDaiBuyer1).toNumber() == 5 * 110,
    "balance of dai for buyer1 should increase for sold amount of weth multiply by exRate(110)")
  })
})


contract ("Option With Sponsor", async() => {

  var optFactory, optionPairAddress, optionSerieToken, erc721tokenId
  const strike = 15
  const underlyingQty = 10
  const expireTime = new Date()/1000 + 60*60*24*30

  it ("iniztialize", async () => {
    optFactory = await OptionFactory.deployed()
    optionSerieToken = await OptionSerieToken.deployed()
    erc721tokenId = await optionSerieToken.getTokenId(underlyingToken.address, basisToken.address,
      strike, underlyingQty, expireTime)
    optionSerieToken = await OptionSerieToken.deployed()
    await optionSerieToken.mint(optionSerieCreator, erc721tokenId, {from: tokensOwner})
    assert.equal(await optionSerieToken.ownerOf(erc721tokenId),
      optionSerieCreator, "owner should be option factory creator")
  })

  it ("second mint should fail", async () => {
    try {
      await optionSerieToken.mint(optionSerieCreator, erc721tokenId, {from: tokensOwner})
      assert(false)
    } catch (e) {
      //NOP
    }
  })

  it ("Option Line Creation should function", async () => {
    const trans = await  optFactory.createOptionPairContract(underlyingToken.address, basisToken.address,
      strike, underlyingQty, expireTime,
    {from: optionSerieCreator})
    optionPairAddress = trans.logs[0].args.optionPair
  })

  it ("Use the same ERC721 token twice should fail", async () => {
    try {
      const trans = await  optFactory.createOptionPairContract(underlyingToken.address, basisToken.address,
        strike, underlyingQty, expireTime,
      {from: optionSerieCreator})
    //  optionPairAddress = trans.logs[0].args.optionPair
      console.log("reached")
      assert(false) //should not be there
    } catch (e) {
      //NOP
    }
  })

  it ("writeOptionsFor should function", async () => {
    optionPair = await OptionPair.at(optionPairAddress)
    await basisToken.transfer(optionFactoryCreator, 1000, {from: tokensOwner})
    await underlyingToken.transfer(optionFactoryCreator, 1000, {from: tokensOwner})
    await basisToken.approve(optionPair.address, 100, {from: optionFactoryCreator})
    await underlyingToken.approve(optionPair.address, 100, {from: optionFactoryCreator})
    await optionPair.writeOptionsFor(10, writer1, false, {from: optionFactoryCreator})
    assert.equal(900, (await underlyingToken.balanceOf(optionFactoryCreator)).toNumber())
    const tokenOption = await TokenOption.at(await optionPair.tokenOption.call())
    assert.equal(10, (await tokenOption.balanceOf(writer1)).toNumber())
    const tokenAntiOption = await TokenAntiOption.at(await optionPair.tokenOption.call())
    assert.equal(10, (await tokenAntiOption.balanceOf(writer1)).toNumber())
    let feeBeneficiary = await optionPair.feeTaker()
    assert.equal(20, (await basisToken.balanceOf(feeBeneficiary)).toNumber()) //fee went to optionPair feeTaker
    assert.equal(980, (await basisToken.balanceOf(optionFactoryCreator)).toNumber())
  })

  it ("fee can not be retieved by  not token owner", async () => {
    try {
      let feeTaker = await optionPair.feeTaker()
      assert.equal((await basisToken.balanceOf(feeTaker)).toNumber() > 0, "balance should be non-zero") 
      await optFactory.withdrawFee(optionPair.address, {from: optionSerieCreator})
      assert(false, "should not reach")
    } catch (e) {
      //NOP
    }
  })

  it ("fee can be retieved by token owner", async () => {
    let balanceFeeBefore = await basisToken.balanceOf(optionSerieCreator)
    let feeTaker = await optionPair.feeTaker()
    await optFactory.withdrawFee(optionPair.address, {from: optionSerieCreator})
    let balanceFeeAfter = await basisToken.balanceOf(optionSerieCreator)
    assert.equal(0, (await basisToken.balanceOf(feeTaker)).toNumber(), "balance of feeTaker should be zeroed")
    assert.equal(20, (balanceFeeAfter.sub(balanceFeeBefore)).toNumber(), "collected fee should be transfered to token owner")
  })
})

contract ("Write Options Via OptionFactory", async() => {
  const strike = 15
  const underlyingQty = 10
  const expireTime = new Date()/1000 + 60*60*24*30
  it ("write options via OptionFactory should function", async () => {
    const optFactory = await OptionFactory.deployed()
    await basisToken.transfer(writer1, 1000, {from: tokensOwner})
    await underlyingToken.transfer(writer1, 1000, {from: tokensOwner})

    optionSerieToken = await OptionSerieToken.deployed()
    erc721tokenId = await optionSerieToken.getTokenId(underlyingToken.address, basisToken.address,
      strike, underlyingQty, expireTime)
    await optionSerieToken.mint(optionFactoryCreator, erc721tokenId,
      {from: tokensOwner})

    var trans = await  optFactory
      .createOptionPairContract(underlyingToken.address, basisToken.address,
        strike, underlyingQty, expireTime, {from: optionFactoryCreator})
    //console.log(trans)
    optionPair = await OptionPair.at(trans.logs[0].args.optionPair)
    await underlyingToken.approve(optFactory.address, 1000, {from: writer1})
    await basisToken.approve(optFactory.address, 1000, {from: writer1})
    await optFactory.writeOptions(optionPair.address, 10, {from: writer1});
    let tokOptionAddress = await optionPair.tokenOption.call()
    const tokenOption = await TokenOption.at(tokOptionAddress)
    assert.equal(10, (await tokenOption.balanceOf(writer1)).toNumber())
    const tokenAntiOption = await TokenAntiOption.at(await optionPair.tokenAntiOption.call())
    assert.equal(10, (await tokenAntiOption.balanceOf(writer1)).toNumber())
    let feeBeneficiary = await optionPair.feeTaker()
    assert.equal(20, (await basisToken.balanceOf(feeBeneficiary)).toNumber()) //fee is taken by optionPair feeTaker
    assert.equal(980, (await basisToken.balanceOf(writer1)).toNumber())
  })
})

contract ("Options DAI/WETH", async () => {
  const strike = 150
  const underlyingQty = 2
  const expireTime = new Date()/1000 + 60*60*24*30
  var optFactory,
    optionPair,
    tokenOption,
    tokenAntiOption,
    dai,
    weth,
    optionsToWrite
  it ("write options via OptionFactory for Weth/DAI should function", async () => {
      weth = await Weth.deployed()
      dai = await DAI.deployed()
      optionsToWrite = 3 * DECIMAL_FACTOR
      var trans = await weth.deposit({from: writer1, value: 50 * DECIMAL_FACTOR})
      assert.equal(50 * DECIMAL_FACTOR, (await weth.balanceOf(writer1)).toNumber())
      //console.log(trans)
      optFactory = await OptionFactoryWeth.deployed()

      optionSerieToken = await OptionSerieToken.deployed()
      erc721tokenId = await optionSerieToken.getTokenId(weth.address, dai.address,
        strike, underlyingQty, expireTime)
      await optionSerieToken.mint(optionFactoryCreator, erc721tokenId,
        {from: tokensOwner})

      trans = await  optFactory.createOptionPairContract(weth.address, dai.address,
        strike, underlyingQty, expireTime,
      {from: optionFactoryCreator})
      optionPair = await OptionPair.at(trans.logs[0].args.optionPair)
      await weth.approve(optFactory.address, 1000 * DECIMAL_FACTOR, {from: writer1})

      assert.equal(0, (await weth.balanceOf(optFactory.address)).toNumber())

      await optFactory.writeOptions(optionPair.address, optionsToWrite , {from: writer1});

      tokenOption = await TokenOption.at(await optionPair.tokenOption.call() )
      assert.equal(optionsToWrite, (await tokenOption.balanceOf(writer1)).toNumber())
      tokenAntiOption = await TokenAntiOption.at(await optionPair.tokenAntiOption.call())
      assert.equal(optionsToWrite, (await tokenAntiOption.balanceOf(writer1)).toNumber())
      //check fee taking 3 is numerator, 10000 is denominator, s. 4_options_factory.js in migrations
      let feeBeneficiary = await optionPair.feeTaker()
      assert.equal(optionsToWrite * 3 / 10000, (await weth.balanceOf(feeBeneficiary)).toNumber()) //fee goes to optionPair feeTaker
  })

  it ("exercise options via OptionFactory should function", async() => {
    const optionsToExercise = optionsToWrite / 4
    assert.ok(optionsToExercise > 0, "optionsToExercise should be than 0")
    await tokenOption.transfer(buyer1, optionsToWrite , {from: writer1})
    assert.equal( optionsToWrite, (await  tokenOption.balanceOf(buyer1)).toNumber())
    assert.ok(optionsToExercise * strike <= (await dai.balanceOf(buyer1)).toNumber(),
     "should have enough basis tokens for execution")

    await tokenOption.approve(optionPair.address,  optionsToWrite, {from: buyer1})
    await dai.approve(optFactory.address, strike * optionsToWrite, {from: buyer1})
    assert.ok((await dai.allowance(buyer1, optFactory.address)).toNumber() >= strike * optionsToExercise)
    assert.equal(0, (await weth.balanceOf(buyer1)).toNumber())

    await optFactory.exerciseOptions(optionPair.address, optionsToExercise, {from: buyer1})

    assert.equal(optionsToWrite - optionsToExercise, (await tokenOption.balanceOf(buyer1)).toNumber())
    assert.equal(underlyingQty * optionsToExercise, (await weth.balanceOf(buyer1)).toNumber())


  })

  it ("should correctly exercised via an exchange", async () => {
    //transfer some Weth to Exchange

    var trans = await weth.deposit({from: tokensOwner, value: 50 * DECIMAL_FACTOR})
    await weth.transfer(ExchangeAdapter.address, 40 * DECIMAL_FACTOR, {from: tokensOwner})
    await dai.approve(optionPair.address, 0, {from: buyer1}) //dai should not be used
    await dai.transfer(ExchangeAdapter.address, 10000 * DECIMAL_FACTOR,
      {from: tokensOwner});
    let balExchDai = await dai.balanceOf(ExchangeAdapter.address)

    let startBalanceDai = await dai.balanceOf(buyer1)
    let startBalanceWeth = await weth.balanceOf(buyer1)
    let startBalanceToken = await tokenOption.balanceOf(buyer1)
    assert.ok(startBalanceToken.toNumber() > 0, "option token balance should be greater than 0")
    let optionsToExercise = startBalanceToken.div(4)

    await tokenOption.approve(optionPair.address, optionsToExercise)
    let limitAmountPerOneOption = 155

    assert.ok(limitAmountPerOneOption >= strike, "required minimum amount to get per 1 option should be more than strike price")
    let limitDaiAmouunt = limitAmountPerOneOption * optionsToExercise 
    
    await optionPair.exerciseWithTrade (optionsToExercise,  limitDaiAmouunt,
      ExchangeAdapter.address)
    let endBalanceDai = await dai.balanceOf(buyer1)
    let endBalanceWeth = await weth.balanceOf(buyer1)
    let endBalanceToken = await tokenOption.balanceOf(buyer1)
    //500 == exchange rate DAI per WETH
    let exRate = 110 //see migrations
    let daiShouldBe = optionsToExercise.mul(underlyingQty)
      .mul(new BigNumber(exRate)
      .sub((new BigNumber(strike)).div(underlyingQty)))
    assert.ok(endBalanceDai.sub(startBalanceDai).equals(daiShouldBe), "Dai should incerease")
    assert.ok( startBalanceToken.sub(endBalanceToken).equals(optionsToExercise), "option token aount should correspondingly decrease")
    assert.ok(endBalanceWeth.equals(startBalanceWeth), "Underlying balanve should not change")
  })

  it ("should correctly exercise all available options", async () => {
    //await dai.approve(optFactory.address, 100000000)
    let startBalanceDai = await dai.balanceOf(buyer1)
    let startBalanceWeth = await weth.balanceOf(buyer1)
    let startBalanceToken = await tokenOption.balanceOf(buyer1)
    assert.ok(startBalanceToken.toNumber() > 0, "should have some options on-hand")

    await tokenOption.approve(optionPair.address, startBalanceToken)
    await optFactory.exerciseAllAvailableOptions(optionPair.address, {from: buyer1})

    let endBalanceDai = await dai.balanceOf(buyer1)
    let endBalanceWeth = await weth.balanceOf(buyer1)
    let endBalanceToken = await tokenOption.balanceOf(buyer1)


    assert.equal(0, endBalanceToken.toNumber())
    assert.equal(startBalanceToken.sub(endBalanceToken).mul(underlyingQty).toNumber(),
      endBalanceWeth.sub(startBalanceWeth).toNumber())
    assert.equal(startBalanceToken.sub(endBalanceToken).mul(strike).toNumber(),
        startBalanceDai.sub(endBalanceDai).toNumber())

  })

  it ("annihilate all available options should function", async() => {
    assert.equal(0, (await tokenOption.balanceOf(writer1)).toNumber())
    assert.equal(optionsToWrite, (await tokenAntiOption.balanceOf(writer1)).toNumber())
    let optionsToWrite2 = 1 * DECIMAL_FACTOR

    await optFactory.writeOptions(optionPair.address, optionsToWrite2, {from: writer1});
    assert.equal(optionsToWrite2, (await tokenOption.balanceOf(writer1)).toNumber())

    await tokenOption.approve(optionPair.address, 1000 * DECIMAL_FACTOR, {from: writer1})
    await tokenAntiOption.approve(optionPair.address, 1000 * DECIMAL_FACTOR, {from: writer1})
    await optionPair.annihilateAllAvailable({from: writer1})
    assert.equal(0, (await tokenOption.balanceOf(writer1)).toNumber())
    assert.equal(optionsToWrite,
      (await tokenAntiOption.balanceOf(writer1)).toNumber())

  })

  it("write options with fee collected via ETH should function", async () => {
    let feeCalculatorAdresss = await optionPair.feeCalculator()
    let feeCalculator = await FeeCalculator.at(feeCalculatorAdresss)
    var feeTokenAddress, feeAmount
    [feeTokenAddress, feeAmount]  = await feeCalculator.calcFee(optionPair.address, optionsToWrite)
    assert.equal(weth.address, feeTokenAddress, "fee should be in Weth")
    let balWethBefore = await weth.balanceOf(writer1)
    let trans = await optFactory.writeOptionsWithEth(optionPair.address, optionsToWrite, {from: writer1, value: feeAmount.toNumber()})
    let balWethAfter = await weth.balanceOf(writer1)
    assert.equal(balWethBefore.sub(balWethAfter).toNumber(), optionsToWrite * underlyingQty)
  })




})


contract ("Option", () =>  {
  it ('transfer ownership for OptionFactory should be OK', async () => {
    optFactory = await OptionFactory.deployed()
    assert(optFactory.transferOwnership(optionTokenCreator, {from: optionFactoryCreator}))
  })


  it ('create option tokens for owner but without erc721 token should throw excepton', async () => {
    await basisToken.transfer(optionTokenCreator, 100, {from: tokensOwner})
    await basisToken.approve(optFactory.address, 100, {from: optionTokenCreator})

    try {
      var trans = await  optFactory.createOptionPairContract(underlyingToken.address, basisToken.address, 125, 100, new Date()/1000 + 60*60*24*30,
      {from: optionTokenCreator})
      assert(true)
    } catch(e) {
      //NOP
    }
  })

  it ('initializing via OptionFactory should be OK', async () => {

    await basisToken.transfer(optionTokenCreator, 100, {from: tokensOwner})
    await basisToken.approve(optFactory.address, 100, {from: optionTokenCreator})

    const balOfOptionCreatorBefore =  await basisToken.balanceOf(optionTokenCreator)

    const strike = 125
    const underlyingQty = 100
    const expireTime = new Date()/1000 + 60*60*24*30

    let optionSerieToken = await OptionSerieToken.deployed()
    let erc721tokenId = await optionSerieToken
      .getTokenId(underlyingToken.address, basisToken.address,strike,
        underlyingQty, expireTime)

    await optionSerieToken.mint(optionTokenCreator, erc721tokenId,
      {from: tokensOwner})

    var trans = await  optFactory
      .createOptionPairContract(underlyingToken.address, basisToken.address,
        strike, underlyingQty, expireTime,
        {from: optionTokenCreator})
    console.log("gas used for option pair creation is: " + trans.receipt.cumulativeGasUsed)

    optionPair = await OptionPair.at(trans.logs[0].args.optionPair)

    tokenOption = await TokenOption.at(await optionPair.tokenOption())
    tokenAntiOption = await TokenAntiOption.at(await  optionPair.tokenAntiOption())

  })

  it ('initial balance should be 0', async () => {
      let bals = await getAccountsBalances(tokenOption, [tokensOwner, buyer1, writer1])
      assert.equal(0, bals[0])
      assert.equal(0, bals[1])
      assert.equal(0, bals[2])
    })

  it ('write option for TestToken1: balance should be decreased by 10 * 100, option increased by 10, fee should be taken and splitted', async () => {
    await underlyingToken.transfer(writer1, 70000, {from: tokensOwner})
    await basisToken.transfer(writer1, 1000, {from: tokensOwner})
    await Promise.all([0,1].map( (i) =>
      Promise.all([underlyingToken, basisToken].map ( (tok) =>
      tok.approve(optionPair.address, 1000000, {from: writer1})
    )
    )))

    basisToken.approve(optionPair.address, 1000, {from: writer1})

    //basisToken.approve(optFactory.address, 1000, {from: writer1}) // for fees
    let feeBeneficiary =await  optionPair.feeTaker()
    const balWriterUnderBefore = await underlyingToken.balanceOf(writer1).valueOf()
    const balFeeTakerBasisBefore = await basisToken.balanceOf(feeBeneficiary).valueOf()
    const balOptTokenCreatorBasisBefore = await basisToken.balanceOf(optionTokenCreator).valueOf()
    const balWriterBasisBefore = await basisToken.balanceOf(writer1).valueOf()

    const balWriterOptionBefore = await tokenOption.balanceOf(writer1).valueOf()

    const trans = await optionPair.writeOptions(10, {from: writer1})
    const balWriterUnderAfter = await underlyingToken.balanceOf(writer1).valueOf()
    const balWriterOptionAfter = await tokenOption.balanceOf(writer1).valueOf()
    const balWriterUnderlAfter = await underlyingToken.balanceOf(writer1).valueOf()
    const balWriterBasisAfter = await basisToken.balanceOf(writer1).valueOf()
    const balFeeTakerBasisAfter = await basisToken.balanceOf(feeBeneficiary).valueOf()
    const balOptTokenCreatorBasisAfter = await basisToken.balanceOf(optionTokenCreator).valueOf()

    assert.equal(10, balWriterOptionAfter - balWriterOptionBefore)
    assert.equal(10 * 100, balWriterUnderBefore - balWriterUnderlAfter)
    assert.equal(10 * fee, balWriterBasisBefore - balWriterBasisAfter)
    assert.equal(10 * fee, balFeeTakerBasisAfter - balFeeTakerBasisBefore)

    })

  it ('correct option transfer 3 from writer1 tranfer to buyer1', async () => {
    balOptWriter1Before = await tokenOption.balanceOf(writer1).valueOf()
    balOptBuyer1Before = await tokenOption.balanceOf(buyer1).valueOf()
    await tokenOption.approve(buyer1, 5, {from: writer1})
    await tokenOption.transfer(buyer1, 3, {from: writer1})

    balOptWriter1After = await tokenOption.balanceOf(writer1).valueOf()
    balOptBuyer1After = await tokenOption.balanceOf(buyer1).valueOf()
    assert.equal(balOptBuyer1After - balOptBuyer1Before, 3)
    assert.equal(balOptWriter1After - balOptWriter1Before, -3)
  })

  it ('buyer execute 2 option contracts: 1 should remain', async () => {
    await tokenOption.approve(optionPair.address, 5, {from: buyer1})
    await basisToken.approve(optionPair.address, 50000, {from: buyer1})
    await basisToken.transfer(buyer1, 500, {from: tokensOwner})
    const allowance = await tokenOption.allowance(buyer1, optionPair.address)
    const balanceBuyer1 = await tokenOption.balanceOf(buyer1).valueOf()
    const underTokInitBals = await getAccountsBalances(underlyingToken, [buyer1, writer1])
    const baseTokInitBals = await getAccountsBalances(basisToken, [buyer1, writer1])
    await optionPair.execute(2, {from: buyer1})
    const underTokAfterBals = await getAccountsBalances(underlyingToken, [buyer1, writer1])
    const baseTokAfterBals = await getAccountsBalances(basisToken, [buyer1, writer1])
    const balByuer = await tokenOption.balanceOf(buyer1).valueOf()
    assert.equal (1, balByuer)
    assert.equal(underTokAfterBals[0] - underTokInitBals[0], 2 * 100) //strikeQty * executedQty
    assert.equal(baseTokInitBals[0] - baseTokAfterBals[0], 2 * 125) //strike *   qty for buyer
    assert.equal(8, await optionPair.getTotalOpenInterest().valueOf())
    })

  it ('annihilate 2 options should be OK', async () => {
    const balUnderlyingWriter1Before = await underlyingToken.balanceOf(writer1).valueOf()
    const balBasisWriter1Before = await underlyingToken.balanceOf(writer1).valueOf()
    const balOptWriter1Before = await tokenOption.balanceOf(writer1).valueOf()
    const balAntiOptWriter1Before = await tokenAntiOption.balanceOf(writer1).valueOf()
    //console.log("before annihilate: " + balUnderlyingWriter1Before + "; " + balOptWriter1Before + "; " + balAntiOptWriter1Before)
    await tokenOption.approve(optionPair.address, 2, {from: writer1})
    await tokenAntiOption.approve(optionPair.address, 2, {from: writer1})
    await optionPair.annihilate(2, {from: writer1})
    const balUnderlyingWriter1After = await underlyingToken.balanceOf(writer1).valueOf()
    const balOptWriter1After = await tokenOption.balanceOf(writer1).valueOf()
    const balAntiOptWriter1After = await tokenAntiOption.balanceOf(writer1).valueOf()
    // as 2 options from 10 are executed corresponding underlying is 2 * (10 - 2)/10 * 100 = 160
    assert.equal(2 * (10 - 2) / 10 * 100, balUnderlyingWriter1After - balUnderlyingWriter1Before) //strikeQty * annihiletedQty
    assert.equal(2, balOptWriter1Before - balOptWriter1After)
    assert.equal(2, balAntiOptWriter1Before - balAntiOptWriter1After)
    //console.log("after annihilate: " + balUnderlyingWriter1After + "; " + balOptWriter1After + "; " + balAntiOptWriter1After)
  })

  it ("withdrawAll throws exception before expireTime", async () => {
      try {
        await optionPair.withdrawAll({from: writer1})
        assert(false)
      } catch (e) {
        //
      }
  })

  it ("withdrawAll should function if time is after expiration", async () => {
    const curTime = await optionPair.getCurrentTime.call()
    const beforeBalUnderlying = await underlyingToken.balanceOf(writer1).valueOf()
    const beforeBalBasis = await basisToken.balanceOf(writer1).valueOf()
    const beforeBalAnti = await tokenAntiOption.balanceOf(writer1).valueOf()
    // 2 executed, for 8 anti-option one gets 8 * 100 * (10 - 2) / 10 = 640
    assert.equal(640, await optionPair.getAvailableUnderlying(writer1, {from: writer1}).valueOf())
    await tokenAntiOption.approve(optionPair.address, beforeBalAnti, {from: writer1})

    let trans = await optionPair.updateMockTime( curTime  + 3600 * 24, {from: '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc'})
    await optionPair.withdrawAll({from: writer1})
    const newCurTime = await optionPair.getCurrentTime() //

    assert.ok (newCurTime  >=  curTime  + 3600 * 24)
    const afterBalWriter = await underlyingToken.balanceOf(writer1).valueOf()
    const afterBalBasis = await basisToken.balanceOf(writer1).valueOf()
    // basisToken = 2 (executed) * 8 / 10 (share from all) * 125 (strike price) =
    assert.equal(200, afterBalBasis - beforeBalBasis)
    assert.equal(640, afterBalWriter - beforeBalUnderlying) //available antiOption * qty
  })

  contract ("Request Option Serie", () => {
    const strike = 15
    const underlyingQty = 2
    const expireTime = Math.floor(new Date()/1000) + 60*60*24*30
    const requestFee = 0.01 * (10 ** 18)
    var requestHandler, optionSerieToken, optionFactory, weth, dai, feeCalculator

    it ("should initialized", async () => {
      optionFactory = await OptionFactoryWeth.deployed()
      optionSerieToken = await OptionSerieToken.deployed()
      requestHandler = await RequestHandler.deployed()
      weth = await Weth.deployed()
      dai = await DAI.deployed()
      feeCalculator = await SimpleFeeCalculatorWethDai.deployed()
    })

    it ("transfer ownership to request handler", async () => {
      let erc721owner = await optionSerieToken.owner()
      await optionSerieToken.transferOwnership(requestHandler.address, {from: erc721owner})
      let newOwner = await optionSerieToken.owner()
      assert.equal(newOwner, requestHandler.address)
    })

    it ("option pair can be requested, ERC721 token is transferred to RequestHandler owner", async () => {
      assert.equal(feeCalculator.address, await optionFactory.feeCalculator())
      let requestHandlerOwner = await requestHandler.owner()
      assert.notEqual(requestHandlerOwner, optionSerieCreator, "option serie creator is not the same as requestHnaadlerOwner")
      let optionSerieParams = [weth.address, dai.address, strike, underlyingQty, expireTime]
      let requestArgs = optionSerieParams.concat(feeCalculator.address)
      await requestHandler.requestOptionSerie(...requestArgs, {from: optionSerieCreator})
      let tokenId = await optionSerieToken.getTokenId(weth.address, dai.address, strike, underlyingQty, expireTime)
      let tokenOwner = await optionSerieToken.ownerOf(tokenId) 
      assert.equal(tokenOwner, requestHandlerOwner, "the owners of token should be owner of RequestHandlerContract")
    })

    it ("should transfer ownership of child contract", async () => {
      let optionSerieTokenOwner = await optionSerieToken.owner()
      let requestHandlerOwner = await requestHandler.owner()
      assert.equal(optionSerieTokenOwner, requestHandler.address, "ERC721 should be owner by request handler")
      assert.notEqual(requestHandlerOwner, optionSerieTokenOwner)
      await requestHandler.claimOwnership(optionSerieToken.address, {from: requestHandlerOwner})
      let newOptionSerieTokenOwner = await optionSerieToken.owner()
      assert.equal(requestHandlerOwner, newOptionSerieTokenOwner)
    })})
})
