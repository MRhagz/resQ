import { Beneficiary, Distribution } from "./metadata";

export const mockBeneficiaries: Beneficiary[] = [
    {
        systemUuid: "123e4567-e89b-12d3-a456-426614174000",
        walletAddress: "addr_test1qphmg3lgwjy2xwalnjg7htpx36ljmpc93msna5hkm6gyhpd0v2h2ma06r59xl8ex9le523hu0hkwufdekyfk2cms38wsq7rsk6",
        region: "Region VII",
        province: "Cebu",
        municipality: "Cebu City",
    },
    // {
    //     systemUuid: "987fcdeb-51a2-43d7-9012-3456789abcde",
    //     walletAddress: "addr_test1qpkewkwl23z5tthszq28828g0g0vxyu8s0k4z9k0t2vzyjxv9hx5v7p4w6l0q5tkt4x3hxsj76l8gkw8w2s9d7g4zxyqx68s5t",
    //     region: "NCR",
    //     province: "Metro Manila",
    //     municipality: "Quezon City",
    // },
];

export const mockDistributions: Distribution[] = [
    {
        disasterCode: "TYPHOON-ODETTE-2021",
        aidType: "Food Pack",
        agency: "DSWD",
        municipality: "Cebu City",
    },
    {
        disasterCode: "FLOOD-CARINA-2024",
        aidType: "Financial Assistance",
        agency: "Red Cross",
        municipality: "Quezon City",
    },
];
