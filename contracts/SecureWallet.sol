// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SecureWallet
 * @dev Implements secure Ether handling with fallback and receive functions
 */
contract SecureWallet {
    // Events
    event EtherReceived(address indexed sender, uint256 amount, string method);
    event EtherSent(address indexed recipient, uint256 amount);
    event FallbackCalled(address indexed sender, uint256 value, bytes data);

    // State variables
    address public owner;
    uint256 public totalReceived;
    mapping(address => uint256) public deposits;

    // Custom errors
    error InsufficientBalance(uint256 requested, uint256 available);
    error Unauthorized(address caller);
    error TransferFailed();
    error ZeroAddress();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Receive function handles plain Ether transfers
     */
    receive() external payable {
        deposits[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit EtherReceived(msg.sender, msg.value, "receive");
    }

    /**
     * @dev Fallback function handles Ether transfers with data
     */
    fallback() external payable {
        deposits[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }

    /**
     * @dev Explicit function to deposit Ether
     */
    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit EtherReceived(msg.sender, msg.value, "deposit");
    }

    /**
     * @dev Withdraw specified amount of Ether
     * @param amount Amount of Ether to withdraw
     */
    function withdraw(uint256 amount) external {
        if (deposits[msg.sender] < amount) {
            revert InsufficientBalance(amount, deposits[msg.sender]);
        }

        deposits[msg.sender] -= amount;
        totalReceived -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit EtherSent(msg.sender, amount);
    }

    /**
     * @dev Safe transfer function with checks
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransfer(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (address(this).balance < amount) {
            revert InsufficientBalance(amount, address(this).balance);
        }

        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit EtherSent(to, amount);
    }

    /**
     * @dev View function to check contract's balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev View function to check if an address has made deposits
     * @param account Address to check
     */
    function hasDeposited(address account) external view returns (bool) {
        return deposits[account] > 0;
    }
}
