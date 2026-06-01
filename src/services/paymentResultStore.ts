type PaymentResult = { paymentId: string };

let _result: PaymentResult | null = null;

export const setPaymentResult = (r: PaymentResult) => { _result = r; };
export const consumePaymentResult = (): PaymentResult | null => {
  const r = _result;
  _result = null;
  return r;
};
