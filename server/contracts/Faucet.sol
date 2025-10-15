// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract Faucet is Ownable {
    using ECDSA for bytes32;

    // Custom Errors
    error CooldownNotPassed(uint256 timeRemaining);
    error FaucetEmpty();
    error InvalidSignature();
    error InvalidNonce();
    error SignatureExpired();
    error TransferFailed();

    // Events
    event Drip(address indexed user, uint256 amount, uint256 nonce);
    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    // State Variables
    uint128 public constant COOLDOWN = 24 hours;
    uint128 public constant DRIP_AMOUNT = 0.01 ether;

    mapping(address => uint256) public lastRequest;
    mapping(address => uint256) public nonces;

    constructor() Ownable(msg.sender) {}

    // External Functions
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function drip(
        address user,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (nonce != nonces[user]) revert InvalidNonce();

        uint256 nextAllowed = lastRequest[user] + COOLDOWN;
        if (block.timestamp < nextAllowed) {
            revert CooldownNotPassed(nextAllowed - block.timestamp);
        }
        if (address(this).balance < DRIP_AMOUNT) revert FaucetEmpty();

        bytes32 messageHash = keccak256(
            abi.encodePacked(user, nonce, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        if (recovered != user) revert InvalidSignature();

        nonces[user]++;
        lastRequest[user] = block.timestamp;

        (bool success, ) = payable(user).call{value: DRIP_AMOUNT}("");
        if (!success) revert TransferFailed();

        emit Drip(user, DRIP_AMOUNT, nonce);
    }

    function withdraw(uint256 amount) external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal < amount) revert FaucetEmpty();
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdraw(owner(), amount);
    }

    function withdrawAll() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) revert FaucetEmpty();
        (bool success, ) = payable(owner()).call{value: bal}("");
        if (!success) revert TransferFailed();
        emit Withdraw(owner(), bal);
    }

    // View Functions
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function canClaim(address user) external view returns (bool) {
        return address(this).balance >= DRIP_AMOUNT &&
            (lastRequest[user] == 0 || block.timestamp >= lastRequest[user] + COOLDOWN);
    }

    function nextClaimTime(address user) external view returns (uint256) {
        uint256 next = lastRequest[user] + COOLDOWN;
        return block.timestamp >= next ? 0 : next;
    }

    function getUserInfo(address user)
        external
        view
        returns (
            uint256 nonce,
            uint256 lastClaim,
            uint256 nextClaim,
            bool canClaimNow
        )
    {
        nonce = nonces[user];
        lastClaim = lastRequest[user];
        nextClaim = lastClaim + COOLDOWN;
        canClaimNow =
            address(this).balance >= DRIP_AMOUNT &&
            (lastClaim == 0 || block.timestamp >= nextClaim);
    }
}
