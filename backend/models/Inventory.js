const DynamoModel = require('./DynamoModel');

class InventoryModel extends DynamoModel {
    constructor() {
        super('INVENTORY_TABLE', 'icecream-erp-backend-inventory-dev');
    }
}

module.exports = new InventoryModel();
