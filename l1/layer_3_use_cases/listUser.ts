/// <mls shortName="listUser" project="102021" folder="layer_3_use_cases" enhancement="_blank" groupName="layer_3_use_cases" />

import { UserRecord } from "../layer_4_entities/user.js";
import { Ctx } from "../common/local.js";

export async function listUser(ctx:Ctx): Promise<UserRecord[]> {

    return await ctx.io.user.list(); 

}