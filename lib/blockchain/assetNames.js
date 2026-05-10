// Pure functions for generating standard Asset Names

// Generates the Asset Name for an Identity NFT (Cardano max is 32 bytes)
export function getIdentityAssetName(systemUuid) {
  if (!systemUuid) throw new Error("systemUuid is required");
  const uuidNoHyphens = systemUuid.replace(/-/g, "");
  // We use the first 16 chars of the UUID to keep it well under 32 bytes
  return `ResQId-${uuidNoHyphens.substring(0, 16)}`;
}

// Generates the Asset Name for a Claim Stub token (Format: <Agency>-<Aid>-<Disaster>)
export function getClaimAssetName({ disasterCode, aidType, agency }) {
  if (!disasterCode || !aidType || !agency) {
    throw new Error("disasterCode, aidType, and agency are required");
  }

  const agencyCode = agency.toUpperCase().replace(/\s+/g, "").slice(0, 8);
  const aidTypeCode = aidType.toUpperCase().replace(/\s+/g, "").slice(0, 4);
  // Limit to 16 chars to guarantee the total string never exceeds 32 bytes
  const formattedDisasterCode = disasterCode.replace(/-/g, "").substring(0, 16);

  return `${agencyCode}-${aidTypeCode}-${formattedDisasterCode}`;
}
