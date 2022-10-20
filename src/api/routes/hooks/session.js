import { Validator, MedusaError } from 'medusa-core-utils'

export default async (req, res) => {
  const schema = Validator.object().keys({
    cart_id: Validator.string().required(),
  })

  const { value, error } = schema.validate(req.body)
  if (error) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.details)
  }

  try {
    const cartService = req.scope.resolve('cartService')
    const paymentProvider = req.scope.resolve(`reepayService`)

    const cart = await cartService.retrieve(value.cart_id)

    const { data } = await paymentProvider.createSession(cart)

    res.status(200).json({ data })
  } catch (err) {
    console.log(err)
    throw err
  }
}
