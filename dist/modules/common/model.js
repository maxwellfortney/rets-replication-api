// export interface ModificationNote {
//     modified_on: Date;
//     modified_by: String;
//     modification_note: String;
// }
// export const ModificationNote = {
//     modified_on: Date,
//     modified_by: String,
//     modification_note: String,
// };
export var response_status_codes;
(function (response_status_codes) {
    response_status_codes[response_status_codes["success"] = 200] = "success";
    response_status_codes[response_status_codes["bad_request"] = 400] = "bad_request";
    response_status_codes[response_status_codes["internal_server_error"] = 500] = "internal_server_error";
})(response_status_codes || (response_status_codes = {}));
//# sourceMappingURL=model.js.map