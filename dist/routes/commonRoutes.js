export class CommonRoutes {
    route(app) {
        // Mismatch URL
        app.all("*", function (req, res) {
            res.status(404).send({
                error: true,
                message: "Check your URL please",
            });
        });
    }
}
//# sourceMappingURL=commonRoutes.js.map