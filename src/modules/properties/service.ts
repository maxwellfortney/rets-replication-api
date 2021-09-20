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

    public updateproperty(propertyParams: IProperty, callback: any) {
        const query = { listingId: propertyParams.listingId };
        let options = { upsert: true, new: true, setDefaultsOnInsert: true };
        properties.findOneAndUpdate(query, propertyParams, options, callback);

        // properties.findOneAndUpdate(
        //     query,
        //     propertyParams,
        //     options,
        //     async (error, result: any) => {
        //         if (!error) {
        //             console.log("New Document: ", query.listingId);
        //             // If the document doesn't exist
        //             if (!result) {
        //                 // Create it
        //                 result = new properties(propertyParams);
        //             }
        //             // Save the document
        //             await new Promise((resolve, reject) => {
        //                 resolve(
        //                     result.save(function (error) {
        //                         if (!error) {
        //                             console.log("Saved document");
        //                         } else {
        //                             throw error;
        //                         }
        //                     })
        //                 );
        //             });
        //         }
        //     }
        // );
    }

    public deleteProperty(_id: String, callback: any) {
        const query = { _id: _id };
        properties.deleteOne(query, callback);
    }
}
