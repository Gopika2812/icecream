const DynamoModel = require('./DynamoModel');

class AutoSalesEntryModel extends DynamoModel {
    constructor() {
        super('AUTO_SALES_ENTRIES_TABLE', 'icecream-erp-backend-auto-sales-entries-dev');
    }
}

module.exports = new AutoSalesEntryModel();
