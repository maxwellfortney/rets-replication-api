import { IPhotos } from "./model";
import photos from "./schema";

export default class PropertyService {
    public createPhotos(photoParams: IPhotos, callback: any) {
        const _session = new photos(photoParams);
        _session.save(callback);
    }

    public filterPhotos(query: any, callback: any) {
        photos.findOne(query, callback);
    }

    public updatePhotos(photoParams: IPhotos, callback: any) {
        const query = { listingKey: photoParams.listingKey };

        let options = { upsert: true, new: true, setDefaultsOnInsert: true };
        photos.findOneAndUpdate(query, photoParams, options, callback);
    }

    public deletePhotos(listingKey: String, callback: any) {
        const query = { listingKey };
        photos.deleteOne(query, callback);
    }
}
