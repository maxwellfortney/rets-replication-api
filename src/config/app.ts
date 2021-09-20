import express from "express";
import mongoose from "mongoose";
import queryString from "query-string";
import dotenv from "dotenv";
import { parseString } from "xml2js";

import { PropertyRoutes } from "../routes/propertyRoutes";
import { CommonRoutes } from "../routes/commonRoutes";
import { DigestFetch } from "./digestFetch";
import PropertyService from "../modules/properties/service";
import ConfigService from "../modules/config/service";

dotenv.config();

class App {
    public sessionID: any;
    public sessionTimer: NodeJS.Timeout;

    public updateTimer: NodeJS.Timeout;

    public app: express.Application;
    public client: any;

    private propertyRoutes: PropertyRoutes = new PropertyRoutes();
    private commonRoutes: CommonRoutes = new CommonRoutes();

    public mongoUrl: string = `mongodb+srv://admin:${process.env.MONGO_PASSWORD}@cluster0.vcasr.mongodb.net/production?retryWrites=true&w=majority`;

    private propertyService: PropertyService = new PropertyService();
    private configService: ConfigService = new ConfigService();

    private listingsDownloadIncrement: number = 25;
    public defaultPerPage: number = 15;

    private updateInterval: number = 60 * 60 * 1000;

    private initalSyncDate: string = "2018-01-01T00:00:00";

    constructor() {
        this.app = express();
        this.config();
        this.mongoSetup();
        this.propertyRoutes.route(this.app);
        this.commonRoutes.route(this.app);

        this.initializeRets();
    }

    private config() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private async mongoSetup() {
        await mongoose.connect(this.mongoUrl);

        if ((await this.configService.getConfig()) === undefined) {
            await this.configService.createConfig();
        }

        console.log("Fetched config ", await this.configService.getConfig());
    }

    private async initializeRets() {
        this.client = new DigestFetch("brightidxtest", "20170706", {
            algorithm: "MD5",
        });

        this.sessionID = await this.retsLogin();
        console.log("Logged in with session-id ", this.sessionID);

        if (this.sessionID !== null) {
            if (await this.configService.getInitialSync()) {
                await this.performIncementalSync();

                await this.configService.updateConfig(
                    { lastUpdate: await this.createRetsDateTimeString() },
                    () => {
                        `Updated config lastUpdate to ${this.createRetsDateTimeString()}`;
                    }
                );
            } else {
                await this.performInitalSync();

                await this.configService.updateConfig(
                    {
                        initialSync: await this.createRetsDateTimeString(),
                        lastUpdate: await this.createRetsDateTimeString(),
                    },
                    () => {
                        `Updated config initialSync and lastUpdate to ${this.createRetsDateTimeString()}`;
                    }
                );
            }

            //Perform sync every interval
            this.updateTimer = setInterval(async () => {
                if (!this.sessionTimer) {
                    this.sessionID = await this.retsLogin();
                }
                await this.performIncementalSync();

                await this.configService.updateConfig(
                    { lastUpdate: await this.createRetsDateTimeString() },
                    () => {
                        `Updated config lastUpdate to ${this.createRetsDateTimeString()}`;
                    }
                );
            }, this.updateInterval);
        }
    }

    private async retsLogin() {
        const defaultHeaders = {
            "User-Agent": "Bright RETS Application/1.0",
            "RETS-Version": "RETS/1.8",
        };

        const res = await this.client.fetch(
            "http://bright-rets.tst.brightmls.com:6103/cornerstone/login",
            {
                credentials: "include",
                headers: defaultHeaders,
            }
        );

        if (res.status === 200 && res.ok) {
            console.log(
                `Login Status: ${res.status}, OK: ${res.ok}, Login Successful`
            );

            this.sessionTimer = setTimeout(async () => {
                console.log("SESSION TIMER EXPIRED");
                clearTimeout(this.sessionTimer);
            }, 30 * 60 * 1000);
            // 30 minutes

            return res.headers
                .get("set-cookie")
                .substring(0, res.headers.get("set-cookie").indexOf(";"));
        } else {
            console.log(
                `Login Status: ${res.status}, OK: ${res.ok}, Login Failed`
            );
            return null;
        }
    }

