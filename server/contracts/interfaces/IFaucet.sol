// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IFaucet {
    // Custom Errors
    error CooldownNotPassed(uint256 timeRemaining);
    error InvalidNonce();
    error InvalidSignature();
    error SignatureExpired();
    error FaucetEmpty();
    error TransferFailed();

    // Events
    event Drip(address indexed user, uint256 amount, uint256 nonce);
    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    // External Functions
    function drip(
        address user,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function withdraw(uint256 amount) external;
    function withdrawAll() external;

    // Constants
    function DRIP_AMOUNT() external view returns (uint256);
    function COOLDOWN() external view returns (uint256);

    // View functions
    function nonces(address user) external view returns (uint256);

    function lastRequest(address user) external view returns (uint256);

    function getBalance() external view returns (uint256);

    function canClaim(address user) external view returns (bool);

    function nextClaimTime(address user) external view returns (uint256);

    function getUserInfo(address user)
        external
        view
        returns (
            uint256 nonce,
            uint256 lastClaim,
            uint256 nextClaim,
            bool canClaimNow
        );
}
