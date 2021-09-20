export function successResponse(message, DATA, res) {
    res.status(200).json({
        STATUS: "SUCCESS",
        MESSAGE: message,
        DATA,
    });
}
export function failureResponse(message, DATA, res) {
    res.status(200).json({
        STATUS: "FAILURE",
        MESSAGE: message,
        DATA,
    });
}
export function insufficientParameters(res) {
    res.status(400).json({
        STATUS: "FAILURE",
        MESSAGE: "Insufficient parameters",
        DATA: {},
    });
}
export function mongoError(err, res) {
    res.status(500).json({
        STATUS: "FAILURE",
        MESSAGE: "MongoDB error",
        DATA: err,
    });
}
//# sourceMappingURL=service.js.map