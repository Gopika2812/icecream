const DynamoModel = require('./DynamoModel');

class InventoryTransactionModel extends DynamoModel {
    constructor() {
        super('INVENTORY_TRANSACTIONS_TABLE', 'icecream-erp-backend-inventory-transactions-dev');
    }
}

module.exports = new InventoryTransactionModel();
