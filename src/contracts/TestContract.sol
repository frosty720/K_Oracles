// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TestContract
 * @dev Simple test contract to verify deployment works
 */
contract TestContract {
    string public message;
    
    constructor() {
        message = "Hello KalyChain!";
    }
    
    function setMessage(string memory _message) external {
        message = _message;
    }
}
