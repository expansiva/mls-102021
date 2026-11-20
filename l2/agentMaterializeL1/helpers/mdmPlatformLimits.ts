/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/mdmPlatformLimits.ts" enhancement="_blank"/>

// Limits of the platform MDM that the generated code must respect. The MDM answers 400 above them
// (`identityUsersContracts.ts`), so a number the model or an emitter picks on its own breaks at the first call.
// `mdmPlatformLimits.test.ts` locks each value against the contract file.

/** `identity.listUsers({ pageSize })` is an integer from 1 to this value (`PAGE_SIZE_MAX` of the MDM contract). */
export const MDM_LIST_USERS_PAGE_SIZE_MAX = 100;
