const DynamoModel = require('./DynamoModel');
const bcrypt = require('bcryptjs');

class UserModel extends DynamoModel {
    constructor() {
        super('USERS_TABLE', 'icecream-erp-backend-users-dev');
    }

    async create(userData) {
        if (userData.password && !userData.password.startsWith('$2a$') && !userData.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
        }
        return super.create(userData);
    }

    async findByIdAndUpdate(id, updates, options) {
        if (updates.password && !updates.password.startsWith('$2a$') && !updates.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }
        return super.findByIdAndUpdate(id, updates, options);
    }

    async matchPassword(enteredPassword, hashedPassword) {
        return await bcrypt.compare(enteredPassword, hashedPassword);
    }
}

module.exports = new UserModel();
