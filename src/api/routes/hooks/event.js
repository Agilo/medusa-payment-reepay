import crypto from "crypto"

export default async (req, res) => {
  const reepayService = req.scope.resolve('reepayService')
  const event = req.body

  const { webhook_secret } = reepayService.getOptions()

  const signature = crypto
    .createHmac('sha256', webhook_secret)
    .update(event.timestamp + event.id)
    .digest('hex')

  if (signature !== event.signature) {
    res.status(401).send('Unauthorized webhook event')
    return
  }

  const eventBus = req.scope.resolve('eventBusService')
  eventBus.emit('reepay.event_received', event)

  res.sendStatus(200)
}
