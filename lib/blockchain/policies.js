import { ForgeScript, resolveNativeScriptHash, resolveScriptHash } from '@meshsdk/core';
import { systemWallet } from './wallet.js';

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
