/// <mls shortName="uppUser" project="102021" folder="layer_3_use_cases" enhancement="_blank" groupName="layer_3_use_cases" />

import { UserRecord } from "../layer_4_entities/user.js";
import { Ctx } from "../common/local.js";

export async function uppUser(ctx:Ctx, data: UserRecord): Promise<UserRecord> {
    
    return await ctx.io.user.upd(data);

}