    private async getSyncCount(modificationTimestamp = null) {
        const query = queryString.stringify({
            Count: "2",
            QueryType: "DMQL2",
            SearchType: "Property",
            Class: "ALL",
            // Active, Pending, Active Under Contract, or Coming Soon
            Query: `(ModificationTimestamp=${
                modificationTimestamp
                    ? modificationTimestamp
                    : await this.createRetsDateTimeString()
            }+),(StandardStatus=|10000069142,10000069146,85049738628,200003535148)`,
        });

        const res = await this.client.fetch(
            `http://bright-rets.tst.brightmls.com:6103/cornerstone/search?${query}`,
            {
                credentials: "include",
                headers: {
                    "User-Agent": "Bright RETS Application/1.0",
                    "RETS-Version": "RETS/1.8",
                    Cookie: this.sessionID,
                },
            }
        );

        let count = 0;
        try {
            parseString(await res.text(), async (err, result) => {
                if (result.RETS.COUNT[0].$.Records) {
                    count = parseInt(result.RETS.COUNT[0].$.Records);
                }
            });

            return count;
        } catch (e) {
            return 0;
        }
    }

    private async performInitalSync() {
        const syncCount = await this.getSyncCount(this.initalSyncDate);
        console.log("Sync Count: ", syncCount);
        console.log("Performing initial sync of ", syncCount, " properties");

        for (
            let i = 0;
            i < Math.ceil(syncCount / this.listingsDownloadIncrement);
            i++
        ) {
            const propertiesArr = await this.fetchProperties(
                i * this.listingsDownloadIncrement,
                this.initalSyncDate
            );

            propertiesArr.forEach(async (property) => {
                this.propertyService.updateProperty(
                    {
                        address: {
                            city: property.LocationAddress[0].City[0],
                            country: property.LocationAddress[0].Country[0],
                            full: property.LocationAddress[0]
                                .FullStreetAddress[0], // DO THIS
                            postalCode:
                                property.LocationAddress[0].PostalCode[0],
                            state: property.LocationAddress[0]
                                .StateOrProvince[0],
                            streetName:
                                property.LocationAddress[0].StreetName[0],
                            streetNumber:
                                property.LocationAddress[0]
                                    .StreetNumberNumeric[0],
                            unit: property.LocationAddress[0].UnitNumber[0],
                        },
                        agent: {
                            firstName:
                                property.ListingAgent[0].ListAgentFirstName[0],
                            lastName:
                                property.ListingAgent[0].ListAgentLastName[0],
                            mlsId: property.ListingAgent[0].ListAgentMlsId[0],
                            contact:
                                property.ListingAgent[0].ListAgentEmail[0] ||
                                property.ListingAgent[0]
                                    .ListAgentPreferredPhone[0],
                        },
                        geo: {
                            latitude: property.LocationGIS[0].Latitude[0],
                            longitude: property.LocationGIS[0].Longitude[0],
                        },
                        internetAddressDisplay:
                            property.Marketing[0]
                                .InternetAddressDisplayYN[0] === "Y",
                        internetEntireListingDisplay:
                            property.Marketing[0]
                                .InternetEntireListingDisplayYN[0] === "Y",
                        listDate: property.ListingDates[0].MLSListDate[0],
                        listPrice:
                            property.ListingPricing[0].ListPrice[0].length > 0
                                ? parseFloat(
                                      property.ListingPricing[0].ListPrice[0]
                                  )
                                : 0,
                        listingId: property.Listing[0].ListingId[0],
                        mls: {
                            area: property.LocationArea[0].MLSAreaMajor[0],
                            status: property.Listing[0].StandardStatus[0],
                            daysOnMarket:
                                property.ListingDates[0].DaysOnMarket[0],
                        },
                        modified:
                            property.ListingDates[0].ModificationTimestamp[0],
                        office: {
                            name: property.ListingOffice[0].ListOfficeName[0],
                            mlsid: property.ListingOffice[0].ListOfficeMlsId[0],
                        },
                        totalPhotos: property.ListingMedia[0].TotalPhotos[0],
                        photos: [
                            property.ListingMedia[0].ListPictureURL[0],
                            property.ListingMedia[0].ListPicture2URL[0],
                            property.ListingMedia[0].ListPicture2URL[0],
                        ], //DO
                        property: {
                            accessibility:
                                property.ListingStructure[0]
                                    .AccessibilityFeatures[0],
                            acres: property.Property[0].LotSizeAcres[0],
                            area: property.ListingStructure[0]
                                .AboveGradeFinishedArea[0],
                            bathsFull:
                                property.ListingStructure[0].BathroomsFull[0]
                                    .length > 0
                                    ? parseInt(
                                          property.ListingStructure[0]
                                              .BathroomsFull[0]
                                      )
                                    : 0,
                            bathsHalf:
                                property.ListingStructure[0].BathroomsHalf[0]
                                    .length > 0
                                    ? parseInt(
                                          property.ListingStructure[0]
                                              .BathroomsHalf[0]
                                      )
                                    : 0,
                            bedrooms:
                                property.ListingStructure[0].BedroomsTotal[0]
                                    .length > 0
                                    ? parseInt(
                                          property.ListingStructure[0]
                                              .BedroomsTotal[0]
                                      )
                                    : 0,
                            construction:
                                property.ListingStructure[0]
                                    .ConstructionMaterials[0],
                            cooling: property.ListingStructure[0].Cooling[0],
                            exteriorFeatures:
                                property.ListingStructure[0]
                                    .ExteriorFeatures[0],
                            fireplaces:
                                property.ListingStructure[0].FireplacesTotal[0],
                            flooring: property.ListingStructure[0].Flooring[0],
                            foundation:
                                property.ListingStructure[0]
                                    .FoundationDetails[0],
                            garageSpaces:
                                property.ListingStructure[0].GarageSpaces[0],
                            heating: property.ListingStructure[0].Heating[0],
                            interiorFeatures:
                                property.ListingStructure[0]
                                    .InteriorFeatures[0],
                            laundryFeatures:
                                property.Property[0].LaundryType[0],
                            lotDescription: property.Property[0].LotFeatures[0],
                            lotSize: property.Property[0].LotSizeAcres[0],
                            lotSizeArea:
                                property.Property[0].LotSizeSquareFeet[0],
                            lotSizeAreaUnits:
                                property.Property[0].LotSizeUnits[0],
                            parking: {
                                description:
                                    property.ListingStructure[0]
                                        .ParkingFeatures[0],
                                leased: false, //DO THIS
                                spaces: property.ListingStructure[0]
                                    .NumParkingSpaces[0], //NUMBER
                            },
                            pool: property.Property[0].Pool[0],
                            roof: property.ListingStructure[0].Roof[0],
                            stories: property.ListingStructure[0].Stories[0], //NUMBER
                            style: property.ListingStructure[0]
                                .ArchitecturalStyle[0],
                            subType: property.Property[0].PropertySubType[0],
                            subdivision:
                                property.LocationArea[0].SubdivisionName[0],
                            type: property.Property[0].PropertyType[0],
                            view: property.Property[0].View[0],
                            water: property.Property[0].WaterAccessFeatures[0],
                            yearBuilt:
                                property.ListingStructure[0].YearBuilt[0], //NUMBER
                        },
                        remarks: property.Remarks[0].PublicRemarks[0],
                        school: {
                            district:
                                property.LocationSchool[0]
                                    .SchoolDistrictName[0],
                            elementarySchool:
                                property.LocationSchool[0].ElementarySchool[0],
                            highSchool:
                                property.LocationSchool[0].HighSchool[0],
                            middleSchool:
                                property.LocationSchool[0]
                                    .MiddleOrJuniorSchool[0],
                        },
                        tax: {
                            id: property.PropertyTax[0].ListingTaxID[0],
                            taxAnnualAmount:
                                property.PropertyTax[0].TaxAnnualAmount[0],
                            taxYear: property.PropertyTax[0].TaxYear[0],
                        },
                        terms: property.ListingContract[0].CloseSaleTerms[0],
                        virtualTourUrl:
                            property.Marketing[0].VirtualTourURLUnbranded[0],
                    },
                    () => {
                        console.log(
                            "Saved property ",
                            property.LocationAddress[0].FullStreetAddress[0]
                        );
                    }
                );
            });
        }
    }

