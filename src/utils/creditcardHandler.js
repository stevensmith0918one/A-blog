import logger from "../config/logger";

const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
// var SDKConstants = require("authorizenet").Constants;
const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
// merchantAuthenticationType.setName("9Ts6zD3N");
// merchantAuthenticationType.setTransactionKey("5n99zhV5bcX55M9K");
merchantAuthenticationType.setName("2K5Ln6j2QYh");
merchantAuthenticationType.setTransactionKey("67yz27qeKKR897sa");
// https://developer.authorize.net/api/reference/#accept-suite-get-an-accept-payment-page

async function createSubscription(
  { ccnum, exp, cvc, phone, email, fname, lname },
  callback
) {
  const interval = new ApiContracts.PaymentScheduleType.Interval();
  interval.setLength(1);
  interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

  const paymentScheduleType = new ApiContracts.PaymentScheduleType();
  paymentScheduleType.setInterval(interval);
  paymentScheduleType.setStartDate(new Date().toISOString().substring(0, 10));
  paymentScheduleType.setTotalOccurrences(9999);
  paymentScheduleType.setTrialOccurrences(0);

  const creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber(ccnum.replace(/\s/g, ""));
  creditCard.setExpirationDate(exp);
  creditCard.setCardCode(cvc);

  const payment = new ApiContracts.PaymentType();
  payment.setCreditCard(creditCard);

  const orderType = new ApiContracts.OrderType();
  orderType.setDescription("Black Membership Monthly Fee");

  const customer = new ApiContracts.CustomerType();
  customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
  customer.setEmail(email);
  customer.setPhoneNumber(phone);

  const nameAndAddressType = new ApiContracts.NameAndAddressType();
  nameAndAddressType.setFirstName(fname);
  nameAndAddressType.setLastName(lname);

  const arbSubscription = new ApiContracts.ARBSubscriptionType();
  arbSubscription.setName("Black Membership");
  arbSubscription.setPaymentSchedule(paymentScheduleType);
  arbSubscription.setAmount(10);
  arbSubscription.setTrialAmount(0);
  arbSubscription.setPayment(payment);
  arbSubscription.setBillTo(nameAndAddressType);
  arbSubscription.setOrder(orderType);
  arbSubscription.setCustomer(customer);

  const createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setSubscription(arbSubscription);

  // console.log(JSON.stringify(createRequest.getJSON(), null, 2));

  const ctrl = new ApiControllers.ARBCreateSubscriptionController(
    createRequest.getJSON()
  );

  const response = await new Promise((res, rej) => {
    ctrl.execute(function f() {
      const apiResponse = ctrl.getResponse();

      const response2 = new ApiContracts.ARBCreateSubscriptionResponse(
        apiResponse
      );

      if (response2 != null) {
        if (
          response2.getMessages().getResultCode() !==
          ApiContracts.MessageTypeEnum.OK
        ) {
          logger.error(response2.getMessages().getMessage()[0].getText());
          rej(
            new Error(`
              Client: Error processing your credit card. Please check and try again. 
              If you continue to have problems, please contact us at support@foxtailapp.com`)
          );
        }
      } else {
        logger.error("Null response in create subscription");
        rej(
          new Error(`
            Client: Error processing your credit card. Please check and try again. 
            If you continue to have problems, please contact us at support@foxtailapp.com`)
        );
      }

      res(response2);
    });
  });
  callback(response);
}

async function updateCustomerPaymentProfile(
  { subscriptionId, ccnum, exp, cvc, phone, email, fname, lname },
  callback
) {
  const creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber(ccnum.replace(/\s/g, ""));
  creditCard.setExpirationDate(exp);
  creditCard.setCardCode(cvc);

  const payment = new ApiContracts.PaymentType();
  payment.setCreditCard(creditCard);

  const customer = new ApiContracts.CustomerType();
  customer.setEmail(email);
  customer.setPhoneNumber(phone);

  const nameAndAddressType = new ApiContracts.NameAndAddressType();
  nameAndAddressType.setFirstName(fname);
  nameAndAddressType.setLastName(lname);

  const arbSubscription = new ApiContracts.ARBSubscriptionType();
  arbSubscription.setPayment(payment);
  arbSubscription.setBillTo(nameAndAddressType);
  arbSubscription.setCustomer(customer);

  const updateRequest = new ApiContracts.ARBUpdateSubscriptionRequest();
  updateRequest.setMerchantAuthentication(merchantAuthenticationType);
  updateRequest.setSubscriptionId(subscriptionId);
  updateRequest.setSubscription(arbSubscription);

  const ctrl = new ApiControllers.ARBUpdateSubscriptionController(
    updateRequest.getJSON()
  );

  await new Promise((res, rej) => {
    ctrl.execute(function f() {
      const apiResponse = ctrl.getResponse();

      const response = new ApiContracts.ARBUpdateSubscriptionResponse(
        apiResponse
      );

      if (response != null) {
        if (
          response.getMessages().getResultCode() !==
          ApiContracts.MessageTypeEnum.OK
        ) {
          logger.error(response.getMessages().getMessage()[0].getText());
          rej(
            new Error(`
              Client: Error processing your credit card. Please check and try again. 
              If you continue to have problems, please contact us at support@foxtailapp.com`)
          );
        }
      } else {
        logger.error("Null response in update subscription");
        rej(
          new Error(`
            Client: Error processing your credit card. Please check and try again. 
            If you continue to have problems, please contact us at support@foxtailapp.com`)
        );
      }

      res();
    });
  });

  callback();
}

async function cancelSubscription(subscriptionId, callback) {
  const cancelRequest = new ApiContracts.ARBCancelSubscriptionRequest();
  cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
  cancelRequest.setSubscriptionId(subscriptionId);

  const ctrl = new ApiControllers.ARBCancelSubscriptionController(
    cancelRequest.getJSON()
  );

  await new Promise((res, rej) => {
    ctrl.execute(function f() {
      const apiResponse = ctrl.getResponse();

      const response = new ApiContracts.ARBCancelSubscriptionResponse(
        apiResponse
      );

      if (response != null) {
        if (
          response.getMessages().getResultCode() !==
          ApiContracts.MessageTypeEnum.OK
        ) {
          logger.error(response.getMessages().getMessage()[0].getText());
          rej(
            new Error(`
              Client: Error processing your credit card. Please check and try again. 
              If you continue to have problems, please contact us at support@foxtailapp.com`)
          );
        }
      } else {
        logger.error("Null response in cancel subscription");
        rej(
          new Error(`
            Client: Error processing your credit card. Please check and try again. 
            If you continue to have problems, please contact us at support@foxtailapp.com`)
        );
      }

      res();
    });
  });
  callback();
}

module.exports = {
  createSubscription,
  updateCustomerPaymentProfile,
  cancelSubscription,
};
