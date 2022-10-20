import { Router } from "express"
import bodyParser from "body-parser"
import middlewares from "../../middlewares"

const route = Router()

export default (app) => {
  app.use("/hooks", route)

  route.use(bodyParser.json())

  route.post(
    "/reepay/authorize",
    middlewares.wrap(require("./authorize").default)
  )

  route.post(
    "/reepay/session",
    middlewares.wrap(require("./session").default)
  )

  route.post(
    "/reepay/event",
    middlewares.wrap(require("./event").default)
  )

  return app
}