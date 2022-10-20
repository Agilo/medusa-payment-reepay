class ReepaySubscriber {
  constructor({
    reepayService,
    cartService,
    orderService,
    eventBusService,
    idempotencyKeyService,
    cartCompletionStrategy,
  }) {
    this.reepayService_ = reepayService

    this.cartService_ = cartService

    this.orderService_ = orderService

    this.eventBus_ = eventBusService

    this.cartCompletionStrategy_ = cartCompletionStrategy

    this.idempotencyKeyService_ = idempotencyKeyService

    this.eventBus_.subscribe("reepay.event_received", async (event) =>
      this.handleReepayEvent(event)
    )
  }

  async handleReepayEvent(event) {
    switch (true) {
      case event.event_type === "invoice_authorized": {
        this.handleAuthorization_(event)
        break
      }
      default:
        break
    }
  }

  async handleAuthorization_(event) {
    const cartId = event.invoice
    // We need to ensure, that an order is created in situations, where the
    // customer might have closed their browser prior to order creation
    try {
      await this.orderService_.retrieveByCartId(cartId)
    } catch (error) {
      let idempotencyKey

      try {
        idempotencyKey = await this.idempotencyKeyService_.initializeRequest(
          event.event_id,
          "EVENT",
          {id: cartId},
          "reepay.event_received"
        )
      } catch (error) {
        console.log(error)
        return
      }

      await this.cartService_.setPaymentSession(cartId, "reepay")

      await this.cartCompletionStrategy_.complete(cartId, idempotencyKey)
    }
  }
}

export default ReepaySubscriber
