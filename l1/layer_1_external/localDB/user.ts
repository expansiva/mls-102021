/// <mls shortName="user" project="102021" folder="layer_1_external/localDB" enhancement="_blank" groupName="layer_1_external/localDB" />

import { UserBase } from "../../layer_4_entities/userBase.js";
import { UserRecord } from "../../layer_4_entities/user.js";       

class User implements UserBase {

    //-----------METHODS-----------

    public async upd(param: UserRecord): Promise<UserRecord> { 
        return await this.saveUserRecord(param);
    }

    public async add(param: UserRecord): Promise<UserRecord> {
        return await this.saveUserRecord(param);
    }

    public async del(id: number): Promise<boolean> {
        return await this.deleteUserRecord(id);
    }

    public async list(): Promise<UserRecord[]> {
        return await this.getAllUserRecord();
    }

    //-----------IMPLEMENTS------------

    private async saveUserRecord(data: UserRecord): Promise<UserRecord> {

        const store = (window as any).users ? (window as any).users : [];

        data.version = Date.now().toString();

        return new Promise((resolve, reject) => {

            if (!data.id) { store.push(data); }
            else {
                const index = store.findIndex((i: UserRecord) => i.id === data.id);
                if (store[index]) store[index] = data;
            }

            resolve(data);
        });
    }

    private async getAllUserRecord(): Promise<UserRecord[]> {

        const store = (window as any).users ? (window as any).users : [];

        return new Promise((resolve, reject) => { resolve(store as UserRecord[]); });
    }

    private async deleteUserRecord(id: number): Promise<boolean> {
        const store = (window as any).users ? (window as any).users : [];

        const index = store.findIndex((i: UserRecord) => i.id === id);

        if (store[index]) store.splice(index, 1);
        return new Promise((resolve, reject) => { resolve(true); });
    }

    

}

export const userLocalDB = new User();