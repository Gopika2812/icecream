const DynamoModel = require('./DynamoModel');

class VendorModel extends DynamoModel {
    constructor() {
        super('VENDORS_TABLE', 'icecream-erp-backend-vendors-dev');
    }
}

module.exports = new VendorModel();
