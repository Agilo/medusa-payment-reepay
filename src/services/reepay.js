import axios from "axios"
import _ from "lodash"
import { v4 as uuidv4 } from "uuid"
import { PaymentService } from "medusa-interfaces"
import { MedusaError } from "medusa-core-utils"

class ReepayProviderService extends PaymentService {
  static identifier = "reepay"

  /**
   * Options for Reepay
   * {
   *    api_key: API_KEY, required
   *    webhook_secret: WEBHOOK_SECRET,
   *    accept_url: "www.some-webshop.com/checkout/payment",
   *    cancel_url: "www.some-webshop.com/checkout"
   * }
   */

  constructor(
    { regionService, customerService, cartService, totalsService },
    options
  ) {
    super()

    this.regionService_ = regionService

    this.customerService_ = customerService

    this.cartService_ = cartService

    this.totalsService_ = totalsService

    this.options_ = options

    this.reepayCheckoutApi = this.initReepayCheckout()

    this.reepayApi = this.initReepayApi()
  }

  getOptions() {
    return this.options_
  }

  initReepayCheckout() {
    const token = Buffer.from(this.options_.api_key).toString("base64")
    return axios.create({
      baseURL: "https://checkout-api.reepay.com/v1/session",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${token}`,
      },
    })
  }

  initReepayApi() {
    const token = Buffer.from(this.options_.api_key).toString("base64")
    return axios.create({
      baseURL: "https://api.reepay.com/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${token}`,
      },
    })
  }

  async createSession(cart) {
    const total = await this.totalsService_.getTotal(cart)
    const region = await this.regionService_.retrieve(cart.region_id)

    const request = {
      settle: false,
      order: {
        handle: cart.id,
        amount: total,
        currency: region.currency_code.toUpperCase(),
        customer: {
          email: cart.email,
        },
      },
      payment_methods: this.options_.payment_methods,
      accept_url: this.options_.accept_url,
      cancel_url: this.options_.cancel_url,
    }

    try {
      return await this.reepayCheckoutApi.post("/charge", request)
    } catch (error) {
      if (error.response) {
        console.log(JSON.stringify(error.response.data))
      }

      throw error
    }
  }

  /**
   * Status for Reepay payment
   * @param {Object} paymentMethod - payment method data from cart
   * @returns {string} the status of the payment
   */
  async getStatus(paymentMethod) {
    const { invoice, handle } = paymentMethod
    const { data } = await this.reepayApi.get(`/invoice/${invoice || handle}`)

    let status = "initial"

    if (data?.state === "created") {
      status = "pending"
    }

    if (data?.state === "authorized") {
      status = "authorized"
    }

    if (data?.state === "settled") {
      status = "captured"
    }

    if (data?.state === "failed") {
      status = "canceled"
    }

    return status
  }

  /**
   * Creates Reepay payment object
   * @returns {Object} empty payment data
   */
  async createPayment(cart) {
    if (cart.email) {
      const res = await this.createSession(cart)
  
      return {
        id: res.data.id,
        action: {
          url: res.data.url,
        },
        invoice: cart.id,
      }
    }

    return {}
  }

  async retrievePayment(paymentMethod) {
    const { invoice, handle } = paymentMethod

    try {
      const { data } = await this.reepayApi.get(`/charge/${invoice || handle}`)
      return data
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Captures an Reepay payment
   * @param {Object} data - payment data to capture
   * @returns {Object} payment data result of capture
   */
  async capturePayment(paymentMethod) {
    const { handle } = paymentMethod.data

    try {
      const captured = await this.reepayApi.post(`/charge/${handle}/settle`)

      if (captured.data.state !== "settled") {
        throw new MedusaError(
          MedusaError.Types.INVALID_ARGUMENT,
          "Could not process capture"
        )
      }

      return this.retrievePayment(paymentMethod.data)
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Refunds an Reepay payment
   * @param {Object} paymentData - payment data to refund
   * @param {number} amountToRefund - amount to refund
   * @returns {Object} payment data result of refund
   */
  async refundPayment(paymentMethod, amountToRefund) {
    const { handle } = paymentMethod.data

    try {
      const refunded = await this.reepayApi.post("/refund", {
        invoice: handle,
        key: uuidv4(),
        amount: amountToRefund,
      })

      if (refunded.data.state !== "refunded") {
        throw new MedusaError(
          MedusaError.Types.INVALID_ARGUMENT,
          "Could not process capture"
        )
      }

      return this.retrievePayment(paymentMethod.data)
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Cancels an Reepay payment
   * @param {Object} paymentData - payment data to cancel
   * @returns {Object} payment data result of cancel
   */
  async cancelPayment(paymentData) {
    const { handle } = paymentData.data

    try {
      const { data } = await this.reepayApi.post(`/charge/${handle}/cancel`)
      return data
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  async deletePayment(paymentData) {
    const { handle } = paymentData.data

    try {
      return this.reepayApi.delete(`/charge/${handle}`)
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Authorize payment
   * @param {object} session - payment session
   * @param {object} context - properties relevant to current context
   * @returns {Promise<{ status: string, data: object }>} result with data and status
   */
  async authorizePayment(session, context = {}) {
    const stat = await this.getStatus(session.data)

    try {
      return { data: session.data, status: stat }
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Not supported
   */
  async retrieveSavedMethods(customer) {
    return Promise.resolve([])
  }

  /**
   * Gets the payment data from a payment session
   * @param {object} session - the session to fetch payment data for.
   * @returns {Promise<object>} the Reepay order object
   */
  async getPaymentData(session) {
    try {
      return this.retrievePayment(session.data)
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Updates the data stored with the payment session.
   * @param {object} data - the currently stored data.
   * @param {object} update - the update data to store.
   * @returns {object} the merged data of the two arguments.
   */
  async updatePaymentData(data, update) {
    try {
      return {
        ...data,
        ...update.data,
      }
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }

  /**
   * Updates Reepay payment intent.
   * @param {object} sessionData - payment session data.
   * @param {object} update - objec to update intent with
   * @returns {object} Reepay payment intent
   */
  async updatePayment(sessionData, cart) {
    try {
      return this.createPayment(cart)
    } catch (error) {
      console.log(JSON.stringify(error))
      throw error
    }
  }
}

export default ReepayProviderService
