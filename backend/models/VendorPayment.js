const DynamoModel = require('./DynamoModel');

class VendorPaymentModel extends DynamoModel {
    constructor() {
        super('VENDOR_PAYMENTS_TABLE', 'icecream-erp-backend-vendor-payments-dev');
    }
}

module.exports = new VendorPaymentModel();
