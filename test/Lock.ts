import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("SecureWallet", function () {
  async function deploySecureWalletFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const SecureWallet = await hre.ethers.getContractFactory("SecureWallet");
    const wallet = await SecureWallet.deploy();

    // Deploy test contract
    const SecureWalletTest = await hre.ethers.getContractFactory("SecureWalletTest");
    const testContract = await SecureWalletTest.deploy();

    const depositAmount = hre.ethers.parseEther("1.0");
    
    return { wallet, testContract, depositAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { wallet, owner } = await loadFixture(deploySecureWalletFixture);
      expect(await wallet.owner()).to.equal(owner.address);
    });

    it("Should start with zero balance", async function () {
      const { wallet } = await loadFixture(deploySecureWalletFixture);
      expect(await wallet.getBalance()).to.equal(0);
    });
  });

  describe("Deposits", function () {
    it("Should receive Ether via receive function", async function () {
      const { wallet, owner, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(owner.sendTransaction({
        to: wallet.target,
        value: depositAmount
      })).to.emit(wallet, "EtherReceived")
        .withArgs(owner.address, depositAmount, "receive");

      expect(await wallet.getBalance()).to.equal(depositAmount);
    });

    it("Should receive Ether via fallback function", async function () {
      const { wallet, testContract, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(testContract.testFallbackWithData(wallet.target, {
        value: depositAmount
      })).to.emit(wallet, "FallbackCalled");

      expect(await wallet.getBalance()).to.equal(depositAmount);
    });

    it("Should receive Ether via deposit function", async function () {
      const { wallet, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(wallet.deposit({ value: depositAmount }))
        .to.emit(wallet, "EtherReceived")
        .withArgs(await wallet.owner(), depositAmount, "deposit");

      expect(await wallet.getBalance()).to.equal(depositAmount);
    });

    it("Should track individual deposits correctly", async function () {
      const { wallet, owner, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await wallet.deposit({ value: depositAmount });
      expect(await wallet.deposits(owner.address)).to.equal(depositAmount);
      expect(await wallet.hasDeposited(owner.address)).to.be.true;
    });
  });

  describe("Withdrawals", function () {
    it("Should allow withdrawal of deposited amount", async function () {
      const { wallet, owner, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      // First make a deposit
      await wallet.deposit({ value: depositAmount });
      
      // Then withdraw
      await expect(wallet.withdraw(depositAmount))
        .to.emit(wallet, "EtherSent")
        .withArgs(owner.address, depositAmount);

      expect(await wallet.getBalance()).to.equal(0);
    });

    it("Should revert withdrawal with insufficient balance", async function () {
      const { wallet, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(wallet.withdraw(depositAmount))
        .to.be.revertedWithCustomError(wallet, "InsufficientBalance")
        .withArgs(depositAmount, 0);
    });
  });

  describe("Safe Transfers", function () {
    it("Should allow owner to make safe transfers", async function () {
      const { wallet, owner, otherAccount, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      // First deposit some Ether
      await wallet.deposit({ value: depositAmount });
      
      // Then transfer to other account
      await expect(wallet.safeTransfer(otherAccount.address, depositAmount))
        .to.emit(wallet, "EtherSent")
        .withArgs(otherAccount.address, depositAmount);
    });

    it("Should revert safe transfer from non-owner", async function () {
      const { wallet, otherAccount, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(wallet.connect(otherAccount).safeTransfer(otherAccount.address, depositAmount))
        .to.be.revertedWithCustomError(wallet, "Unauthorized")
        .withArgs(otherAccount.address);
    });

    it("Should revert safe transfer to zero address", async function () {
      const { wallet, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(wallet.safeTransfer(hre.ethers.ZeroAddress, depositAmount))
        .to.be.revertedWithCustomError(wallet, "ZeroAddress");
    });

    it("Should revert safe transfer with insufficient balance", async function () {
      const { wallet, otherAccount, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await expect(wallet.safeTransfer(otherAccount.address, depositAmount))
        .to.be.revertedWithCustomError(wallet, "InsufficientBalance")
        .withArgs(depositAmount, 0);
    });
  });

  describe("Balance Tracking", function () {
    it("Should track total received amount correctly", async function () {
      const { wallet, owner, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await wallet.deposit({ value: depositAmount });
      expect(await wallet.totalReceived()).to.equal(depositAmount);
      
      await owner.sendTransaction({
        to: wallet.target,
        value: depositAmount
      });
      expect(await wallet.totalReceived()).to.equal(depositAmount * BigInt(2));
    });

    it("Should track individual deposits correctly", async function () {
      const { wallet, owner, otherAccount, depositAmount } = await loadFixture(deploySecureWalletFixture);
      
      await wallet.deposit({ value: depositAmount });
      await wallet.connect(otherAccount).deposit({ value: depositAmount });
      
      expect(await wallet.deposits(owner.address)).to.equal(depositAmount);
      expect(await wallet.deposits(otherAccount.address)).to.equal(depositAmount);
    });
  });
});