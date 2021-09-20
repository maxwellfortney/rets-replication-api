import { Application, Request, Response } from "express";

export class CommonRoutes {
    public route(app: Application) {
        // Mismatch URL
        app.all("*", function (req: Request, res: Response) {
            res.status(404).send(
                JSON.stringify(
                    {
                        error: true,
                        message: "Check your URL please",
                    },
                    null,
                    2
                )
            );
        });
    }
}
