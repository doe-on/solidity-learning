import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DECIMALS = 18;
const mt = (v: string) => hre.ethers.parseUnits(v, DECIMALS);

describe("MyToken", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];

  before("deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", ["MyToken", "MT", DECIMALS]);
  });

  describe("Basic state", () => {
    it("should return name, symbol, decimals", async () => {
      expect(await myTokenC.name()).equal("MyToken");
      expect(await myTokenC.symbol()).equal("MT");
      expect(await myTokenC.decimals()).equal(DECIMALS);
    });
    it("should mint 1MT to signer0", async () => {
      expect(await myTokenC.totalSupply()).equal(mt("1"));
      expect(await myTokenC.balanceOf(signers[0].address)).equal(mt("1"));
    });
  });

  describe("approve & transferFrom", () => {
    before("redeploy", async () => {
      myTokenC = await hre.ethers.deployContract("MyToken", ["MyToken", "MT", DECIMALS]);
    });

    // 1. approve: signer1에게 signer0의 자산 이동 권한 부여
    it("signer0 approves signer1 to spend 10MT", async () => {
      const [signer0, signer1] = signers;
      await expect(myTokenC.connect(signer0).approve(signer1.address, mt("10")))
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, mt("10"));
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(mt("10"));
    });

    // 2. transferFrom: signer1이 signer0의 MT를 자기 주소(signer1)로 전송
    it("signer1 transfers 0.3MT from signer0 to signer1", async () => {
      const [signer0, signer1] = signers;
      await expect(
        myTokenC.connect(signer1).transferFrom(signer0.address, signer1.address, mt("0.3"))
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, mt("0.3"));
    });

    // 3. balance 확인
    it("signer0 has 0.7MT, signer1 has 0.3MT", async () => {
      const [signer0, signer1] = signers;
      expect(await myTokenC.balanceOf(signer0.address)).equal(mt("0.7"));
      expect(await myTokenC.balanceOf(signer1.address)).equal(mt("0.3"));
      // 남은 allowance: 10 - 0.3 = 9.7MT
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(mt("9.7"));
    });

    it("should revert when signer2 (no allowance) calls transferFrom", async () => {
      const [signer0, , signer2] = signers;
      await expect(
        myTokenC.connect(signer2).transferFrom(signer0.address, signer2.address, mt("0.1"))
      ).to.be.revertedWith("insufficient allowance");
    });
  });
});
