import { IProperty } from "./model";
import properties from "./schema";

export default class PropertyService {
    public createProperty(propertyParams: IProperty, callback: any) {
        const _session = new properties(propertyParams);
        _session.save(callback);
    }

    public filterProperty(query: any, callback: any) {
        properties.findOne(query, callback);
    }

    public updateProperty(propertyParams: IProperty, callback: any) {
        const query = { listingId: propertyParams.listingId };
        let options = { upsert: true, new: true, setDefaultsOnInsert: true };
        properties.findOneAndUpdate(query, propertyParams, options, callback);
    }

    public deleteProperty(_id: String, callback: any) {
        const query = { _id: _id };
        properties.deleteOne(query, callback);
    }
}
