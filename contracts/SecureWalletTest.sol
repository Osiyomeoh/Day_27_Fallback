// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SecureWalletTest
 * @dev Test contract to interact with SecureWallet
 */
contract SecureWalletTest {
    function testReceive(address payable wallet) external payable {
        (bool success,) = wallet.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    function testFallbackWithData(address payable wallet) external payable {
        (bool success,) = wallet.call{value: msg.value}(
            abi.encodeWithSignature("nonexistentFunction()")
        );
        require(success, "Transfer failed");
    }

    receive() external payable {}
}