    private async performIncementalSync() {
        const syncCount = await this.getSyncCount(
            await this.configService.getLastUpdate()
        );
        console.log("Sync Count: ", syncCount);

        if (syncCount === 0) {
            console.log("No properties modified since last sync");
        } else {
            console.log(
                "Performing incremental sync of ",
                syncCount,
                " properties"
            );

            for (
                let i = 0;
                i < Math.ceil(syncCount / this.listingsDownloadIncrement);
                i++
            ) {
                const propertiesArr = await this.fetchProperties(
                    i * this.listingsDownloadIncrement,
                    await this.configService.getLastUpdate()
                );

                propertiesArr.forEach(async (property) => {
                    this.propertyService.updateProperty(
                        {
                            address: {
                                city: property.LocationAddress[0].City[0],
                                country: property.LocationAddress[0].Country[0],
                                full: property.LocationAddress[0]
                                    .FullStreetAddress[0], // DO THIS
                                postalCode:
                                    property.LocationAddress[0].PostalCode[0],
                                state: property.LocationAddress[0]
                                    .StateOrProvince[0],
                                streetName:
                                    property.LocationAddress[0].StreetName[0],
                                streetNumber:
                                    property.LocationAddress[0]
                                        .StreetNumberNumeric[0],
                                unit: property.LocationAddress[0].UnitNumber[0],
                            },
                            agent: {
                                firstName:
                                    property.ListingAgent[0]
                                        .ListAgentFirstName[0],
                                lastName:
                                    property.ListingAgent[0]
                                        .ListAgentLastName[0],
                                mlsId: property.ListingAgent[0]
                                    .ListAgentMlsId[0],
                                contact:
                                    property.ListingAgent[0]
                                        .ListAgentEmail[0] ||
                                    property.ListingAgent[0]
                                        .ListAgentPreferredPhone[0],
                            },
                            geo: {
                                latitude: property.LocationGIS[0].Latitude[0],
                                longitude: property.LocationGIS[0].Longitude[0],
                            },
                            internetAddressDisplay:
                                property.Marketing[0]
                                    .InternetAddressDisplayYN[0] === "Y",
                            internetEntireListingDisplay:
                                property.Marketing[0]
                                    .InternetEntireListingDisplayYN[0] === "Y",
                            listDate: property.ListingDates[0].MLSListDate[0],
                            listPrice:
                                property.ListingPricing[0].ListPrice[0].length >
                                0
                                    ? parseFloat(
                                          property.ListingPricing[0]
                                              .ListPrice[0]
                                      )
                                    : 0,
                            listingId: property.Listing[0].ListingId[0],
                            mls: {
                                area: property.LocationArea[0].MLSAreaMajor[0],
                                status: property.Listing[0].StandardStatus[0],
                                daysOnMarket:
                                    property.ListingDates[0].DaysOnMarket[0],
                            },
                            modified:
                                property.ListingDates[0]
                                    .ModificationTimestamp[0],
                            office: {
                                name: property.ListingOffice[0]
                                    .ListOfficeName[0],
                                mlsid: property.ListingOffice[0]
                                    .ListOfficeMlsId[0],
                            },
                            totalPhotos:
                                property.ListingMedia[0].TotalPhotos[0],
                            photos: [
                                property.ListingMedia[0].ListPictureURL[0],
                                property.ListingMedia[0].ListPicture2URL[0],
                                property.ListingMedia[0].ListPicture2URL[0],
                            ], //DO
                            property: {
                                accessibility:
                                    property.ListingStructure[0]
                                        .AccessibilityFeatures[0],
                                acres: property.Property[0].LotSizeAcres[0],
                                area: property.ListingStructure[0]
                                    .AboveGradeFinishedArea[0],
                                bathsFull:
                                    property.ListingStructure[0]
                                        .BathroomsFull[0].length > 0
                                        ? parseInt(
                                              property.ListingStructure[0]
                                                  .BathroomsFull[0]
                                          )
                                        : 0,
                                bathsHalf:
                                    property.ListingStructure[0]
                                        .BathroomsHalf[0].length > 0
                                        ? parseInt(
                                              property.ListingStructure[0]
                                                  .BathroomsHalf[0]
                                          )
                                        : 0,
                                bedrooms:
                                    property.ListingStructure[0]
                                        .BedroomsTotal[0].length > 0
                                        ? parseInt(
                                              property.ListingStructure[0]
                                                  .BedroomsTotal[0]
                                          )
                                        : 0,
                                construction:
                                    property.ListingStructure[0]
                                        .ConstructionMaterials[0],
                                cooling:
                                    property.ListingStructure[0].Cooling[0],
                                exteriorFeatures:
                                    property.ListingStructure[0]
                                        .ExteriorFeatures[0],
                                fireplaces:
                                    property.ListingStructure[0]
                                        .FireplacesTotal[0],
                                flooring:
                                    property.ListingStructure[0].Flooring[0],
                                foundation:
                                    property.ListingStructure[0]
                                        .FoundationDetails[0],
                                garageSpaces:
                                    property.ListingStructure[0]
                                        .GarageSpaces[0],
                                heating:
                                    property.ListingStructure[0].Heating[0],
                                interiorFeatures:
                                    property.ListingStructure[0]
                                        .InteriorFeatures[0],
                                laundryFeatures:
                                    property.Property[0].LaundryType[0],
                                lotDescription:
                                    property.Property[0].LotFeatures[0],
                                lotSize: property.Property[0].LotSizeAcres[0],
                                lotSizeArea:
                                    property.Property[0].LotSizeSquareFeet[0],
                                lotSizeAreaUnits:
                                    property.Property[0].LotSizeUnits[0],
                                parking: {
                                    description:
                                        property.ListingStructure[0]
                                            .ParkingFeatures[0],
                                    leased: false, //DO THIS
                                    spaces: property.ListingStructure[0]
                                        .NumParkingSpaces[0], //NUMBER
                                },
                                pool: property.Property[0].Pool[0],
                                roof: property.ListingStructure[0].Roof[0],
                                stories:
                                    property.ListingStructure[0].Stories[0], //NUMBER
                                style: property.ListingStructure[0]
                                    .ArchitecturalStyle[0],
                                subType:
                                    property.Property[0].PropertySubType[0],
                                subdivision:
                                    property.LocationArea[0].SubdivisionName[0],
                                type: property.Property[0].PropertyType[0],
                                view: property.Property[0].View[0],
                                water: property.Property[0]
                                    .WaterAccessFeatures[0],
                                yearBuilt:
                                    property.ListingStructure[0].YearBuilt[0], //NUMBER
                            },
                            remarks: property.Remarks[0].PublicRemarks[0],
                            school: {
                                district:
                                    property.LocationSchool[0]
                                        .SchoolDistrictName[0],
                                elementarySchool:
                                    property.LocationSchool[0]
                                        .ElementarySchool[0],
                                highSchool:
                                    property.LocationSchool[0].HighSchool[0],
                                middleSchool:
                                    property.LocationSchool[0]
                                        .MiddleOrJuniorSchool[0],
                            },
                            tax: {
                                id: property.PropertyTax[0].ListingTaxID[0],
                                taxAnnualAmount:
                                    property.PropertyTax[0].TaxAnnualAmount[0],
                                taxYear: property.PropertyTax[0].TaxYear[0],
                            },
                            terms: property.ListingContract[0]
                                .CloseSaleTerms[0],
                            virtualTourUrl:
                                property.Marketing[0]
                                    .VirtualTourURLUnbranded[0],
                        },
                        () => {
                            console.log(
                                "Saved property ",
                                property.LocationAddress[0].FullStreetAddress[0]
                            );
                        }
                    );
                });
            }
        }
    }

