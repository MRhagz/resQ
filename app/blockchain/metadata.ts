export interface Beneficiary {
    systemUuid: string;
    walletAddress: string;
    region: string;
    province: string;
    municipality: string;
}

export interface Distribution {
    disasterCode: string;
    aidType: string;
    agency: string;
    municipality: string;
}
