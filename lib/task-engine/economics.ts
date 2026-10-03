import type { RewardAsset } from "./types";

export type RewardPolicy = {
  userShareBps: number;
  reserveBps: number;
  operationsBps: number;
};

export const DEFAULT_REWARD_POLICY: RewardPolicy = {
  userShareBps: 5000,
  reserveBps: 1000,
  operationsBps: 500,
};

export function calculateUserReward(
  advertiserValue: number,
  policy = DEFAULT_REWARD_POLICY,
): { userReward: number; grossContribution: number } {
  if (!Number.isFinite(advertiserValue) || advertiserValue < 0) {
    throw new Error("Invalid advertiser value");
  }

  const userReward = Math.floor((advertiserValue * policy.userShareBps) / 10000 * 100) / 100;
  const reserve = advertiserValue * policy.reserveBps / 10000;
  const operations = advertiserValue * policy.operationsBps / 10000;
  const grossContribution = Math.round((advertiserValue - userReward - reserve - operations) * 100) / 100;

  return { userReward, grossContribution };
}

export function assertRewardAsset(asset: string): asserts asset is RewardAsset {
  if (!["NGN_CASH", "CONTENT_CREDIT", "BONUS_POINT"].includes(asset)) {
    throw new Error("Unsupported reward asset");
  }
}