pragma solidity ^0.4.18;

import './EscrowAccount.sol';
import './IAuction.sol';
import './IFeeCalculator.sol';
import './OptionFactory.sol';
import './OptionSerieToken.sol';

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';

contract OSDirectRequestHandler is Ownable {

  uint public fee;
  OptionSerieToken public optionSerieToken;
  OptionFactory public optionFactory;
  IAuction public auction;

  mapping (uint => address) optionSerietoken2feeToken;

  function OSDirectRequestHandler(uint _ethFee, address _optionSerieToken, address _optionFactory) {
    fee = _ethFee;
    optionSerieToken = OptionSerieToken(_optionSerieToken);
    optionFactory = OptionFactory(_optionFactory);
  }

  function requestToken(address _underlying, address _basisToken,
    uint _strike, uint _underlyingQty, uint _expireTime, address _feeCalculator)
    public
    returns(address, uint) {
      revert("This functionality is not available in the implentation");
    }

  function requestTokenPayable(address _underlying, address _basisToken,
    uint _strike, uint _underlyingQty, uint _expireTime, address _feeCalculator)
    public
    payable
    returns(address, uint) {
      require(msg.value == fee);
      require(address(optionFactory.feeCalculator()) == _feeCalculator); //TODO

      uint tokenId = optionSerieToken.mintExt( this, _underlying,  _basisToken, _strike,
        _underlyingQty, _expireTime);
      
      assert (optionSerieToken.ownerOf(tokenId) == address(this));
      address optionPair = optionFactory.createOptionPairContract(_underlying,  _basisToken,
         _strike,  _underlyingQty,  _expireTime);
     
      address feeTokenAddress = IFeeCalculator(_feeCalculator).feeToken();
      EscrowAccount escrowAccount = new EscrowAccount(feeTokenAddress);
      optionSerieToken.approve(address(escrowAccount), tokenId); //TODO make auction
      escrowAccount.takeEscrow721Ownership(address(optionSerieToken), tokenId);
      optionSerietoken2feeToken[tokenId] = feeTokenAddress; 
      
      return (optionPair, tokenId);
    }

   
    function resolveToken(uint _token) public {
      require(auction.isRevealed(_token), "Auction should be revealed");
      address winner = auction.getWinner(_token);
      address escrowOwner = optionSerieToken.ownerOf(_token);
      optionSerieToken.takeOwnership(_token);
      optionSerieToken.transfer(winner, _token);
      ERC20 feeToken = ERC20(optionSerietoken2feeToken[_token]);
      uint feeCollected = feeToken.balanceOf(escrowOwner);
      if (feeCollected == 0) {
        return;
      }  
      uint feeToWinner = feeCollected / 2;
      feeToken.transferFrom(escrowOwner, this, feeCollected);
      if (feeToWinner > 0)  {
        feeToken.transfer(winner, feeToWinner);
      }
      address contractOwner = Ownable(this).owner();
      feeToken.transfer(contractOwner, feeCollected - feeToWinner);
    }
}