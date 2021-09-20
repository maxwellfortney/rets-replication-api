import { IConfig } from "./model";
import config from "./schema";

export default class PropertyService {
    public async createConfig(configParams?: IConfig, callback?: any) {
        const _session = new config(configParams);
        await _session.save(callback);
    }

    public async getConfig() {
        return (await config.find({}))[0];
    }

    public async getLastUpdate() {
        return ((await this.getConfig()) as any)?.lastUpdate;
    }

    public async getInitialSync() {
        return ((await this.getConfig()) as any)?.initialSync;
    }

    public async updateConfig(configParams: IConfig, callback: any) {
        let options = { upsert: true, new: true, setDefaultsOnInsert: true };
        config.findOneAndUpdate({}, configParams, options, callback);
    }

    public deleteConfig(_id: String, callback: any) {
        config.deleteOne({}, callback);
    }
}
