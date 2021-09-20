import { Response } from "express";

export function successResponse(message: string, DATA: any, res: Response) {
    res.status(200).json({
        STATUS: "SUCCESS",
        MESSAGE: message,
        DATA,
    });
}

export function failureResponse(message: string, DATA: any, res: Response) {
    res.status(200).json({
        STATUS: "FAILURE",
        MESSAGE: message,
        DATA,
    });
}

export function insufficientParameters(res: Response) {
    res.status(400).json({
        STATUS: "FAILURE",
        MESSAGE: "Insufficient parameters",
        DATA: {},
    });
}

export function mongoError(err: any, res: Response) {
    res.status(500).json({
        STATUS: "FAILURE",
        MESSAGE: "MongoDB error",
        DATA: err,
    });
}
