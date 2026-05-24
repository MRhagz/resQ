import { ForgeScript, resolveNativeScriptHash, resolveScriptHash, resolvePaymentKeyHash, unixTimeToEnclosingSlot, SLOT_CONFIG_NETWORK } from '@meshsdk/core';
import { systemWallet } from './wallet.js';
import { NETWORK } from './constants.js';

export const slotConfig = SLOT_CONFIG_NETWORK[NETWORK] || SLOT_CONFIG_NETWORK.preprod;

let cachedPolicy = null;

// Helper to safely resolve policy ID
const getPolicyId = (script) => {
  if (typeof resolveScriptHash === 'function') {
    try {
      return resolveScriptHash(script);
    } catch (e) {
      console.warn("resolveScriptHash failed:", e.message);
    }
  }

  if (typeof resolveNativeScriptHash === 'function') {
    try {
      return resolveNativeScriptHash(script);
    } catch (e) {
      console.warn("resolveNativeScriptHash failed:", e.message);
    }
  }

  throw new Error("Could not resolve policy ID from script. Check MeshSDK version.");
};

// Lazy initialize the system policy to prevent blocking server startup
export const getSystemPolicy = async () => {
  if (cachedPolicy) return cachedPolicy;

  await systemWallet.init();
  const address = await systemWallet.getChangeAddress();
  const forgeScript = ForgeScript.withOneSignature(address);
  const policyId = getPolicyId(forgeScript);

  cachedPolicy = {
    identityForgeScript: forgeScript,
    identityPolicyId: policyId,
    claimForgeScript: forgeScript,
    claimPolicyId: policyId
  };

  return cachedPolicy;
};

/**
 * Dynamically generates the claim stub minting and burning policy script
 * integrated with the distribution event's duration.
 *
 * Minting is valid BEFORE campaign starts (startsAt).
 * Burning is valid AFTER startsAt AND BEFORE endsAt + 1 hour.
 *
 * Falls back to the system's simple signature policy if startsAt/endsAt are not provided.
 *
 * @param {object} campaign - { startsAt, endsAt, ... }
 * @returns {Promise<{ claimForgeScript: string, claimPolicyId: string }>}
 */
export const getCampaignClaimPolicy = async (campaign) => {
  if (!campaign) {
    throw new Error("campaign object is required for dynamic claim policy");
  }

  await systemWallet.init();
  const address = await systemWallet.getChangeAddress();
  const keyHash = resolvePaymentKeyHash(address);

  const { startsAt, endsAt } = campaign;

  // Fallback to signature-only policy if DEMO_MODE is active or if no dates are configured (immediate & open-ended)
  if (process.env.DEMO_MODE === 'true') {
    console.warn("[Blockchain] DEMO_MODE is active. Bypassing time-locks for claim stubs policy.");
  }

  if (process.env.DEMO_MODE === 'true' || (!startsAt && !endsAt)) {
    const forgeScript = ForgeScript.withOneSignature(address);
    const policyId = getPolicyId(forgeScript);
    return {
      claimForgeScript: forgeScript,
      claimPolicyId: policyId
    };
  }

  const parts = [];

  if (startsAt) {
    const startsAtMs = new Date(startsAt).getTime();
    const startsAtSlot = unixTimeToEnclosingSlot(startsAtMs, slotConfig);

    // Branch A: Minting (Valid only BEFORE startsAt)
    parts.push({
      type: "all",
      scripts: [
        { type: "sig", keyHash },
        { type: "before", slot: String(startsAtSlot) }
      ]
    });

    // Branch B: Burning (Valid only AFTER startsAt AND BEFORE endsAt + 1 hour)
    const burnScripts = [
      { type: "sig", keyHash },
      { type: "after", slot: String(startsAtSlot) }
    ];

    if (endsAt) {
      const endsAtMs = new Date(endsAt).getTime();
      const endsAtPlus1HourMs = endsAtMs + (60 * 60 * 1000); // 1 hour grace
      const endsAtSlot = unixTimeToEnclosingSlot(endsAtPlus1HourMs, slotConfig);
      burnScripts.push({
        type: "before",
        slot: String(endsAtSlot)
      });
    }

    parts.push({
      type: "all",
      scripts: burnScripts
    });
  } else if (endsAt) {
    // startsAt is null/immediate, but endsAt is defined.
    // Permitted to mint or burn up to endsAt + 1 hour.
    const endsAtMs = new Date(endsAt).getTime();
    const endsAtPlus1HourMs = endsAtMs + (60 * 60 * 1000);
    const endsAtSlot = unixTimeToEnclosingSlot(endsAtPlus1HourMs, slotConfig);

    parts.push({
      type: "all",
      scripts: [
        { type: "sig", keyHash },
        { type: "before", slot: String(endsAtSlot) }
      ]
    });
  }

  const nativeScript = {
    type: "any",
    scripts: parts
  };

  const claimForgeScript = ForgeScript.fromNativeScript(nativeScript);
  const claimPolicyId = getPolicyId(claimForgeScript);

  return {
    claimForgeScript,
    claimPolicyId
  };
};