    private async fetchProperties(offset, modificationTimestamp) {
        console.log("OFFSET: ", offset);
        const query = queryString.stringify({
            Offset: offset + 1,
            Limit: this.listingsDownloadIncrement,
            Count: "0",
            QueryType: "DMQL2",
            SearchType: "Property",
            Class: "ALL",
            Query: `(ModificationTimestamp=${modificationTimestamp}+),(StandardStatus=|10000069142,10000069146,85049738628,200003535148)`,
        });

        const res = await this.client.fetch(
            `http://bright-rets.tst.brightmls.com:6103/cornerstone/search?${query}`,
            {
                credentials: "include",
                headers: {
                    "User-Agent": "Bright RETS Application/1.0",
                    "RETS-Version": "RETS/1.8",
                    Cookie: this.sessionID,
                },
            }
        );

        let ret = null;

        parseString(await res.text(), async (err, result) => {
            console.log(result.RETS.REData[0].BrightAll[0].AllProperty.length);

            ret = result.RETS.REData[0].BrightAll[0].AllProperty;
        });

        return ret;
    }

    private async createRetsDateTimeString(date?: string) {
        const now = new Date(date ? date : Date.now());
        let ret = "";
        ret += `${now.getFullYear()}-${(now.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${now
            .getDate()
            .toString()
            .padStart(2, "0")}T${now
            .getHours()
            .toString()
            .padStart(2, "0")
            .toString()
            .padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        return ret;

        //2018-01-01T00:00:00+
    }
}

export default new App().app;
