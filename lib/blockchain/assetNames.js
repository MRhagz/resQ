// Pure functions for generating standard Asset Names

// Generates the Asset Name for an Identity NFT (Format: ResQIdentity-<uuid>)
export function getIdentityAssetName(systemUuid) {
  if (!systemUuid) throw new Error("systemUuid is required");
  const uuidNoHyphens = systemUuid.replace(/-/g, "");
  return `ResQIdentity-${uuidNoHyphens}`;
}

// Generates the Asset Name for a Claim Stub token (Format: <Agency>-<Aid>-<Disaster>)
export function getClaimAssetName({ disasterCode, aidType, agency }) {
  if (!disasterCode || !aidType || !agency) {
    throw new Error("disasterCode, aidType, and agency are required");
  }

  const agencyCode = agency.toUpperCase().replace(/\s+/g, "").slice(0, 8);
  const aidTypeCode = aidType.toUpperCase().replace(/\s+/g, "").slice(0, 4);
  const formattedDisasterCode = disasterCode.replace(/-/g, "");

  return `${agencyCode}-${aidTypeCode}-${formattedDisasterCode}`;
}
