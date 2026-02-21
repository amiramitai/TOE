// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UHFPaperRegistry {
    event PaperRegistered(
        address indexed authorAddress, 
        string documentHash, 
        uint256 timestamp, 
        string author, 
        string version
    );

    function registerPaper(string memory _hash, string memory _author, string memory _version) public {
        emit PaperRegistered(msg.sender, _hash, block.timestamp, _author, _version);
    }
}
