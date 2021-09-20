"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const apiRoutes_1 = require("./api/apiRoutes");
class App {
    constructor() {
        this.apiRoutes = new apiRoutes_1.APIRoutes();
        this.app = (0, express_1.default)();
        this.config();
        this.apiRoutes.route(this.app);
    }
    config() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded());
    }
}
exports.default = new App().app;
