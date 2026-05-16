import { ForgeScript, resolveNativeScriptHash, resolveScriptHash } from '@meshsdk/core';
import { wallet } from './wallet.js';

// Get system signing wallet address
const address = wallet.getPaymentAddress();

// Create a single signature policy
export const systemForgeScript = ForgeScript.withOneSignature(address);

// Helper to safely resolve policy ID
const getPolicyId = (script) => {
  try {
    if (typeof resolveNativeScriptHash === 'function') {
      return resolveNativeScriptHash(script);
    }
    if (typeof resolveScriptHash === 'function') {
      return resolveScriptHash(script);
    }
  } catch (e) {
    console.warn("Error resolving policy ID:", e);
  }
  
  // Fallback if methods are missing
  throw new Error("Could not find a method to resolve policy ID from script");
};

export const systemPolicyId = getPolicyId(systemForgeScript);

export const identityForgeScript = systemForgeScript;
export const identityPolicyId = systemPolicyId;

export const claimForgeScript = systemForgeScript;
export const claimPolicyId = systemPolicyId;
