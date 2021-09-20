import { Application, Request, Response } from "express";
import properties from "../modules/properties/schema";
import defaultPerPage from "../config/app";

export class PropertyRoutes {
    public route(app: Application) {
        app.get(
            "/api/properties/:listingId",
            async (req: Request, res: Response) => {
                const listingId = req.params.listingId;

                const property = await properties.findOne({ listingId });

                if (property) {
                    res.status(200).json(property);
                } else {
                    res.status(404).json({
                        error: true,
                        message: "No property with listingId: ",
                        listingId,
                    });
                }
            }
        );

        app.get("/api/properties", async (req: Request, res: Response) => {
            const {
                status,
                offset,
                limit,
                q,
                minprice,
                maxprice,
                minbeds,
                maxbeds,
                minbaths,
                maxbaths,
                sort,
            } = req.query;
            console.log(req.query);

            let query: any = {};
            if (minprice && maxprice) {
                query.listPrice = {
                    $gte: parseFloat(minprice as string) || 0,
                    $lte: parseFloat(maxprice as string),
                };
            } else if (minprice && !maxprice) {
                query.listPrice = {
                    $gte: parseFloat(minprice as string),
                };
            } else if (!minprice && maxprice) {
                query.listPrice = {
                    $lte: parseFloat(maxprice as string),
                };
            }

            if (minbeds && maxbeds) {
                query["property.bedrooms"] = {
                    $gte: parseFloat(minbeds as string),
                    $lte: parseFloat(maxbeds as string),
                };
            } else if (minbeds && !maxbeds) {
                query["property.bedrooms"] = {
                    $gte: parseFloat(minbeds as string),
                };
            } else if (!minbeds && maxbeds) {
                query["property.bedrooms"] = {
                    $lte: parseFloat(maxbeds as string),
                };
            }

            if (minbaths && maxbaths) {
                query["property.bathsFull"] = {
                    $gte: parseFloat(minbaths as string),
                    $lte: parseFloat(maxbaths as string),
                };
            } else if (minbaths && !maxbaths) {
                query["property.bathsFull"] = {
                    $gte: parseFloat(minbaths as string),
                };
            } else if (!minbaths && maxbaths) {
                query["property.bathsFull"] = {
                    $lte: parseFloat(maxbaths as string),
                };
            }

            if (status) {
                if (Array.isArray(status)) {
                    query.$or = status.map((aStatus) => {
                        return { "mls.status": aStatus };
                    });
                } else {
                    query.$or = [{ "mls.status": status }];
                }
            }

            const totalCount = await properties.countDocuments(query);

            let options: any = {
                limit: parseInt(limit as string) || defaultPerPage,
            };

            if (sort) {
                const sortObj = this.parseSortString(sort);
                if (sortObj !== null) {
                    options.sort = sortObj;
                }
            }

            if (offset) {
                options.skip = parseInt(offset as string);
            }

            console.log("Query ", query);
            console.log(options);

            const queryRes = await properties.find(query, null, options).exec();

            res.status(200).json({ totalCount, listings: queryRes });
        });
    }

    private parseSortString(sort) {
        const ret = {};

        function parseType(sort) {
            sort = sort.substr(0, 1) === "-" ? sort.substr(1) : sort;
            if (sort === "listprice") {
                return "listPrice";
            } else if (sort === "beds") {
                return "property.bedrooms";
            } else if (sort === "baths") {
                return "property.bathsFull";
            } else if (sort === "listdate") {
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
