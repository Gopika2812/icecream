const DynamoModel = require('./DynamoModel');

class RoleModel extends DynamoModel {
    constructor() {
        super('ROLES_TABLE', 'icecream-erp-backend-roles-dev');
    }
}

module.exports = new RoleModel();
