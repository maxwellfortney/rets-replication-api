var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import properties from "../modules/properties/schema";
import defaultPerPage from "../config/app";
export class PropertyRoutes {
    route(app) {
        app.get("/api/properties/:listingId", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const listingId = req.params.listingId;
            const property = yield properties.findOne({ listingId });
            if (property) {
                res.status(200).json(property);
            }
            else {
                res.status(404).json({
                    error: true,
                    message: "No property with listingId: ",
                    listingId,
                });
            }
        }));
        app.get("/api/properties", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { status, offset, limit, q, minprice, maxprice, minbeds, maxbeds, minbaths, maxbaths, sort, } = req.query;
            console.log(req.query);
            let query = {};
            if (minprice && maxprice) {
                query.listPrice = {
                    $gte: parseFloat(minprice) || 0,
                    $lte: parseFloat(maxprice),
                };
            }
            else if (minprice && !maxprice) {
                query.listPrice = {
                    $gte: parseFloat(minprice),
                };
            }
            else if (!minprice && maxprice) {
                query.listPrice = {
                    $lte: parseFloat(maxprice),
                };
            }
            if (minbeds && maxbeds) {
                query["property.bedrooms"] = {
                    $gte: parseFloat(minbeds),
                    $lte: parseFloat(maxbeds),
                };
            }
            else if (minbeds && !maxbeds) {
                query["property.bedrooms"] = {
                    $gte: parseFloat(minbeds),
                };
            }
            else if (!minbeds && maxbeds) {
                query["property.bedrooms"] = {
                    $lte: parseFloat(maxbeds),
                };
            }
            if (minbaths && maxbaths) {
                query["property.bathsFull"] = {
                    $gte: parseFloat(minbaths),
                    $lte: parseFloat(maxbaths),
                };
            }
            else if (minbaths && !maxbaths) {
                query["property.bathsFull"] = {
                    $gte: parseFloat(minbaths),
                };
            }
            else if (!minbaths && maxbaths) {
                query["property.bathsFull"] = {
                    $lte: parseFloat(maxbaths),
                };
            }
            if (status) {
                if (Array.isArray(status)) {
                    query.$or = status.map((aStatus) => {
                        return { "mls.status": aStatus };
                    });
                }
                else {
                    query.$or = [{ "mls.status": status }];
                }
            }
            const totalCount = yield properties.countDocuments(query);
            let options = {
                limit: parseInt(limit) || defaultPerPage,
            };
            if (sort) {
                const sortObj = this.parseSortString(sort);
                if (sortObj !== null) {
                    options.sort = sortObj;
                }
            }
            if (offset) {
                options.skip = parseInt(offset);
            }
            console.log("Query ", query);
            console.log(options);
            const queryRes = yield properties.find(query, null, options).exec();
            res.status(200).json({ totalCount, listings: queryRes });
        }));
    }
    parseSortString(sort) {
        const ret = {};
        function parseType(sort) {
            sort = sort.substr(0, 1) === "-" ? sort.substr(1) : sort;
            if (sort === "listprice") {
                return "listPrice";
            }
            else if (sort === "beds") {
                return "property.bedrooms";
            }
            else if (sort === "baths") {
                return "property.bathsFull";
            }
            else if (sort === "listdate") {
                return "listdate";
            }
        }
        const type = parseType(sort);
        const direction = sort.substr(0, 1) === "-" ? -1 : 1;
        ret[type] = direction;
        console.log(ret);
        return ret;
    }
}
//# sourceMappingURL=propertyRoutes.js.map